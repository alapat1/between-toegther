<script>
  // First-time rules card for each game (and reopenable from the menu).
  import PlateButton from './PlateButton.svelte';
  export let type;      // 'wyr' | 'tod' | 'spin' | 'fs'
  export let mode = ''; // tod: 'self' | 'dealer'
  export let onClose;

  const RULES = {
    wyr: { title: 'would you rather', steps: ['you each secretly pick one of two options.', 'once you’ve both picked, the answers flip over — did you match or clash?', 'tap next round when you’re ready. there’s no clock.'] },
    tod: { title: 'truth or dare', steps: [
      'take turns. on your turn, someone picks truth or dare.',
      'do it (or answer it), then tap done. you can skip one you’d rather not do.',
      'for dares, the other person decides if it counts.'] },
    spin: { title: 'spin the wheel', steps: ['the spinner spins for a truth or dare prompt.', 'do it, then tap “i did it”. you can skip a prompt you don’t want.', 'the other person decides if it counts — a point if it does. then you swap.'] },
    fs: { title: 'finger smash', steps: ['tap ready together. a short countdown starts the round.', 'tap the big button as fast as you can for 30 seconds.', 'most taps wins the round. play a few rounds for the match.'] }
  };
  $: info = RULES[type] || RULES.wyr;
  $: extra = type === 'tod' ? (mode === 'dealer' ? 'in this game, you choose truth or dare for each other.' : 'in this game, you each choose your own.') : '';
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && onClose()} />

<div class="howto" role="dialog" aria-modal="true" aria-label={'how to play ' + info.title}>
  <div class="card">
    <p class="kicker">how to play</p>
    <h2>{info.title}</h2>
    <ol>
      {#each info.steps as step}<li>{step}</li>{/each}
    </ol>
    {#if extra}<p class="extra">{extra}</p>{/if}
    <PlateButton accent="var(--accent-blue-atoll)" onAccent="var(--on-accent-blue-atoll)" on:click={onClose}>got it</PlateButton>
  </div>
</div>

<style>
  .howto { position: fixed; inset: 0; z-index: 40; background: rgba(16, 13, 12, 0.92); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 14px; }
  .kicker { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-soft); margin: 0; }
  h2 { font-family: var(--font-display); font-size: 30px; margin: 0; }
  ol { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; color: var(--text); font-size: 16px; line-height: 1.45; }
  .extra { color: var(--accent-blue-atoll); font-size: 14px; margin: 0; }
</style>
