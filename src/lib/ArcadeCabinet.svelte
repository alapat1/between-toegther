<script>
  // flows.md §2.8 — every game's setup screen. Rounds dialer + optional heat
  // dial. Since the 2026-07-10 rethink, whoever configures this and taps
  // the button is sending an invite, not starting the game outright — the
  // other partner accepts or declines (see Room.svelte's invite flow).
  // Still presence-gated: no point inviting an empty room.
  import PlateButton from './PlateButton.svelte';

  export let title;
  export let accent = 'var(--accent-orange-pop)';
  export let onAccent = 'var(--on-accent-orange-pop)';
  export let roundPresets = [6, 12, 20];
  export let showHeatDial = false;
  export let partnerPresent = false;
  export let onStart; // (rounds, heat) => void — sends an invite, doesn't start directly

  let rounds = roundPresets[1] ?? roundPresets[0];
  let heat = 1; // 0=casual .. 3=unfiltered
  const heatLabels = ['casual', 'playful', 'romantic', 'unfiltered'];
  let sent = false;

  function sendInvite() {
    sent = true;
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
      <label class="dial-label" for="heat">heat</label>
      <input id="heat" type="range" min="0" max="3" step="1" bind:value={heat} />
      <span class="dial-readout">{heatLabels[heat]}</span>
    </div>
  {/if}

  <div class="ready-lights">
    <span class="light" class:on={sent}></span>
    <span class="light" class:on={partnerPresent}></span>
  </div>

  <PlateButton accent={partnerPresent ? accent : 'var(--surface-2)'} onAccent={partnerPresent ? onAccent : 'var(--text-soft)'} disabled={!partnerPresent} on:click={sendInvite}>
    {partnerPresent ? 'invite them' : "waiting for partner…"}
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
