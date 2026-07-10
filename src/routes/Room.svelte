<script>
  import { onMount, onDestroy } from 'svelte';
  import Lobby from '../lib/Lobby.svelte';
  import WYR from '../games/wyr/WYR.svelte';
  import TOD from '../games/tod/TOD.svelte';
  import Spin from '../games/spin/Spin.svelte';
  import FingerSmash from '../games/fingersmash/FingerSmash.svelte';
  import ScreeningRoom from '../lib/ScreeningRoom.svelte';
  import { sb } from '../engine/supabase.js';
  import { loadRoom, partnerOf, selfOf, subscribeToRoomMembers } from '../engine/room.js';
  import { reconcileActiveGame, startGame, subscribeToGame } from '../engine/session.js';
  import { fetchWyrPrompts } from '../engine/promptsRepo.js';
  import * as todEngine from '../games/tod/engine.js';
  import * as spinEngine from '../games/spin/engine.js';
  import * as fsEngine from '../games/fingersmash/engine.js';

  export let code;
  export let userId;

  let room = null;
  let game = null;
  let screeningOpen = false; // Screening Room isn't a game_session — no rounds/version guard
  let moves = []; // only used for WYR (wyr_moves table)
  let loading = true;
  let unsubGame = null;
  let unsubMembers = null;
  let movesChannel = null;

  $: partner = room ? partnerOf(room.members, userId) : null;
  $: self = room ? selfOf(room.members, userId) : null;
  $: isHost = self?.role === 'host';

  async function refresh() {
    const res = await loadRoom(code);
    if (!res.ok) { loading = false; return; }
    room = res.room;
    game = await reconcileActiveGame(room.id);
    if (game && game.type === 'wyr') await loadMoves();
    loading = false;
    rewireGameSubscription();
    rewireMembersSubscription();
  }

  // Refetches just room+members — cheap enough to call on every
  // room_members change (join/leave) rather than diffing manually.
  async function reloadMembers() {
    const res = await loadRoom(code);
    if (res.ok) room = res.room;
  }

  function rewireMembersSubscription() {
    if (unsubMembers) unsubMembers();
    unsubMembers = subscribeToRoomMembers(room.id, reloadMembers);
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

    if (game.type === 'wyr') {
      movesChannel = sb
        .channel(`wyr_moves:${game.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wyr_moves', filter: `game_id=eq.${game.id}` }, loadMoves)
        .subscribe();
    }
  }

  async function launch(type, initialState) {
    const res = await startGame(room.id, type, initialState.totalRounds, initialState);
    if (res.ok) {
      game = res.game;
      if (type === 'wyr') await loadMoves();
      rewireGameSubscription();
    }
  }

  async function startWYR(rounds) {
    const prompts = await fetchWyrPrompts(rounds);
    launch('wyr', { prompts, pips: [], totalRounds: rounds });
  }
  function startTOD(rounds, theme) {
    launch('tod', todEngine.initialState(theme, rounds, userId, partner?.user_id));
  }
  function startSpin(rounds) {
    launch('spin', spinEngine.initialState(rounds, userId));
  }
  function startFS(rounds) {
    launch('fingersmash', fsEngine.initialState(rounds));
  }

  onMount(refresh);
  onDestroy(() => {
    if (unsubGame) unsubGame();
    if (unsubMembers) unsubMembers();
    if (movesChannel) sb.removeChannel(movesChannel);
  });
</script>

{#if loading}
  <p class="status">opening the room…</p>
{:else if !room}
  <p class="status">that room is gone.</p>
{:else}
  <div class="room-header">
    <span class="code">room {room.code}</span>
    <span class="presence">{partner ? partner.display_name : 'waiting for partner…'}</span>
  </div>

  {#if game && game.type === 'wyr'}
    <WYR {game} {userId} partnerId={partner?.user_id} {moves} />
  {:else if game && game.type === 'tod'}
    <TOD {game} {userId} partnerId={partner?.user_id} />
  {:else if game && game.type === 'spin'}
    <Spin {game} {userId} partnerId={partner?.user_id} />
  {:else if game && game.type === 'fingersmash'}
    <FingerSmash {game} {userId} partnerId={partner?.user_id} />
  {:else if screeningOpen}
    <button class="back-btn" on:click={() => (screeningOpen = false)}>← back to lobby</button>
    <ScreeningRoom roomId={room.id} {userId} partnerId={partner?.user_id} />
  {:else}
    <Lobby
      {isHost}
      partnerPresent={!!partner}
      onStartWYR={startWYR}
      onStartTOD={startTOD}
      onStartSpin={startSpin}
      onStartFS={startFS}
      onOpenScreeningRoom={() => (screeningOpen = true)}
    />
  {/if}
{/if}

<style>
  .room-header {
    display: flex;
    justify-content: space-between;
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
  .status { padding: 24px; color: var(--text-soft); font-family: var(--font-body); }
  .back-btn {
    margin: 12px 24px 0;
    background: none; border: none; color: var(--text-soft);
    font-family: var(--font-mono); font-size: 11px; text-transform: uppercase;
    cursor: pointer; align-self: flex-start;
  }
</style>
