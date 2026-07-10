<script>
  // flows.md §2.3 — 3 continuous beats, no separate result screen: the wheel
  // recedes to a background chip during 'prompt' instead of leaving the screen.
  import PlateButton from '../../lib/PlateButton.svelte';
  import * as engine from './engine.js';

  export let game;
  export let userId;
  export let partnerId;

  $: s = game.state;
  $: iAmSpinner = s.spinner_id === userId;
  $: otherUserId = s.spinner_id === userId ? partnerId : userId;
</script>

<div class="spin">
  <div class="meta">
    <span>{s.scores?.[userId] || 0} – {s.scores?.[partnerId] || 0}</span>
    <span>{s.round + 1}/{s.total_rounds}</span>
  </div>

  {#if s.phase === 'ended'}
    <p class="status">that's the wheel — recap coming next.</p>
  {:else if s.phase === 'spinning'}
    <div class="wheel-chip">🎡</div>
    {#if iAmSpinner}
      <PlateButton accent="var(--accent-blue-atoll)" onAccent="var(--on-accent-blue-atoll)" on:click={() => engine.spin(game)}>
        spin
      </PlateButton>
    {:else}
      <p class="status">they're spinning…</p>
    {/if}
  {:else if s.phase === 'prompt'}
    <div class="wheel-chip small">🎡</div>
    <p class="prompt-card">{s.prompt}</p>
    {#if iAmSpinner}
      {#if !s.spinner_done}
        <PlateButton accent="var(--accent-freesia)" onAccent="var(--on-accent-freesia)" on:click={() => engine.markSpinnerDone(game)}>
          i did it
        </PlateButton>
      {:else}
        <p class="status">waiting on their call…</p>
      {/if}
    {:else if s.spinner_done}
      <div class="row">
        <PlateButton accent="var(--accent-fruit-dove)" onAccent="var(--on-accent-fruit-dove)" on:click={() => engine.judge(game, 'didnt', otherUserId)}>didn't</PlateButton>
        <PlateButton accent="var(--accent-summer-green)" onAccent="var(--on-accent-summer-green)" on:click={() => engine.judge(game, 'did', otherUserId)}>did it ✓</PlateButton>
      </div>
    {:else}
      <p class="status">watching them go…</p>
    {/if}
  {/if}
</div>

<style>
  .spin { padding: 24px; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
  .meta {
    display: flex; justify-content: space-between; width: 100%;
    font-family: var(--font-mono); font-size: 11px; color: var(--text-soft);
  }
  .wheel-chip { font-size: 64px; }
  .wheel-chip.small { font-size: 32px; opacity: 0.6; }
  .prompt-card { background: var(--surface); padding: 24px; font-size: 18px; width: 100%; }
  .status { color: var(--text-soft); font-size: 14px; }
  .row { display: flex; gap: 12px; }
</style>
