<script>
  import { onMount, onDestroy } from 'svelte';
  import PlateButton from '../../lib/PlateButton.svelte';
  import { buzz } from '../../engine/prefs.js';
  import * as engine from './engine.js';

  export let game;
  export let userId;
  export let partnerId;

  $: s = game.state;
  $: iAmReady = !!(s.readyTaps || {})[userId];
  $: partnerReady = !!(s.readyTaps || {})[partnerId];
  $: partnerLiveTaps = (s.taps || {})[partnerId] || 0;

  let localTaps = 0;
  let unflushed = 0;
  let countdownMs = null;
  let roundMs = null;
  let flushTimer = null;
  let tickTimer = null;
  let transitioning = false;
  let ending = false;
  let lastRound = -1;

  // New round: the combo counter starts fresh (it used to carry the whole
  // previous round's count into the next one).
  $: if (s.round !== lastRound) {
    lastRound = s.round;
    localTaps = 0;
    unflushed = 0;
  }

  $: timerPct = roundMs !== null ? Math.max(0, Math.min(100, (roundMs / engine.ROUND_DURATION_MS) * 100)) : 100;

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
    <span>{(s.scores?.[userId] || 0)} – {(s.scores?.[partnerId] || 0)} <em class="meta-note">taps banked</em></span>
    <span>{s.round + 1}/{s.totalRounds}</span>
  </div>

  {#if s.phase === 'ended'}
    <p class="status">match over.</p>
  {:else if s.phase === 'ready_gate'}
    <p class="status">tap when you're ready — round only starts once you both are.</p>
    <PlateButton accent={iAmReady ? 'var(--surface-2)' : 'var(--accent-blue-atoll)'} onAccent="var(--on-accent-blue-atoll)" disabled={iAmReady} on:click={() => { buzz(); engine.tapReady(game, userId, partnerId); }}>
      {iAmReady ? 'waiting on them…' : "i'm ready"}
    </PlateButton>
    <div class="lights"><span class="light" class:on={iAmReady}></span><span class="light" class:on={partnerReady}></span></div>
  {:else if s.phase === 'countdown'}
    <p class="get-ready">get your finger ready</p>
    <p class="countdown">{countdownMs !== null && countdownMs > 0 ? Math.ceil(countdownMs / 1000) : 'go!'}</p>
  {:else}
    <div class="timer-track"><div class="timer-fill" style="width: {timerPct}%"></div></div>

    <button class="arena" on:pointerdown={handleTap}>
      {#if localTaps === 0}
        <span class="smash-hint">SMASH!</span>
        <span class="smash-sub">tap as fast as you can</span>
      {:else}
        {#key localTaps}
          <span class="combo">{localTaps}</span>
        {/key}
        <span class="smash-sub">keep going</span>
      {/if}
    </button>

    <div class="live-row">
      <span class="live-cell you">you · {localTaps}</span>
      <span class="live-time">{roundMs !== null ? Math.max(0, Math.ceil(roundMs / 1000)) : ''}s</span>
      <span class="live-cell them">them · {partnerLiveTaps}</span>
    </div>
  {/if}
</div>

<style>
  .fs { padding: 24px; display: flex; flex-direction: column; gap: 14px; align-items: center; }
  .meta {
    display: flex; justify-content: space-between; width: 100%;
    font-family: var(--font-mono); font-size: 11px; color: var(--text-soft);
  }
  .meta-note { font-style: normal; opacity: 0.7; }
  .status { color: var(--text-soft); font-size: 14px; }
  .lights { display: flex; gap: 8px; }
  .light { width: 10px; height: 10px; border-radius: 50%; background: var(--surface-2); }
  .light.on { background: var(--accent-summer-green); }
  .get-ready { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-soft); }
  .countdown { font-family: var(--font-display); font-size: 72px; font-weight: 800; color: var(--accent-blue-atoll); }

  .timer-track { width: 100%; height: 6px; background: var(--surface); }
  .timer-fill { height: 100%; background: var(--accent-blue-atoll); transition: width 0.1s linear; }

  .arena {
    width: 100%;
    aspect-ratio: 1;
    background: var(--surface);
    border: 2px solid var(--accent-blue-atoll);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    color: var(--text);
  }
  .arena:active { background: var(--surface-2); }
  .smash-hint {
    font-family: var(--font-display); font-size: 44px; font-weight: 800;
    color: var(--accent-blue-atoll); letter-spacing: 0.04em;
  }
  .smash-sub { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; color: var(--text-soft); }
  .combo {
    font-family: var(--font-display); font-size: 72px; font-weight: 800;
    color: var(--accent-blue-atoll);
    animation: combo-pop 0.15s ease-out;
  }
  @keyframes combo-pop {
    from { transform: scale(1.18); }
    to { transform: scale(1); }
  }

  .live-row {
    display: flex; justify-content: space-between; align-items: center; width: 100%;
    font-family: var(--font-mono); font-size: 12px;
  }
  .live-cell { background: var(--surface); padding: 8px 12px; }
  .live-cell.you { color: var(--accent-blue-atoll); }
  .live-cell.them { color: var(--accent-fruit-dove); }
  .live-time { color: var(--text-soft); font-size: 13px; }
</style>
