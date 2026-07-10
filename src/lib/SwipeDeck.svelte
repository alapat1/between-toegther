<script>
  // Swipe-to-match deck — each partner swipes privately, mutual likes
  // auto-land on "our list" (roadmap.md §Watchlist item 1).
  //
  // Interaction safety (polish-checklist tier 3): a swipe only commits past
  // a distance+velocity threshold — anything less snaps back elastically —
  // and every committed swipe gets a 3s undo pill. An accidental like has a
  // SOCIAL consequence (it can fire a match on the partner's phone), so the
  // undo also unwinds a match's auto-board-add.
  import { onMount } from 'svelte';
  import { buildDeck, TMDB_GENRE_CHIPS, ANIME_CHIP } from '../engine/screeningSources.js';
  import { swipe, undoSwipe, fetchSwipedIds, candidateKey } from '../engine/screeningRoom.js';
  import { toast, toastError } from '../engine/toast.js';
  import { buzz } from '../engine/prefs.js';

  export let roomId;
  export let userId;
  export let partnerId;
  export let taste = null; // sr_taste_profiles row or null

  let deck = [];
  let idx = 0;
  let loading = true;
  let matchFlash = null;
  let activeChip = null;

  // drag state
  let dragging = false;
  let dragX = 0;
  let startX = 0;
  let startT = 0;
  let animateBack = false;

  // undo state
  let lastSwipe = null; // { candidate, liked, matched }
  let undoTimer = null;
  let busy = false;

  const COMMIT_DISTANCE = 90; // px
  const COMMIT_VELOCITY = 0.55; // px/ms

  async function loadDeck() {
    loading = true;
    const [candidates, swiped] = await Promise.all([
      buildDeck({
        mix: taste?.mix || 'both',
        includeAnime: taste?.anime_pref !== 'skip'
      }),
      fetchSwipedIds(roomId, userId)
    ]);
    deck = candidates.filter((c) => !swiped.has(candidateKey(c)));
    idx = 0;
    loading = false;
  }

  onMount(loadDeck);

  $: current = deck[idx];

  async function decide(liked) {
    if (!current || busy) return;
    busy = true;
    const cand = current;
    const res = await swipe(roomId, userId, cand, liked, partnerId);
    busy = false;
    if (!res.ok) { toastError("that swipe didn't save — try again"); return; }
    if (res.matched) {
      matchFlash = cand.title;
      buzz([60, 40, 60]);
      setTimeout(() => (matchFlash = null), 1800);
    }
    idx += 1;
    armUndo(cand, liked, !!res.matched);
  }

  function armUndo(candidate, liked, matched) {
    if (undoTimer) clearTimeout(undoTimer);
    lastSwipe = { candidate, liked, matched };
    undoTimer = setTimeout(() => (lastSwipe = null), 3000);
  }

  async function undo() {
    if (!lastSwipe) return;
    clearTimeout(undoTimer);
    const { candidate, matched } = lastSwipe;
    lastSwipe = null;
    const res = await undoSwipe(roomId, userId, candidate, matched);
    if (!res.ok) { toastError("couldn't undo that one"); return; }
    matchFlash = null;
    idx = Math.max(0, idx - 1);
    toast('undone', 'success');
  }

  // --- drag gesture ---
  function onPointerDown(e) {
    if (!current || busy) return;
    dragging = true;
    animateBack = false;
    startX = e.clientX;
    startT = performance.now();
    dragX = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging) return;
    dragX = e.clientX - startX;
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    const dt = Math.max(1, performance.now() - startT);
    const velocity = Math.abs(dragX) / dt;
    if (Math.abs(dragX) > COMMIT_DISTANCE || (velocity > COMMIT_VELOCITY && Math.abs(dragX) > 30)) {
      const liked = dragX > 0;
      dragX = 0;
      decide(liked);
    } else {
      // Below threshold: elastic snap-back, no commit.
      animateBack = true;
      dragX = 0;
    }
  }

  $: cardStyle = dragging || animateBack
    ? `transform: translateX(${dragX}px) rotate(${dragX / 18}deg); transition: ${dragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 1.4, 0.4, 1)'};`
    : '';
  $: leanLike = dragging && dragX > 40;
  $: leanPass = dragging && dragX < -40;
</script>

