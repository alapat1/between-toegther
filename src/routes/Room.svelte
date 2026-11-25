<script>
  import { onMount, onDestroy } from 'svelte';
  import Lobby from '../lib/Lobby.svelte';
  import WYR from '../games/wyr/WYR.svelte';
  import TOD from '../games/tod/TOD.svelte';
  import Spin from '../games/spin/Spin.svelte';
  import FingerSmash from '../games/fingersmash/FingerSmash.svelte';
  import ScreeningRoom from '../lib/ScreeningRoom.svelte';
  import Settings from '../lib/Settings.svelte';
  import Recap from '../lib/Recap.svelte';
  import { sb } from '../engine/supabase.js';
  import { loadRoom, joinRoom, partnerOf, selfOf, renameRoom, leaveRoom, subscribeToRoomMembers, joinPresence } from '../engine/room.js';
  import { reconcileActiveGame, startGame, subscribeToGame, guardedGameWrite } from '../engine/session.js';
  import { sendInvite, respondInvite, fetchActiveInvite, subscribeToInvites } from '../engine/invites.js';
  import { fetchWyrPrompts } from '../engine/promptsRepo.js';
  import { toast, toastError } from '../engine/toast.js';
  import { setErrorContext } from '../engine/errlog.js';
  import { confirm } from '../engine/confirm.js';
  import { buzz } from '../engine/prefs.js';
  import { online, catchUpOnSubscribe } from '../engine/connection.js';
  import { nameOr } from '../engine/copy.js';
  import { focusOnMount } from '../engine/a11y.js';
  import Avatar from '../lib/Avatar.svelte';
  import HowToPlay from '../lib/HowToPlay.svelte';
  import History from '../lib/History.svelte';
  import Info from '../lib/Info.svelte';
  import * as todEngine from '../games/tod/engine.js';
  import * as spinEngine from '../games/spin/engine.js';
  import * as fsEngine from '../games/fingersmash/engine.js';

  const GAME_LABEL = { wyr: 'would you rather', tod: 'truth or dare', spin: 'spin the wheel', fs: 'finger smash' };

  export let code;
  export let userId;

  let room = null;
  let game = null;
  let invite = null; // pending game_invites row for this room, or null
  let recap = null;  // final (ended) game_sessions row awaiting its recap screen
  let screeningOpen = false; // Screening Room isn't a game_session — no rounds/version guard
  let settingsOpen = false;
  let menuOpen = false;
  let moves = []; // only used for WYR (wyr_moves table)
  let loading = true;
  let renaming = false;
  let nameDraft = '';
  let unsubGame = null;
  let unsubMembers = null;
  let unsubInvites = null;
  let movesChannel = null;
  let presence = null;
  let peers = {}; // userId -> 'lobby' | 'game' | 'screening' (present users only)
  let watchdogTimer = null;
  let lastNudgeSentAt = 0;
  let hadGame = false;
  // Opening a link as someone who isn't in the space yet: ask before joining.
  let historyOpen = false;
  let infoSection = null; // null | 'help' | 'privacy'
  let howTo = false; // rules card open
  let awayLong = false; // partner gone for a few seconds mid-game
  let awayTimer = null;
  let joinState = null; // null | 'prompt' | 'joining' | 'full' | 'missing' | 'error'

  $: partner = room ? partnerOf(room.members, userId) : null;
  $: partnerName = nameOr(partner?.display_name);
  $: iAmInviter = invite && invite.invited_by === userId;
  $: partnerStatus = partner ? (peers[partner.user_id] || 'away') : null;
  $: myView = game ? 'game' : screeningOpen ? 'screening' : 'lobby';
  $: if (presence) presence.setStatus(myView);
  // Attach where-we-were context to every logged error.
  $: setErrorContext({ roomId: room?.id || null, gameType: game?.game_type || null, view: myView });

  // In-app back handling: back-swipe closes overlays (settings, screening
  // room) instead of leaving the app, and can't accidentally exit a live
  // game. Each overlay pushes one history entry; popstate unwinds it.
  function pushView() {
    history.pushState({ bt: true }, '', location.href);
  }
  function handlePopstate() {
    if (settingsOpen) { settingsOpen = false; return; }
    if (screeningOpen) { screeningOpen = false; return; }
    if (recap) { recap = null; return; }
    if (game) {
      pushView();
      toast('use the menu to end the game first');
    }
    // else: default behavior — hash unwinds to landing via App.svelte
  }
  // Game appearing (via accept or partner's accept) arms one guard entry.
  $: {
    if (game && !hadGame) { hadGame = true; pushView(); }
    if (!game) hadGame = false;
  }

  function openScreening() { screeningOpen = true; pushView(); }
  function openSettings() { settingsOpen = true; menuOpen = false; pushView(); }

  async function refresh() {
    const res = await loadRoom(code);
    if (!res.ok) { loading = false; if (!room) joinState = 'prompt'; return; }
    room = res.room;
    game = await reconcileActiveGame(room.id);
    invite = game ? null : await fetchActiveInvite(room.id);
    if (game && game.game_type === 'wyr') await loadMoves();
    loading = false;
    rewireGameSubscription();
    rewireMembersSubscription();
    rewireInvitesSubscription();
    rewirePresence();
  }

  async function acceptJoin() {
    joinState = 'joining';
    const res = await joinRoom(code);
    if (res.ok) { joinState = null; loading = true; await refresh(); return; }
    joinState = res.reason === 'room-full' ? 'full' : res.reason === 'no-such-room' ? 'missing' : 'error';
  }
  function backToStart() { location.hash = ''; }

  // First time you see a game on this device, show its rules once.
  let howToForId = null;
  $: if (game && game.id !== howToForId) {
    howToForId = game.id;
    try {
      if (localStorage.getItem('bt-howto-' + game.game_type) !== '1') {
        localStorage.setItem('bt-howto-' + game.game_type, '1');
        howTo = true;
      }
    } catch (e) { /* private mode: skip the card */ }
  }
  $: if (!game) howTo = false;

  // Only call it a connection problem after a few seconds — presence blips.
  $: {
    const away = !!game && !!partner && partnerStatus === 'away';
    if (away && !awayTimer && !awayLong) awayTimer = setTimeout(() => { awayLong = true; awayTimer = null; }, 8000);
    if (!away) { if (awayTimer) { clearTimeout(awayTimer); awayTimer = null; } awayLong = false; }
  }

  // The moment the other person arrives is worth marking.
  let aloneSeen = false;
  $: if (room) {
    if (!partner) aloneSeen = true;
    else if (aloneSeen) {
      aloneSeen = false;
      toast(`${partnerName} joined`, 'success');
      buzz([60, 40, 60]);
    }
  }

  // Refetches just room+members — cheap enough to call on every
  // room_members change (join/leave) rather than diffing manually.
  async function reloadMembers() {
    const res = await loadRoom(code);
    if (res.ok) room = res.room;
  }

  // A game that just vanished from "active" either finished naturally
  // (phase ended/end → show the recap, don't snap to the lobby — that snap
  // was the "games just closed without a scoreboard" bug) or was ended
  // manually via the menu (no recap, just a heads-up).
  async function handleGameGone(prevGameId) {
    if (!prevGameId) return;
    const { data: final } = await sb.from('game_sessions').select('*').eq('id', prevGameId).maybeSingle();
    if (final && (final.phase === 'ended' || final.phase === 'end')) {
      recap = final;
    } else if (final && final.ended_at) {
      toast('the game was ended');
    }
  }

  // Fires on every game_invites change for this room — including from the
  // OTHER partner's device. Has to check for a newly-started game too, not
  // just re-fetch the pending invite.
  async function reloadInviteAndGame() {
    if (!room) return;
    const activeGame = await reconcileActiveGame(room.id);
    if (activeGame) {
      if (!game || game.id !== activeGame.id) {
        game = activeGame;
        invite = null;
        recap = null;
        if (game.game_type === 'wyr') await loadMoves();
        rewireGameSubscription();
      } else {
        game = activeGame;
      }
    } else {
      const prevId = game?.id;
      game = null;
      if (prevId && !recap) await handleGameGone(prevId);
      invite = await fetchActiveInvite(room.id);
    }
  }

  function rewireMembersSubscription() {
    if (unsubMembers) unsubMembers();
    unsubMembers = subscribeToRoomMembers(room.id, reloadMembers);
  }

  // The inviter learns "accepted" from the invite row, but the game row only
  // appears a moment later (the accepter's phone creates it). Without also
  // watching for new games in this room, the inviter sat in the lobby for
  // ~15s until the poll caught up. Watch inserts directly.
  let gameInsertChannel = null;
  function rewireInvitesSubscription() {
    if (unsubInvites) unsubInvites();
    unsubInvites = subscribeToInvites(room.id, reloadInviteAndGame);
    if (gameInsertChannel) sb.removeChannel(gameInsertChannel);
    gameInsertChannel = sb
      .channel(`game_inserts:${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_sessions', filter: `room_id=eq.${room.id}` }, reloadInviteAndGame)
      .subscribe(catchUpOnSubscribe(reloadInviteAndGame));
  }

  function rewirePresence() {
    if (presence) presence.unsubscribe();
    presence = joinPresence(room.id, userId, myView, (p) => { peers = p; }, () => {
      buzz([80, 40, 80]);
      toast(`${partnerName} nudged you — your move`, 'info');
    });
  }

  function sendNudge() {
    if (!presence || !partner) return;
    const now = Date.now();
    if (now - lastNudgeSentAt < 60000) { toast('easy — you just nudged them'); return; }
    lastNudgeSentAt = now;
    presence.nudge(partner.user_id);
    toast('nudge sent', 'success');
    menuOpen = false;
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

    const subscribedGameId = game.id;
    unsubGame = subscribeToGame(game.id, async () => {
      game = await reconcileActiveGame(room.id);
      if (!game) {
        await handleGameGone(subscribedGameId);
        invite = await fetchActiveInvite(room.id);
      }
    });

    if (game.game_type === 'wyr') {
      movesChannel = sb
        .channel(`wyr_moves:${game.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wyr_moves', filter: `game_id=eq.${game.id}` }, loadMoves)
        .subscribe(catchUpOnSubscribe(loadMoves));
    }
  }

  // Stale-waiting watchdog: realtime SHOULD deliver every change, but when
  // it doesn't (dropped socket, missed publication, anything), nobody
  // should sit on "waiting on them…" forever. Every 20s, while visible,
  // quietly reconcile against the server's truth.
  async function resync() {
    if (document.visibilityState !== 'visible' || !room) return;
    await reloadInviteAndGame();
    if (game && game.game_type === 'wyr') await loadMoves();
    if (!game && !invite && !screeningOpen) {
      const res = await loadRoom(code);
      if (res.ok) room = res.room;
    }
  }

  // Poll faster while a game is live (a stuck "waiting on them…" in a
  // 30-second round is unacceptable); relax when idle in the lobby.
  function startWatchdog() {
    let ticks = 0;
    watchdogTimer = setInterval(() => {
      ticks++;
      if (game || ticks % 2 === 0) resync();
    }, 5000);
  }

  // Waking from sleep / regaining signal: the realtime socket is torn down
  // and re-subscribed elsewhere, but that does NOT replay events missed in
  // the gap — so pull the server's truth immediately.
  // Apply my own successful write right away instead of waiting for the
  // realtime echo — a slow echo made taps look dead. Only ever moves forward
  // (version check), and an ended row goes through the normal recap path.
  function handleOwnWrite(e) {
    const row = e.detail;
    if (!game || !row || row.id !== game.id) return;
    if (row.ended_at) { resync(); return; }
    if (row.version >= game.version) game = row;
  }

  function handleWake() { if (document.visibilityState === 'visible') resync(); }

  // Building the actual initialState per game type needs the same
  // per-game setup the old direct-start flow had. Kept here rather than in
  // invites.js so the invite engine stays game-agnostic.
  async function buildInitialState(gameType, rounds, config) {
    if (gameType === 'wyr') {
      const prompts = await fetchWyrPrompts(rounds);
      return { prompts, pips: [], totalRounds: rounds };
    }
    if (gameType === 'tod') return todEngine.initialState(config.theme, rounds, config.firstTurnUserId, config.chooserUserId, config.mode || 'self');
    if (gameType === 'spin') return spinEngine.initialState(rounds, config.firstSpinnerId);
    return fsEngine.initialState(rounds);
  }

  async function proposeGame(gameType, rounds, config = {}) {
    if (!partner) return; // nothing to invite
    const res = await sendInvite(room.id, userId, gameType, rounds, config);
    if (res.ok) invite = res.invite;
    else toastError("couldn't send the invite — try again");
  }

  // Rematch from the recap screen: same game, same shape, fresh invite —
  // the partner still gets to accept (mutual-consent model holds).
  async function rematchGame(gameType, rounds, config) {
    recap = null;
    await proposeGame(gameType, rounds, config);
  }

  function proposeWYR(rounds) {
    proposeGame('wyr', rounds, {});
  }
  function proposeTOD(rounds, theme, mode = 'self') {
    proposeGame('tod', rounds, { theme, mode, firstTurnUserId: userId, chooserUserId: partner?.user_id });
  }
  function proposeSpin(rounds) {
    proposeGame('spin', rounds, { firstSpinnerId: userId });
  }
  function proposeFS(rounds) {
    proposeGame('fs', rounds, {});
  }

  let answeringInvite = false;
  async function acceptInvite() {
    if (!invite || answeringInvite) return;
    answeringInvite = true;
    // Snapshot: marking the invite accepted fires a realtime change that
    // nulls the reactive `invite` while we're still mid-await. Reading
    // invite.* after that point crashed with "reading 'rounds' of null" and
    // made "let's go" silently do nothing.
    const inv = invite;
    try {
      const resp = await respondInvite(inv.id, true);
      if (!resp.ok) { toastError("couldn't accept — try again"); return; }
      const initialState = await buildInitialState(inv.game_type, inv.rounds, inv.config || {});
      const res = await startGame(room.id, inv.game_type, inv.rounds, initialState);
      if (res.ok && res.game) {
        game = res.game;
        invite = null;
        if (inv.game_type === 'wyr') await loadMoves();
        rewireGameSubscription();
      } else {
        toastError("couldn't start the game — try again");
      }
    } finally {
      answeringInvite = false;
    }
  }

  async function declineInvite() {
    if (!invite || answeringInvite) return;
    answeringInvite = true;
    try {
      await respondInvite(invite.id, false);
      invite = null;
    } finally {
      answeringInvite = false;
    }
  }

  // Escape hatch: either partner can end the current game. Sets ended_at so
  // unique_active_game_per_room frees up; the partner's device follows via
  // the game_sessions realtime subscription.
  async function endCurrentGame() {
    menuOpen = false;
    if (!game) return;
    if (!(await confirm('end this game for both of you?', 'end game'))) return;
    const res = await guardedGameWrite(game.id, () => ({ ended_at: new Date().toISOString() }));
    if (!res.ok) { toastError("couldn't end the game — try again"); return; }
    game = null;
    moves = [];
    rewireGameSubscription();
    invite = await fetchActiveInvite(room.id);
  }

  function copyInviteLink() {
    menuOpen = false;
    const link = `${location.origin}${location.pathname}#/r/${room.code}`;
    navigator.clipboard?.writeText(link).then(
      () => toast('invite link copied', 'success'),
      () => toast(`your code is ${room.code}`)
    );
  }

  function switchSpace() {
    menuOpen = false;
    settingsOpen = false;
    window.location.hash = '';
  }

  async function doLeaveRoom() {
    menuOpen = false;
    settingsOpen = false;
    if (!(await confirm(`leave this space? ${partner ? partnerName + ' keeps it, and' : 'you'} can rejoin with the code.`, 'leave'))) return;
    const res = await leaveRoom(room.id, userId);
    if (!res.ok) { toastError("couldn't leave — try again"); return; }
    window.location.hash = '';
  }

  function editTaste() {
    settingsOpen = false;
    openScreening();
  }

  function startRenaming() {
    nameDraft = room.display_name || '';
    renaming = true;
    menuOpen = false;
  }
  async function saveRename() {
    const trimmed = nameDraft.trim();
    if (trimmed) {
      const res = await renameRoom(room.id, trimmed);
      if (!res.ok) { toastError("couldn't rename — try again"); renaming = false; return; }
      room = { ...room, display_name: trimmed };
    }
    renaming = false;
  }

  onMount(() => {
    refresh();
    startWatchdog();
    window.addEventListener('popstate', handlePopstate);
    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('online', handleWake);
    window.addEventListener('bt:game-write', handleOwnWrite);
  });
  onDestroy(() => {
    if (unsubGame) unsubGame();
    if (unsubMembers) unsubMembers();
    if (unsubInvites) unsubInvites();
    if (movesChannel) sb.removeChannel(movesChannel);
    if (gameInsertChannel) sb.removeChannel(gameInsertChannel);
    if (presence) presence.unsubscribe();
    if (watchdogTimer) clearInterval(watchdogTimer);
    window.removeEventListener('popstate', handlePopstate);
    document.removeEventListener('visibilitychange', handleWake);
    window.removeEventListener('online', handleWake);
    window.removeEventListener('bt:game-write', handleOwnWrite);
  });
</script>

{#if loading}
  <p class="status loading">opening your space<span class="dots"></span></p>
{:else if !room}
  <div class="join-card">
    {#if joinState === 'prompt' || joinState === 'joining'}
      <p class="join-title">you've been invited to a space</p>
      <p class="join-sub">it's a private space for two, where you can play together. joining takes one tap.</p>
      <button class="join-btn" disabled={joinState === 'joining'} on:click={acceptJoin}>{joinState === 'joining' ? 'joining…' : 'join this space'}</button>
      <button class="join-link" on:click={backToStart}>not now</button>
    {:else if joinState === 'full'}
      <p class="join-title">this space is already full</p>
      <p class="join-sub">a space holds two people, and both seats are taken. ask them for a new invite, or start your own.</p>
      <button class="join-btn" on:click={backToStart}>start my own space</button>
    {:else if joinState === 'missing'}
      <p class="join-title">we can't find that space</p>
      <p class="join-sub">the link may be mistyped or the space was closed. check the code with the person who invited you.</p>
      <button class="join-btn" on:click={backToStart}>back to start</button>
    {:else}
      <p class="join-title">that didn't work</p>
      <p class="join-sub">check your connection and try again.</p>
      <button class="join-btn" on:click={acceptJoin}>try again</button>
      <button class="join-link" on:click={backToStart}>back to start</button>
    {/if}
  </div>
{:else}
  {#if game && awayLong}
    <div class="offline-banner away" role="status">{partnerName} seems to have dropped off — your game is safe and will pick up when they’re back.</div>
  {/if}
  {#if !$online}
    <div class="offline-banner" role="status">you're offline — reconnecting… your game will catch up when you're back</div>
  {/if}
  <div class="room-header">
    {#if renaming}
      <input class="name-input" bind:value={nameDraft} on:keydown={(e) => e.key === 'Enter' && saveRename()} on:blur={saveRename} use:focusOnMount aria-label="space name" />
    {:else}
      <button class="name-btn" on:click={startRenaming}>{room.display_name || `space ${room.code}`}</button>
    {/if}
    <span class="presence-label">
      {#if partner}<Avatar avatar={partner.avatar} id={partner.user_id} size={30} />{/if}
      {#if !partner}
        waiting for someone to join
      {:else if partnerStatus === 'away'}
        {partner.display_name} · away
      {:else if partnerStatus === 'screening'}
        {partner.display_name} · in the screening room
      {:else}
        {partner.display_name} · here
      {/if}
    </span>
    <button class="menu-btn" aria-label="space menu" on:click={() => (menuOpen = !menuOpen)}>⋯</button>
  </div>

  {#if menuOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="menu-scrim" on:click={() => (menuOpen = false)}></div>
    <div class="menu">
      <button class="menu-item" on:click={copyInviteLink}>copy invite link</button>
      <button class="menu-item" on:click={() => { historyOpen = true; menuOpen = false; }}>past games</button>
      {#if game}
        <button class="menu-item" on:click={() => { howTo = true; menuOpen = false; }}>how to play</button>
      {/if}
      {#if partner}
        <button class="menu-item" on:click={sendNudge}>nudge {partner.display_name}</button>
      {/if}
      <button class="menu-item" on:click={startRenaming}>rename space</button>
      <button class="menu-item" on:click={openSettings}>settings</button>
      <button class="menu-item" on:click={switchSpace}>switch space</button>
      {#if game}
        <button class="menu-item danger" on:click={endCurrentGame}>end current game</button>
      {/if}
      <button class="menu-item danger" on:click={doLeaveRoom}>leave this space</button>
    </div>
  {/if}

  {#if infoSection}
    <Info section={infoSection} onClose={() => (infoSection = null)} />
  {/if}

  {#if historyOpen}
    <History roomId={room.id} {userId} partnerId={partner?.user_id} {partnerName} onClose={() => (historyOpen = false)} />
  {:else if howTo && game}
    <HowToPlay type={game.game_type} mode={game.state?.mode || ''} onClose={() => (howTo = false)} />
  {/if}

  {#if settingsOpen}
    <Settings
      {userId}
      {room}
      displayName={room.members?.find((m) => m.user_id === userId)?.display_name || ''}
      avatar={room.members?.find((m) => m.user_id === userId)?.avatar || null}
      onProfileChanged={reloadMembers}
      onOpenInfo={(sec) => (infoSection = sec)}
      onClose={() => (settingsOpen = false)}
      onEditTaste={editTaste}
      onSwitchSpace={switchSpace}
      onLeaveRoom={doLeaveRoom}
    />
  {:else if game && game.game_type === 'wyr'}
    <WYR {game} {userId} partnerId={partner?.user_id} {partnerName} {moves} onMoved={loadMoves} />
  {:else if game && game.game_type === 'tod'}
    <TOD {game} {userId} partnerId={partner?.user_id} {partnerName} />
  {:else if game && game.game_type === 'spin'}
    <Spin {game} {userId} partnerId={partner?.user_id} {partnerName} />
  {:else if game && game.game_type === 'fs'}
    <FingerSmash {game} {userId} partnerId={partner?.user_id} {partnerName} />
  {:else if invite}
    <div class="invite-card">
      {#if iAmInviter}
        <p class="invite-text">waiting on {partnerName} to answer your {GAME_LABEL[invite.game_type] || invite.game_type} invite…</p>
        <div class="row bottom">
          <button class="invite-btn decline" on:click={declineInvite}>cancel</button>
        </div>
      {:else}
        <p class="invite-text">{partnerName} wants to play <strong>{GAME_LABEL[invite.game_type] || invite.game_type}</strong> · {invite.rounds} rounds{#if invite.config?.theme}{' · ' + invite.config.theme}{/if}{#if invite.config?.mode === 'dealer'}{' · pick for each other'}{/if}</p>
        <div class="row bottom">
          <button class="invite-btn decline" disabled={answeringInvite} on:click={declineInvite}>not now</button>
          <button class="invite-btn accept" disabled={answeringInvite} on:click={acceptInvite}>{answeringInvite ? 'starting…' : "let's go"}</button>
        </div>
      {/if}
    </div>
  {:else if recap}
    <Recap
      game={recap}
      {userId}
      partnerId={partner?.user_id}
      {partnerName}
      myName={selfOf(room.members, userId)?.display_name || 'you'}
      myAvatar={selfOf(room.members, userId)?.avatar || null}
      partnerAvatar={partner?.avatar || null}
      onRematch={rematchGame}
      onDone={() => (recap = null)}
    />
  {:else if screeningOpen}
    <button class="back-btn" on:click={() => history.back()}>← back to lobby</button>
    <ScreeningRoom roomId={room.id} {userId} partnerId={partner?.user_id} />
  {:else}
    <Lobby
      partnerPresent={!!partner}
      {partnerName}
      roomCode={room.code}
      onCopyInvite={copyInviteLink}
      onStartWYR={proposeWYR}
      onStartTOD={proposeTOD}
      onStartSpin={proposeSpin}
      onStartFS={proposeFS}
      onOpenScreeningRoom={openScreening}
    />
  {/if}
{/if}

<style>
  .join-card { padding: 40px 24px; display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
  .join-title { font-family: var(--font-display); font-weight: 800; font-size: 24px; margin: 0; line-height: 1.15; }
  .join-sub { color: var(--text-soft); font-size: 15px; line-height: 1.5; margin: 0; }
  .join-btn { width: 100%; background: var(--accent-summer-green); color: var(--on-accent-summer-green); border: none; padding: 16px; font-family: var(--font-display); font-weight: 800; text-transform: uppercase; cursor: pointer; box-shadow: 5px 6px 0 0 #000; }
  .join-btn:disabled { opacity: 0.6; }
  .join-link { background: none; border: none; color: var(--text-soft); font-family: var(--font-mono); font-size: 12px; text-transform: uppercase; cursor: pointer; padding: 8px 0; }
  .loading .dots::after { content: ''; animation: dots 1.2s steps(4, end) infinite; }
  @keyframes dots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75%, 100% { content: '...'; } }
  .offline-banner { background: var(--accent-fruit-dove, #c0392b); color: #fff; font-family: var(--font-mono); font-size: 11px; padding: 8px 12px; text-align: center; }
  .room-header {
    display: flex;
    align-items: center;
    gap: 12px;
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
    letter-spacing: 0.08em; padding: 4px 8px; max-width: 50%;
  }
  .presence-label { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
  .menu-btn {
    background: var(--surface); border: none; color: var(--text);
    font-size: 16px; line-height: 1; padding: 4px 10px; cursor: pointer;
  }
  .menu-scrim { position: fixed; inset: 0; z-index: 19; }
  .menu {
    position: absolute; right: 24px; top: 52px; z-index: 20;
    background: var(--surface); box-shadow: 5px 6px 0 0 #000;
    display: flex; flex-direction: column; min-width: 200px;
  }
  .menu-item {
    background: none; border: none; color: var(--text); text-align: left;
    font-family: var(--font-body); font-size: 14px; padding: 12px 16px; cursor: pointer;
  }
  .menu-item:hover { background: var(--surface-2); }
  .menu-item.danger { color: var(--accent-fruit-dove); }
  .status { padding: 24px; color: var(--text-soft); font-family: var(--font-body); }
  .back-btn {
    margin: 12px 24px 0;
    background: none; border: none; color: var(--text-soft);
    font-family: var(--font-mono); font-size: 11px; text-transform: uppercase;
    cursor: pointer; align-self: flex-start;
  }
  .invite-card {
    padding: 32px 24px calc(32px + env(safe-area-inset-bottom, 0px));
    display: flex; flex-direction: column; gap: 16px;
    min-height: 45vh;
  }
  .invite-text { font-family: var(--font-body); font-size: 15px; }
  .row { display: flex; gap: 10px; }
  .row.bottom { margin-top: auto; }
  .invite-btn {
    font-family: var(--font-display); font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.02em; border: none; padding: 14px 26px; cursor: pointer;
    box-shadow: 5px 6px 0 0 #000;
  }
  .invite-btn.accept { background: var(--accent-summer-green); color: var(--on-accent-summer-green); flex: 1; }
  .invite-btn.decline { background: var(--surface-2); color: var(--text); }
</style>
