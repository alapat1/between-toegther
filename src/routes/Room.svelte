<script>
  import { onMount, onDestroy } from 'svelte';
  import Lobby from '../lib/Lobby.svelte';
  import WYR from '../games/wyr/WYR.svelte';
  import TOD from '../games/tod/TOD.svelte';
  import Spin from '../games/spin/Spin.svelte';
  import FingerSmash from '../games/fingersmash/FingerSmash.svelte';
  import ScreeningRoom from '../lib/ScreeningRoom.svelte';
  import { sb } from '../engine/supabase.js';
  import { loadRoom, partnerOf, renameRoom, subscribeToRoomMembers } from '../engine/room.js';
  import { reconcileActiveGame, startGame, subscribeToGame } from '../engine/session.js';
  import { sendInvite, respondInvite, fetchActiveInvite, subscribeToInvites } from '../engine/invites.js';
  import { fetchWyrPrompts } from '../engine/promptsRepo.js';
  import * as todEngine from '../games/tod/engine.js';
  import * as spinEngine from '../games/spin/engine.js';
  import * as fsEngine from '../games/fingersmash/engine.js';

  export let code;
  export let userId;

  let room = null;
  let game = null;
  let invite = null; // pending game_invites row for this room, or null
  let screeningOpen = false; // Screening Room isn't a game_session — no rounds/version guard
  let moves = []; // only used for WYR (wyr_moves table)
  let loading = true;
  let renaming = false;
  let nameDraft = '';
  let unsubGame = null;
  let unsubMembers = null;
  let unsubInvites = null;
  let movesChannel = null;

  $: partner = room ? partnerOf(room.members, userId) : null;
  $: iAmInviter = invite && invite.invited_by === userId;

  async function refresh() {
    const res = await loadRoom(code);
    if (!res.ok) { loading = false; return; }
    room = res.room;
    game = await reconcileActiveGame(room.id);
    invite = game ? null : await fetchActiveInvite(room.id);
    if (game && game.game_type === 'wyr') await loadMoves();
    loading = false;
    rewireGameSubscription();
    rewireMembersSubscription();
    rewireInvitesSubscription();
  }

  // Refetches just room+members — cheap enough to call on every
  // room_members change (join/leave) rather than diffing manually.
  async function reloadMembers() {
    const res = await loadRoom(code);
    if (res.ok) room = res.room;
  }

  async function reloadInvite() {
    if (!room) return;
    invite = game ? null : await fetchActiveInvite(room.id);
  }

  function rewireMembersSubscription() {
    if (unsubMembers) unsubMembers();
    unsubMembers = subscribeToRoomMembers(room.id, reloadMembers);
  }

  function rewireInvitesSubscription() {
    if (unsubInvites) unsubInvites();
    unsubInvites = subscribeToInvites(room.id, reloadInvite);
  }

  async function loadMoves() {
    if (!game) { moves = []; return; }
    const { data } = await sb.from('wyr_moves').select('*').eq('game_id', game.id);
    moves = data || [];
  }

  function rewireGameSubscription() {
    if (unsubGame) unsubGame();
    if (movesChannel) sb.removeChannel(movesChannel);
    if (!game) return;

    unsubGame = subscribeToGame(game.id, async () => {
      game = await reconcileActiveGame(room.id);
    });

    if (game.game_type === 'wyr') {
      movesChannel = sb
        .channel(`wyr_moves:${game.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wyr_moves', filter: `game_id=eq.${game.id}` }, loadMoves)
        .subscribe();
    }
  }

  // Building the actual initialState per game type needs the same
  // per-game setup the old direct-start flow had (fetching WYR prompts,
  // wiring TOD's theme/rounds, etc). Kept here rather than in invites.js so
  // the invite engine stays game-agnostic — it only carries type/rounds/config.
  async function buildInitialState(gameType, rounds, config) {
    if (gameType === 'wyr') {
      const prompts = await fetchWyrPrompts(rounds);
      return { prompts, pips: [], totalRounds: rounds };
    }
    if (gameType === 'tod') return todEngine.initialState(config.theme, rounds, config.firstTurnUserId, config.chooserUserId);
    if (gameType === 'spin') return spinEngine.initialState(rounds, config.firstSpinnerId);
    return fsEngine.initialState(rounds);
  }

  async function proposeGame(gameType, rounds, config = {}) {
    if (!partner) return; // nothing to invite
    const res = await sendInvite(room.id, userId, gameType, rounds, config);
    if (res.ok) invite = res.invite;
  }

  function proposeWYR(rounds) {
    proposeGame('wyr', rounds, {});
  }
  function proposeTOD(rounds, theme) {
    // Proposer sets the theme (already the host-owned decision, now the
    // proposer-owned one) and goes first; partner is the initial chooser.
    proposeGame('tod', rounds, { theme, firstTurnUserId: userId, chooserUserId: partner?.user_id });
  }
  function proposeSpin(rounds) {
    proposeGame('spin', rounds, { firstSpinnerId: userId });
  }
  function proposeFS(rounds) {
    proposeGame('fs', rounds, {});
  }

  async function acceptInvite() {
    if (!invite) return;
    await respondInvite(invite.id, true);
    const gameType = invite.game_type;
    const initialState = await buildInitialState(gameType, invite.rounds, invite.config || {});
    const res = await startGame(room.id, gameType, invite.rounds, initialState);
    if (res.ok) {
      game = res.game;
      invite = null;
      if (gameType === 'wyr') await loadMoves();
      rewireGameSubscription();
    }
  }

  async function declineInvite() {
    if (!invite) return;
    await respondInvite(invite.id, false);
    invite = null;
  }

  function startRenaming() {
    nameDraft = room.display_name || '';
    renaming = true;
  }
  async function saveRename() {
    const trimmed = nameDraft.trim();
    if (trimmed) {
      await renameRoom(room.id, trimmed);
      room = { ...room, display_name: trimmed };
    }
    renaming = false;
  }

  onMount(refresh);
  onDestroy(() => {
    if (unsubGame) unsubGame();
    if (unsubMembers) unsubMembers();
    if (unsubInvites) unsubInvites();
    if (movesChannel) sb.removeChannel(movesChannel);
  });
</script>

{#if loading}
  <p class="status">opening the room…</p>
{:else if !room}
  <p class="status">that room is gone.</p>
{:else}
  <div class="room-header">
    {#if renaming}
      <input class="name-input" bind:value={nameDraft} on:keydown={(e) => e.key === 'Enter' && saveRename()} on:blur={saveRename} autofocus />
    {:else}
      <button class="name-btn" on:click={startRenaming}>{room.display_name || `room ${room.code}`}</button>
    {/if}
    <span class="presence">{partner ? partner.display_name : 'waiting for partner…'}</span>
  </div>

  {#if game && game.game_type === 'wyr'}
    <WYR {game} {userId} partnerId={partner?.user_id} {moves} />
  {:else if game && game.game_type === 'tod'}
    <TOD {game} {userId} partnerId={partner?.user_id} />
  {:else if game && game.game_type === 'spin'}
    <Spin {game} {userId} partnerId={partner?.user_id} />
  {:else if game && game.game_type === 'fs'}
    <FingerSmash {game} {userId} partnerId={partner?.user_id} />
  {:else if invite}
    <div class="invite-card">
      {#if iAmInviter}
        <p class="invite-text">waiting on {partner?.display_name || 'them'} to answer your {invite.game_type} invite…</p>
        <button class="invite-btn decline" on:click={declineInvite}>cancel</button>
      {:else}
        <p class="invite-text">{partner?.display_name || 'they'} want{partner ? 's' : ''} to play <strong>{invite.game_type}</strong> · {invite.rounds} rounds{#if invite.config?.theme} · {invite.config.theme}{/if}</p>
        <div class="row">
          <button class="invite-btn decline" on:click={declineInvite}>not now</button>
          <button class="invite-btn accept" on:click={acceptInvite}>let's go</button>
        </div>
      {/if}
    </div>
  {:else if screeningOpen}
    <button class="back-btn" on:click={() => (screeningOpen = false)}>← back to lobby</button>
    <ScreeningRoom roomId={room.id} {userId} partnerId={partner?.user_id} />
  {:else}
    <Lobby
      partnerPresent={!!partner}
      onStartWYR={proposeWYR}
      onStartTOD={proposeTOD}
      onStartSpin={proposeSpin}
      onStartFS={proposeFS}
      onOpenScreeningRoom={() => (screeningOpen = true)}
    />
  {/if}
{/if}

<style>
  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-soft);
    margin-bottom: -8px;
    position: relative;
    z-index: 1;
  }
  .name-btn {
    background: none; border: none; color: var(--text-soft);
    font-family: var(--font-mono); font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.08em; cursor: pointer; padding: 0;
  }
  .name-input {
    background: var(--surface); border: none; color: var(--text);
    font-family: var(--font-mono); font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.08em; padding: 4px 8px; max-width: 60%;
  }
  .status { padding: 24px; color: var(--text-soft); font-family: var(--font-body); }
  .back-btn {
    margin: 12px 24px 0;
    background: none; border: none; color: var(--text-soft);
    font-family: var(--font-mono); font-size: 11px; text-transform: uppercase;
    cursor: pointer; align-self: flex-start;
  }
  .invite-card { padding: 32px 24px; display: flex; flex-direction: column; gap: 16px; }
  .invite-text { font-family: var(--font-body); font-size: 15px; }
  .row { display: flex; gap: 10px; }
  .invite-btn {
    font-family: var(--font-display); font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.02em; border: none; padding: 12px 24px; cursor: pointer;
    box-shadow: 5px 6px 0 0 #000;
  }
  .invite-btn.accept { background: var(--accent-summer-green); color: var(--on-accent-summer-green); }
  .invite-btn.decline { background: var(--surface-2); color: var(--text); }
</style>
