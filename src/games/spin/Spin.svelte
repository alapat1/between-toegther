<script>
  // flows.md §2.3 — 3 continuous beats, no separate result screen: the wheel
  // recedes to a background chip during 'prompt' instead of leaving the screen.
  import PlateButton from '../../lib/PlateButton.svelte';
  import * as engine from './engine.js';
  import { sfx } from '../../engine/sound.js';
  import { fly } from 'svelte/transition';
  import { reducedMotion } from '../../engine/prefs.js';

  export let game;
  export let userId;
  export let partnerId;
  export let partnerName = 'your person';

  $: s = game.state;
  $: iAmSpinner = s.spinner_id === userId;
  let spinning = false;
  async function doSpin() {
    if (spinning) return;
    sfx('spin');
    spinning = true; // visible wheel beat before the result lands for both phones
    await new Promise((r) => setTimeout(r, 1300));
    await engine.spin(game);
    spinning = false;
  }
  $: otherUserId = s.spinner_id === userId ? partnerId : userId;
</script>

{#key s.phase + ":" + s.round}
<div class="spin" in:fly={{ y: $reducedMotion ? 0 : 14, duration: $reducedMotion ? 0 : 260 }}>
  <div class="meta">
    <span>{s.scores?.[userId] || 0} – {s.scores?.[partnerId] || 0}</span>
    <span>{s.round + 1}/{s.total_rounds}</span>
  </div>

  {#if s.phase === 'ended'}
    <p class="status" role="status">that's the wheel — recap coming next.</p>
  {:else if s.phase === 'spinning'}
    <div class="wheel-chip" class:spinning class:idle={!spinning}>🎡</div>
    {#if iAmSpinner}
      <PlateButton accent="var(--accent-blue-atoll)" onAccent="var(--on-accent-blue-atoll)" disabled={spinning} on:click={doSpin}>
        {spinning ? 'spinning…' : 'spin'}
      </PlateButton>
    {:else}
      <p class="status" role="status">{partnerName} is spinning…</p>
    {/if}
  {:else if s.phase === 'prompt'}
    <div class="wheel-chip small">🎡</div>
    <p class="prompt-card">{s.prompt}</p>
    {#if iAmSpinner}
      {#if !s.spinner_done}
        <div class="row">
          <PlateButton accent="var(--surface-2)" onAccent="var(--text-soft)" on:click={() => engine.skipPrompt(game, otherUserId)}>skip this one</PlateButton>
          <PlateButton accent="var(--accent-freesia)" onAccent="var(--on-accent-freesia)" on:click={() => engine.markSpinnerDone(game)}>
            i did it
          </PlateButton>
        </div>
      {:else}
        <p class="status" role="status">waiting on {partnerName}'s call…</p>
      {/if}
    {:else if s.spinner_done}
      <p class="status" role="status">did {partnerName} actually do it?</p>
      <div class="row">
        <PlateButton accent="var(--accent-fruit-dove)" onAccent="var(--on-accent-fruit-dove)" on:click={() => engine.judge(game, 'didnt', otherUserId)}>not quite</PlateButton>
        <PlateButton accent="var(--accent-summer-green)" onAccent="var(--on-accent-summer-green)" on:click={() => engine.judge(game, 'did', otherUserId)}>did it ✓</PlateButton>
      </div>
    {:else}
      <p class="status" role="status">{partnerName} is on it — you'll judge when they're done</p>
    {/if}
  {/if}
</div>
{/key}

<style>
  .spin { padding: 24px; display: flex; flex-direction: column; gap: 18px; align-items: center; text-align: center; min-height: 60vh; justify-content: center; }
  .meta {
    display: flex; justify-content: space-between; width: 100%;
    font-family: var(--font-mono); font-size: 11px; color: var(--text-soft);
  }
  .wheel-chip { font-size: 64px; }
  .wheel-chip.small { font-size: 32px; opacity: 0.6; }
  .prompt-card { background: var(--surface); padding: 24px; font-size: 18px; width: 100%; }
  .status { color: var(--text-soft); font-size: 14px; }
  .row { display: flex; gap: 12px; width: 100%; }
  .row > :global(.plate) { flex: 1; }
  .wheel-chip.spinning { animation: wheel-spin 0.45s linear infinite; }
  .wheel-chip.idle { animation: wheel-spin 9s linear infinite; }
  @keyframes wheel-spin { to { transform: rotate(360deg); } }
</style>
