<script>
  // flows.md §2.8 — every game's setup screen. Rounds dialer + optional heat
  // dial (host-owned single needle per this session's 2026-07-09 decision,
  // no vote) + presence-gated START (no holds — both players just need to be
  // on the screen).
  import PlateButton from './PlateButton.svelte';

  export let title;
  export let accent = 'var(--accent-orange-pop)';
  export let onAccent = 'var(--on-accent-orange-pop)';
  export let roundPresets = [6, 12, 20];
  export let showHeatDial = false;
  export let partnerPresent = false;
  export let onStart; // (rounds, heat) => void

  let rounds = roundPresets[1] ?? roundPresets[0];
  let heat = 1; // 0=casual .. 3=unfiltered
  const heatLabels = ['casual', 'playful', 'romantic', 'unfiltered'];
  let iAmReady = false;

  function readyUp() {
    iAmReady = true;
    if (partnerPresent) onStart(rounds, heatLabels[heat]);
  }
</script>

<div class="cabinet" style="--cab-accent: {accent}; --cab-on-accent: {onAccent};">
  <div class="marquee">{title}</div>

  <div class="dial-row">
    <label class="dial-label" for="rounds">rounds</label>
    <input id="rounds" type="range" min={roundPresets[0]} max={roundPresets[roundPresets.length - 1]} step="1" bind:value={rounds} />
    <span class="dial-readout">{rounds}</span>
  </div>

  {#if showHeatDial}
    <div class="dial-row">
      <label class="dial-label" for="heat">heat (yours — partner's is a readout only)</label>
      <input id="heat" type="range" min="0" max="3" step="1" bind:value={heat} />
      <span class="dial-readout">{heatLabels[heat]}</span>
    </div>
  {/if}

  <div class="ready-lights">
    <span class="light" class:on={iAmReady}></span>
    <span class="light" class:on={partnerPresent}></span>
  </div>

  <PlateButton accent={partnerPresent ? accent : 'var(--surface-2)'} onAccent={partnerPresent ? onAccent : 'var(--text-soft)'} disabled={!partnerPresent} on:click={readyUp}>
    {partnerPresent ? 'start' : "waiting for partner…"}
  </PlateButton>
</div>

<style>
  .cabinet {
    border: 2px solid var(--cab-accent);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .marquee {
    font-family: var(--font-display);
    font-weight: 800;
    text-transform: uppercase;
    font-size: 18px;
    color: var(--cab-accent);
    /* midground plate the dials overlap below (D1) */
    margin-bottom: -6px;
  }
  .dial-row { display: flex; align-items: center; gap: 10px; }
  .dial-label { font-family: var(--font-mono); font-size: 11px; color: var(--text-soft); flex: 1; }
  .dial-readout { font-family: var(--font-mono); font-size: 12px; min-width: 60px; text-align: right; }
  .ready-lights { display: flex; gap: 8px; }
  .light { width: 10px; height: 10px; border-radius: 50%; background: var(--surface-2); }
  .light.on { background: var(--accent-summer-green); }
</style>
