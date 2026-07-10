<script>
  import { onMount, onDestroy } from 'svelte';
  import PlateButton from '../../lib/PlateButton.svelte';
  import * as engine from './engine.js';

  export let game;
  export let userId;
  export let partnerId;

  $: s = game.state;
  $: iAmReady = !!(s.readyTaps || {})[userId];
  $: partnerReady = !!(s.readyTaps || {})[partnerId];

  let localTaps = 0;
  let unflushed = 0;
  let countdownMs = null;
  let roundMs = null;
  let flushTimer = null;
  let tickTimer = null;
  let transitioning = false;
  let ending = false;

  function tick() {
    if (s.phase === 'countdown') {
      countdownMs = engine.msUntilPlay(s);
      if (countdownMs <= 0 && !transitioning) {
        transitioning = true;
        engine.beginPlaying(game).finally(() => { transitioning = false; });
      }
    } else if (s.phase === 'playing') {
      roundMs = engine.msLeftInRound(s);
      if (roundMs !== null && roundMs <= 0 && !ending) {
        ending = true;
        engine.endRound(game).finally(() => { ending = false; });
      }
    }
  }

  function handleTap() {
    localTaps += 1;
    unflushed += 1;
  }

  onMount(() => {
    tickTimer = setInterval(tick, 100);
    flushTimer = setInterval(() => {
      if (unflushed > 0) {
        const n = unflushed;
        unflushed = 0;
        engine.flushTaps(game, userId, n);
      }
    }, 250);
  });
  onDestroy(() => {
    clearInterval(tickTimer);
    clearInterval(flushTimer);
  });
</script>

<div class="fs">
  <div class="meta">
    <span>{(s.scores?.[userId] || 0)} – {(s.scores?.[partnerId] || 0)}</span>
    <span>{s.round + 1}/{s.totalRounds}</span>
  </div>

  {#if s.phase === 'ended'}
    <p class="status">match over — recap coming next.</p>
  {:else if s.phase === 'ready_gate'}
    <p class="status">tap when you're ready — round only starts once you both are.</p>
    <PlateButton accent={iAmReady ? 'var(--surface-2)' : 'var(--accent-blue-atoll)'} onAccent="var(--on-accent-blue-atoll)" disabled={iAmReady} on:click={() => engine.tapReady(game, userId, partnerId)}>
      {iAmReady ? 'waiting on them…' : "i'm ready"}
    </PlateButton>
    <div class="lights"><span class="light" class:on={iAmReady}></span><span class="light" class:on={partnerReady}></span></div>
  {:else if s.phase === 'countdown'}
    <p class="countdown">{countdownMs !== null && countdownMs > 0 ? Math.ceil(countdownMs / 1000) : 'go!'}</p>
  {:else}
    <button class="arena" on:pointerdown={handleTap}>
      <span class="combo">{localTaps}</span>
      <span class="timer">{roundMs !== null ? Math.max(0, Math.ceil(roundMs / 1000)) : ''}s</span>
    </button>
  {/if}
</div>

<style>
  .fs { padding: 24px; display: flex; flex-direction: column; gap: 16px; align-items: center; }
  .meta {
    display: flex; justify-content: space-between; width: 100%;
    font-family: var(--font-mono); font-size: 11px; color: var(--text-soft);
  }
  .status { color: var(--text-soft); font-size: 14px; }
  .lights { display: flex; gap: 8px; }
  .light { width: 10px; height: 10px; border-radius: 50%; background: var(--surface-2); }
  .light.on { background: var(--accent-summer-green); }
  .countdown { font-family: var(--font-display); font-size: 64px; font-weight: 800; }
  .arena {
    width: 100%;
    aspect-ratio: 1;
    background: var(--surface);
    border: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
  }
  .combo { font-family: var(--font-display); font-size: 48px; font-weight: 800; color: var(--accent-blue-atoll); }
  .timer { font-family: var(--font-mono); font-size: 13px; color: var(--text-soft); }
</style>
