<script>
  // flows.md §2.5 — orbit hub arrangement. Simplified to a row for this pass
  // (no orbit physics yet); picking a game opens its ArcadeCabinet.
  import ArcadeCabinet from './ArcadeCabinet.svelte';

  export let partnerPresent;
  export let roomCode = '';
  export let onCopyInvite = () => {};
  export let onStartWYR;   // (rounds) => void — actually sends an invite now, see Room.svelte
  export let onStartTOD;   // (rounds, theme) => void
  export let onStartSpin;  // (rounds) => void
  export let onStartFS;    // (rounds) => void
  export let onOpenScreeningRoom; // () => void — no ArcadeCabinet, opens directly

  // No host/joiner split (2026-07-10 rethink) — either partner can propose
  // any game; Room.svelte turns the "start" call into an invite the other
  // partner accepts or declines, rather than starting it immediately.
  let picked = null; // 'wyr' | 'tod' | 'spin' | 'fs' | null
</script>

<div class="lobby">
  {#if !partnerPresent}
    <div class="solo-card">
      <p class="solo-title">it's just you here so far</p>
      <p class="solo-sub">this space comes alive when they join — send them the code.</p>
      <div class="solo-row">
        <span class="solo-code">{roomCode}</span>
        <button class="solo-copy" on:click={onCopyInvite}>copy invite link</button>
      </div>
    </div>
  {/if}
  {#if !picked}
    <p class="hint">tonight, what are we playing?</p>
    <div class="hub">
      <button class="orbit-tile" style="--tile-accent: var(--accent-blue-atoll);" on:click={() => (picked = 'wyr')}>would you rather</button>
      <button class="orbit-tile" style="--tile-accent: var(--accent-fruit-dove);" on:click={() => (picked = 'tod')}>truth or dare</button>
      <button class="orbit-tile" style="--tile-accent: var(--accent-freesia);" on:click={() => (picked = 'spin')}>spin</button>
      <button class="orbit-tile" style="--tile-accent: var(--accent-orange-pop);" on:click={() => (picked = 'fs')}>finger smash</button>
      <button class="orbit-tile wide" style="--tile-accent: var(--accent-summer-green);" on:click={onOpenScreeningRoom}>screening room</button>
    </div>
  {:else if picked === 'wyr'}
    <ArcadeCabinet title="would you rather" accent="var(--accent-blue-atoll)" onAccent="var(--on-accent-blue-atoll)" roundPresets={[5, 10, 20]} {partnerPresent} onStart={(rounds) => onStartWYR(rounds)} />
  {:else if picked === 'tod'}
    <ArcadeCabinet title="truth or dare" accent="var(--accent-fruit-dove)" onAccent="var(--on-accent-fruit-dove)" roundPresets={[6, 12, 20]} showHeatDial {partnerPresent} onStart={(rounds, heat) => onStartTOD(rounds, heat)} />
  {:else if picked === 'spin'}
    <ArcadeCabinet title="spin" accent="var(--accent-freesia)" onAccent="var(--on-accent-freesia)" roundPresets={[6, 10, 16]} {partnerPresent} onStart={(rounds) => onStartSpin(rounds)} />
  {:else if picked === 'fs'}
    <ArcadeCabinet title="finger smash" accent="var(--accent-orange-pop)" onAccent="var(--on-accent-orange-pop)" roundPresets={[3, 5, 9]} {partnerPresent} onStart={(rounds) => onStartFS(rounds)} />
  {/if}
</div>

<style>
  .lobby { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .hint { color: var(--text-soft); font-size: 14px; }
  .hub { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .orbit-tile {
    background: var(--surface);
    border: none;
    border-left: 3px solid var(--tile-accent);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 14px;
    padding: 20px 14px;
    text-align: left;
    cursor: pointer;
  }
  .orbit-tile.wide { grid-column: 1 / -1; }
  .solo-card { background: var(--surface); padding: 20px; display: flex; flex-direction: column; gap: 10px; }
  .solo-title { font-family: var(--font-display); font-weight: 700; font-size: 15px; }
  .solo-sub { color: var(--text-soft); font-size: 13px; }
  .solo-row { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
  .solo-code { font-family: var(--font-mono); font-size: 20px; letter-spacing: 0.2em; }
  .solo-copy {
    background: var(--accent-blue-atoll); color: var(--on-accent-blue-atoll);
    border: none; font-family: var(--font-display); font-weight: 700;
    text-transform: uppercase; font-size: 11px; padding: 10px 14px;
    cursor: pointer; box-shadow: 4px 5px 0 0 #000;
  }
</style>