<div class="deck-screen">
  <div class="chip-row">
    <button class="chip" class:on={!activeChip} on:click={() => (activeChip = null)}>all</button>
    {#each TMDB_GENRE_CHIPS as g}
      <button class="chip" class:on={activeChip === g.id} on:click={() => (activeChip = g.id)}>{g.label}</button>
    {/each}
    <button class="chip" class:on={activeChip === ANIME_CHIP.id} on:click={() => (activeChip = ANIME_CHIP.id)}>{ANIME_CHIP.label}</button>
  </div>

  {#if matchFlash}
    <p class="match-flash">you both liked "{matchFlash}" — saved to our list ✓</p>
  {/if}

  {#if loading}
    <p class="status">shuffling the deck…</p>
  {:else if !current}
    <p class="status">that's everything for now — check back later.</p>
  {:else}
    <div
      class="stack"
      style={cardStyle}
      on:pointerdown={onPointerDown}
      on:pointermove={onPointerMove}
      on:pointerup={onPointerUp}
      on:pointercancel={onPointerUp}
    >
      {#if current.posterUrl}
        <img class="poster" src={current.posterUrl} alt={current.title} draggable="false" />
      {:else}
        <div class="poster placeholder">{current.title}</div>
      {/if}
      <div class="overlay">
        <p class="deck-title">{current.title}</p>
        <p class="deck-sub">{current.mediaType}</p>
      </div>
      {#if leanLike}<span class="lean like-lean">like</span>{/if}
      {#if leanPass}<span class="lean pass-lean">pass</span>{/if}
    </div>
    <div class="row">
      <button class="swipe-btn pass" disabled={busy} on:click={() => decide(false)}>pass</button>
      <button class="swipe-btn like" disabled={busy} on:click={() => decide(true)}>like</button>
    </div>
  {/if}

  {#if lastSwipe}
    <button class="undo-pill" on:click={undo}>
      {lastSwipe.liked ? 'liked' : 'passed'} "{lastSwipe.candidate.title}" — undo
    </button>
  {/if}

  <p class="attribution">watch data and posters provided by TMDB.</p>
</div>

<style>
  .deck-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; align-items: center; }
  .chip-row { display: flex; gap: 8px; flex-wrap: wrap; align-self: flex-start; }
  .chip { background: var(--surface); border: none; color: var(--text-soft); font-family: var(--font-mono); font-size: 11px; padding: 6px 10px; cursor: pointer; }
  .chip.on { background: var(--accent-blue-atoll); color: var(--on-accent-blue-atoll); }
  .match-flash { font-family: var(--font-display); font-weight: 700; color: var(--accent-summer-green); font-size: 14px; }
  .status { color: var(--text-soft); font-family: var(--font-body); font-size: 14px; }
  .stack { position: relative; width: 100%; max-width: 280px; touch-action: pan-y; cursor: grab; user-select: none; }
  .poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; pointer-events: none; }
  .poster.placeholder {
    width: 100%; aspect-ratio: 2/3; background: var(--surface); display: flex; align-items: center;
    justify-content: center; text-align: center; padding: 20px; font-family: var(--font-body); font-size: 16px;
  }
  .overlay { position: absolute; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); padding: 10px 14px; pointer-events: none; }
  .deck-title { font-family: var(--font-display); font-weight: 700; font-size: 15px; }
  .deck-sub { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; color: var(--text-soft); }
  .lean {
    position: absolute; top: 16px; font-family: var(--font-display); font-weight: 800;
    text-transform: uppercase; font-size: 18px; padding: 6px 12px; pointer-events: none;
  }
  .like-lean { left: 12px; background: var(--accent-summer-green); color: var(--on-accent-summer-green); transform: rotate(-8deg); }
  .pass-lean { right: 12px; background: var(--surface-2); color: var(--text); transform: rotate(8deg); }
  .row { display: flex; gap: 16px; }
  .swipe-btn {
    font-family: var(--font-display); font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em;
    border: none; padding: 14px 32px; cursor: pointer; box-shadow: 5px 6px 0 0 #000;
  }
  .swipe-btn:disabled { opacity: 0.6; }
  .swipe-btn.pass { background: var(--surface-2); color: var(--text); }
  .swipe-btn.like { background: var(--accent-fruit-dove); color: var(--on-accent-fruit-dove); }
  .undo-pill {
    background: var(--surface-2); border: none; color: var(--text);
    font-family: var(--font-mono); font-size: 11px; padding: 10px 16px;
    cursor: pointer; box-shadow: 4px 5px 0 0 #000;
  }
  .attribution { font-family: var(--font-mono); font-size: 10px; color: var(--text-soft); margin-top: 8px; }
</style>
