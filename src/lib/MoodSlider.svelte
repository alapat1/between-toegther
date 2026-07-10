<script>
  // Mood slider — drag mindless -> cozy -> gripping -> tearjerker, set a time
  // budget, get 3 candidates, both vote (roadmap.md §Watchlist item 2).
  import { buildDeck } from '../engine/screeningSources.js';
  import TitleCard from './TitleCard.svelte';
  import { fetchWatchedIds, candidateKey } from '../engine/screeningRoom.js';

  export let roomId;
  export let userId;
  export let taste = null;

  const MOODS = ['mindless', 'cozy', 'gripping', 'tearjerker'];
  const TIME_BUDGETS = ['episode', 'movie', 'marathon'];

  let moodIdx = 1;
  let timeIdx = 1;
  let candidates = [];
  let loading = false;
  let watchedIds = new Set();

  // Heuristic mapping: mood roughly maps to genre bias when we have real
  // genre IDs to filter on; for now we shuffle the trending pool and take 3
  // — a light heuristic beats nothing, and it's easy to tighten once we have
  // usage data on which moods people actually pick.
  async function rollCandidates() {
    loading = true;
    const mix = TIME_BUDGETS[timeIdx] === 'episode' ? 'series' : TIME_BUDGETS[timeIdx] === 'marathon' ? 'both' : 'movies';
    const [pool, watched] = await Promise.all([
      buildDeck({ mix, includeAnime: taste?.anime_pref !== 'skip' }),
      fetchWatchedIds(roomId)
    ]);
    watchedIds = watched;
    candidates = pool.filter((c) => !watchedIds.has(candidateKey(c))).slice(0, 3);
    loading = false;
  }
</script>

<div class="mood-screen">
  <div class="slider-row">
    <label class="label" for="mood">tonight's mood</label>
    <input id="mood" type="range" min="0" max="3" step="1" bind:value={moodIdx} />
    <span class="readout">{MOODS[moodIdx]}</span>
  </div>
  <div class="slider-row">
    <label class="label" for="time">how long</label>
    <input id="time" type="range" min="0" max="2" step="1" bind:value={timeIdx} />
    <span class="readout">{TIME_BUDGETS[timeIdx]}</span>
  </div>

  <button class="roll-btn" on:click={rollCandidates}>get 3 picks</button>

  {#if loading}
    <p class="status">rolling picks…</p>
  {:else if candidates.length}
    <div class="grid">
      {#each candidates as c}
        <TitleCard {roomId} {userId} candidate={c} watched={watchedIds.has(candidateKey(c))} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .mood-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .slider-row { display: flex; align-items: center; gap: 10px; }
  .label { font-family: var(--font-mono); font-size: 11px; color: var(--text-soft); flex: 1; }
  .readout { font-family: var(--font-mono); font-size: 12px; min-width: 80px; text-align: right; }
  .roll-btn {
    align-self: flex-start; background: var(--accent-freesia); color: var(--on-accent-freesia);
    border: none; font-family: var(--font-display); font-weight: 800; text-transform: uppercase;
    padding: 12px 24px; cursor: pointer; box-shadow: 5px 6px 0 0 #000;
  }
  .status { color: var(--text-soft); font-family: var(--font-body); font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
</style>
