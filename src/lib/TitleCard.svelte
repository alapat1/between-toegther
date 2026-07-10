<script>
  // Shared title card — used in the swipe deck, mood-slider results, boards,
  // and watched history. Save icon opens BoardSheet; watched icon is a
  // second minimal toggle next to it (roadmap.md §Watchlist item 5).
  import BoardSheet from './BoardSheet.svelte';
  import { markWatched, unmarkWatched, getOrCreateDefaultBoard, addToBoard } from '../engine/screeningRoom.js';
  import { toast, toastError } from '../engine/toast.js';
  import { buzz } from '../engine/prefs.js';

  export let roomId;
  export let userId;
  export let candidate;
  export let watched = false;
  export let onWatchedToggle = () => {};

  let showSheet = false;
  let longPressTimer = null;
  let longPressFired = false; // a completed long-press must not ALSO open the sheet on release

  async function quickSaveToDefault() {
    longPressFired = true;
    buzz();
    const board = await getOrCreateDefaultBoard(roomId);
    const res = await addToBoard(board.id, candidate, userId);
    if (res.ok) toast(`saved "${candidate.title}" to our list`, 'success');
    else toastError("couldn't save that one");
  }

  function startPress() {
    longPressFired = false;
    longPressTimer = setTimeout(quickSaveToDefault, 500);
  }
  function endPress() {
    clearTimeout(longPressTimer);
  }
  function openSheet() {
    if (longPressFired) { longPressFired = false; return; }
    showSheet = true;
  }

  async function toggleWatched() {
    const res = watched ? await unmarkWatched(roomId, candidate) : await markWatched(roomId, candidate, userId);
    if (!res.ok) { toastError("couldn't update watched"); return; }
    watched = !watched; // flip locally — parents don't re-fetch on toggle
    onWatchedToggle(watched);
  }
</script>

<div class="card">
  {#if candidate.posterUrl}
    <img class="poster" src={candidate.posterUrl} alt={candidate.title} />
  {:else}
    <div class="poster placeholder">{candidate.title}</div>
  {/if}
  <div class="meta">
    <p class="title">{candidate.title}</p>
    <div class="icons">
      <button
        class="icon-btn save"
        on:click={openSheet}
        on:pointerdown={startPress}
        on:pointerup={endPress}
        on:pointerleave={endPress}
        aria-label="save to board"
      >🔖</button>
      <button class="icon-btn watched" class:on={watched} on:click={toggleWatched} aria-label="mark watched">✓</button>
    </div>
  </div>
</div>

{#if showSheet}
  <BoardSheet {roomId} {userId} {candidate} onClose={() => (showSheet = false)} />
{/if}

<style>
  .card { position: relative; background: var(--surface); }
  .poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; }
  .poster.placeholder {
    display: flex; align-items: center; justify-content: center; text-align: center;
    padding: 12px; font-family: var(--font-body); font-size: 13px; color: var(--text-soft);
  }
  .meta { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; }
  .title { font-family: var(--font-body); font-size: 13px; flex: 1; margin-right: 8px; }
  .icons { display: flex; gap: 6px; }
  .icon-btn { background: none; border: none; font-size: 15px; cursor: pointer; opacity: 0.7; }
  .icon-btn.watched.on { opacity: 1; filter: drop-shadow(0 0 0 var(--accent-summer-green)); color: var(--accent-summer-green); }
</style>
