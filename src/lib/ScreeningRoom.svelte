<script>
  // Screening Room — top-level container: first-open taste quiz, then tabs
  // for deck / mood / boards. Feature name locked 2026-07-10 (see MEMORY.md);
  // app name stays "between & together".
  import { onMount } from 'svelte';
  import TasteQuiz from './TasteQuiz.svelte';
  import SwipeDeck from './SwipeDeck.svelte';
  import MoodSlider from './MoodSlider.svelte';
  import BoardsView from './BoardsView.svelte';
  import { getTasteProfile } from '../engine/screeningRoom.js';

  export let roomId;
  export let userId;
  export let partnerId;

  let taste = null;
  let showQuiz = false;
  let tab = 'deck'; // 'deck' | 'mood' | 'boards'
  let loading = true;

  onMount(async () => {
    taste = await getTasteProfile(roomId, userId);
    showQuiz = !taste; // first-open journey — skippable, re-accessible via "edit your taste"
    loading = false;
  });

  async function onQuizDone() {
    taste = await getTasteProfile(roomId, userId);
    showQuiz = false;
  }
</script>

<div class="screening-room">
  {#if loading}
    <p class="status">opening screening room…</p>
  {:else if showQuiz}
    <TasteQuiz {roomId} {userId} onDone={onQuizDone} />
  {:else}
    <div class="header">
      <span class="name">screening room</span>
      <button class="edit-taste" on:click={() => (showQuiz = true)}>edit your taste</button>
    </div>
    <div class="tabs">
      <button class="tab" class:on={tab === 'deck'} on:click={() => (tab = 'deck')}>deck</button>
      <button class="tab" class:on={tab === 'mood'} on:click={() => (tab = 'mood')}>mood</button>
      <button class="tab" class:on={tab === 'boards'} on:click={() => (tab = 'boards')}>boards</button>
    </div>

    {#if tab === 'deck'}
      <SwipeDeck {roomId} {userId} {partnerId} {taste} />
    {:else if tab === 'mood'}
      <MoodSlider {roomId} {userId} {taste} />
    {:else}
      <BoardsView {roomId} {userId} />
    {/if}
  {/if}
</div>

<style>
  .screening-room { display: flex; flex-direction: column; gap: 12px; }
  .status { padding: 24px; color: var(--text-soft); font-family: var(--font-body); }
  .header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 24px 0;
  }
  .name { font-family: var(--font-display); font-weight: 800; text-transform: uppercase; font-size: 15px; }
  .edit-taste { background: none; border: none; color: var(--text-soft); font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; cursor: pointer; }
  .tabs { display: flex; gap: 8px; padding: 0 24px; }
  .tab { background: var(--surface); border: none; color: var(--text-soft); font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; padding: 8px 16px; cursor: pointer; }
  .tab.on { background: var(--accent-orange-pop); color: var(--on-accent-orange-pop); }
</style>
