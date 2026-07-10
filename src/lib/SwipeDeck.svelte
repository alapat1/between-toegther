<script>
  // Swipe-to-match deck — each partner swipes privately, mutual likes
  // auto-land on "our list" (roadmap.md §Watchlist item 1).
  import { onMount } from 'svelte';
  import { buildDeck, TMDB_GENRE_CHIPS, ANIME_CHIP } from '../engine/screeningSources.js';
  import { swipe, fetchSwipedIds, candidateKey } from '../engine/screeningRoom.js';

  export let roomId;
  export let userId;
  export let partnerId;
  export let taste = null; // sr_taste_profiles row or null

  let deck = [];
  let idx = 0;
  let loading = true;
  let matchFlash = null;
  let activeChip = null;

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
    if (!current) return;
    const res = await swipe(roomId, userId, current, liked, partnerId);
    if (res.matched) {
      matchFlash = current.title;
      setTimeout(() => (matchFlash = null), 1800);
    }
    idx += 1;
  }
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
    <div class="stack">
      {#if current.posterUrl}
        <img class="poster" src={current.posterUrl} alt={current.title} />
      {:else}
        <div class="poster placeholder">{current.title}</div>
      {/if}
      <div class="overlay">
        <p class="deck-title">{current.title}</p>
        <p class="deck-sub">{current.mediaType}</p>
      </div>
    </div>
    <div class="row">
      <button class="swipe-btn pass" on:click={() => decide(false)}>pass</button>
      <button class="swipe-btn like" on:click={() => decide(true)}>like</button>
    </div>
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
  .stack { position: relative; width: 100%; max-width: 280px; }
  .poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; }
  .poster.placeholder {
    width: 100%; aspect-ratio: 2/3; background: var(--surface); display: flex; align-items: center;
    justify-content: center; text-align: center; padding: 20px; font-family: var(--font-body); font-size: 16px;
  }
  .overlay { position: absolute; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); padding: 10px 14px; }
  .deck-title { font-family: var(--font-display); font-weight: 700; font-size: 15px; }
  .deck-sub { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; color: var(--text-soft); }
  .row { display: flex; gap: 16px; }
  .swipe-btn {
    font-family: var(--font-display); font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em;
    border: none; padding: 14px 32px; cursor: pointer; box-shadow: 5px 6px 0 0 #000;
  }
  .swipe-btn.pass { background: var(--surface-2); color: var(--text); }
  .swipe-btn.like { background: var(--accent-fruit-dove); color: var(--on-accent-fruit-dove); }
  .attribution { font-family: var(--font-mono); font-size: 10px; color: var(--text-soft); margin-top: 8px; }
</style>
