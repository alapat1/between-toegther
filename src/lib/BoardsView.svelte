<script>
  // Browse boards + watched history. Boards are shared per space
  // (roadmap.md §Watchlist item 4); watched history feeds recap later.
  import { onMount } from 'svelte';
  import { listBoards, listBoardItems, listWatched } from '../engine/screeningRoom.js';

  export let roomId;
  export let userId;

  let boards = [];
  let selectedBoard = null;
  let items = [];
  let watched = [];
  let view = 'boards'; // 'boards' | 'watched'

  async function loadBoards() {
    boards = await listBoards(roomId);
    if (boards.length && !selectedBoard) selectedBoard = boards[0];
  }
  async function loadItems() {
    if (!selectedBoard) return;
    items = await listBoardItems(selectedBoard.id);
  }
  async function loadWatched() {
    watched = await listWatched(roomId);
  }

  onMount(async () => {
    await loadBoards();
    await loadItems();
    await loadWatched();
  });

  $: if (selectedBoard) loadItems();
</script>

<div class="boards-screen">
  <div class="tabs">
    <button class="tab" class:on={view === 'boards'} on:click={() => (view = 'boards')}>boards</button>
    <button class="tab" class:on={view === 'watched'} on:click={() => (view = 'watched')}>watched · {watched.length}</button>
  </div>

  {#if view === 'boards'}
    <div class="board-chip-row">
      {#each boards as b}
        <button class="board-chip" class:on={selectedBoard?.id === b.id} on:click={() => (selectedBoard = b)}>{b.name}</button>
      {/each}
    </div>
    {#if !items.length}
      <p class="status">nothing saved here yet.</p>
    {:else}
      <div class="grid">
        {#each items as it}
          <div class="item">
            {#if it.poster_url}
              <img class="poster" src={it.poster_url} alt={it.title} />
            {:else}
              <div class="poster placeholder">{it.title}</div>
            {/if}
            <p class="item-title">{it.title}</p>
          </div>
        {/each}
      </div>
    {/if}
  {:else if !watched.length}
    <p class="status">nothing marked watched yet.</p>
  {:else}
    <div class="grid">
      {#each watched as w}
        <div class="item">
          {#if w.poster_url}
            <img class="poster" src={w.poster_url} alt={w.title} />
          {:else}
            <div class="poster placeholder">{w.title}</div>
          {/if}
          <p class="item-title">{w.title}</p>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .boards-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .tabs { display: flex; gap: 8px; }
  .tab { background: var(--surface); border: none; color: var(--text-soft); font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; padding: 8px 14px; cursor: pointer; }
  .tab.on { background: var(--accent-blue-atoll); color: var(--on-accent-blue-atoll); }
  .board-chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .board-chip { background: var(--surface-2); border: none; color: var(--text); font-family: var(--font-body); font-size: 12px; padding: 6px 12px; cursor: pointer; }
  .board-chip.on { background: var(--accent-fruit-dove); color: var(--on-accent-fruit-dove); }
  .status { color: var(--text-soft); font-family: var(--font-body); font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .item { background: var(--surface); }
  .poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; }
  .poster.placeholder { display: flex; align-items: center; justify-content: center; text-align: center; padding: 8px; font-family: var(--font-body); font-size: 11px; color: var(--text-soft); }
  .item-title { font-family: var(--font-body); font-size: 11px; padding: 6px 8px; }
</style>
