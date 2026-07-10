<script>
  // flows.md §2.1 — reaction-first judging, judge closes every dare round
  // with one explicit tap. Reaction set = 4 Clash-Royale-style emotes
  // (locked 2026-07-09): DYING, CAUGHT, RESPECT, MERCY.
  import PlateButton from '../../lib/PlateButton.svelte';
  import * as engine from './engine.js';

  export let game;
  export let userId;
  export let partnerId;

  const REACTIONS = [
    { key: 'dying', label: '😂 dying' },
    { key: 'caught', label: '😳 caught' },
    { key: 'respect', label: '🔥 respect' },
    { key: 'mercy', label: '😬 mercy' }
  ];

  $: s = game.state;
  $: iAmChooser = s.chooser === userId;
  $: iAmCurrentTurn = s.currentTurn === userId;

  let firedReactions = [];
  function fireReaction(key) {
    firedReactions = [...firedReactions, key];
    setTimeout(() => { firedReactions = firedReactions.slice(1); }, 1500);
  }
</script>

<div class="tod">
  <div class="meta">
    <span>{s.theme}</span>
    <span>{s.round + 1}/{s.totalRounds}</span>
  </div>

  {#if s.phase === 'end'}
    <p class="status">that's the game — recap coming next.</p>
  {:else if s.phase === 'chooser_picks'}
    {#if iAmChooser}
      <p class="prompt-hint">pick for them</p>
      <div class="row">
        <PlateButton accent="var(--accent-summer-green)" onAccent="var(--on-accent-summer-green)" on:click={() => engine.pickChoice(game, 'truth')}>truth</PlateButton>
        <PlateButton accent="var(--accent-fruit-dove)" onAccent="var(--on-accent-fruit-dove)" on:click={() => engine.pickChoice(game, 'dare')}>dare</PlateButton>
      </div>
    {:else}
      <p class="status">they're picking for you…</p>
    {/if}
  {:else if s.phase === 'prompt_active'}
    <div class="plate-stack">
      <p class="prompt-card">{s.prompt}</p>
    </div>
    {#if iAmCurrentTurn}
      <div class="row">
        <PlateButton accent="var(--surface-2)" onAccent="var(--text-soft)" on:click={() => engine.skip(game, userId)}>skip</PlateButton>
        <PlateButton accent="var(--accent-freesia)" onAccent="var(--on-accent-freesia)" on:click={() => engine.done(game, userId)}>done ✓</PlateButton>
      </div>
    {:else}
      <p class="status">waiting for them to finish…</p>
      <div class="reactions">
        {#each REACTIONS as r}
          <button class="reaction-btn" on:click={() => fireReaction(r.key)}>{r.label}</button>
        {/each}
      </div>
      <div class="fired">
        {#each firedReactions as f}<span class="floating">{f}</span>{/each}
      </div>
    {/if}
  {:else if s.phase === 'judging'}
    <p class="prompt-card dim">{s.prompt}</p>
    {#if iAmChooser}
      <p class="status">did they actually do it?</p>
      <div class="row">
        <PlateButton accent="var(--accent-fruit-dove)" onAccent="var(--on-accent-fruit-dove)" on:click={() => engine.judgeConfirm(game, false)}>NOPE stamp</PlateButton>
        <PlateButton accent="var(--accent-summer-green)" onAccent="var(--on-accent-summer-green)" on:click={() => engine.judgeConfirm(game, true)}>confirm</PlateButton>
      </div>
    {:else}
      <p class="status">waiting on the judge's call…</p>
    {/if}
  {/if}
</div>

<style>
  .tod { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .meta {
    display: flex; justify-content: space-between;
    font-family: var(--font-mono); font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--text-soft);
  }
  .row { display: flex; gap: 12px; }
  .plate-stack { position: relative; }
  .prompt-card {
    background: var(--surface);
    padding: 24px;
    font-family: var(--font-body);
    font-size: 18px;
  }
  .prompt-card.dim { opacity: 0.6; font-size: 15px; }
  .status { color: var(--text-soft); font-size: 14px; }
  .prompt-hint { color: var(--text-soft); font-size: 13px; }
  .reactions { display: flex; gap: 8px; flex-wrap: wrap; }
  .reaction-btn {
    background: var(--surface);
    border: none;
    color: var(--text);
    font-size: 13px;
    padding: 8px 12px;
    cursor: pointer;
  }
  .fired { display: flex; gap: 6px; min-height: 20px; }
  .floating { font-size: 12px; color: var(--accent-freesia); animation: float-up 1.5s ease forwards; }
  @keyframes float-up {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(-24px); opacity: 0; }
  }
</style>
