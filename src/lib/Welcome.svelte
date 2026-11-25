<script>
  // First-run introduction: three short cards, skippable, shown once per device.
  import PlateButton from './PlateButton.svelte';
  export let onDone;

  const cards = [
    { icon: '🫶', title: 'a space for two', body: 'open a private space and share its code with one person. it’s only ever the two of you.' },
    { icon: '🎲', title: 'play together, live', body: 'would you rather, truth or dare, spin the wheel, finger smash. pick one, invite them, and play at the same time.' },
    { icon: '🔑', title: 'no sign-up needed', body: 'we keep you signed in on this device. keep your space code handy — it’s how you get back in on a new phone.' }
  ];
  let i = 0;
  $: last = i === cards.length - 1;
  function next() { last ? onDone() : (i += 1); }
</script>

<div class="welcome">
  <button class="skip" on:click={onDone}>skip</button>
  <div class="card" aria-live="polite">
    <div class="icon" aria-hidden="true">{cards[i].icon}</div>
    <h2>{cards[i].title}</h2>
    <p>{cards[i].body}</p>
  </div>
  <div class="dots" aria-hidden="true">
    {#each cards as _, n}<span class="dot" class:on={n === i}></span>{/each}
  </div>
  <PlateButton accent="var(--accent-blue-atoll)" onAccent="var(--on-accent-blue-atoll)" on:click={next}>
    {last ? 'get started' : 'next'}
  </PlateButton>
</div>

<style>
  .welcome { padding: 20px 24px 32px; display: flex; flex-direction: column; gap: 22px; align-items: stretch; min-height: 70vh; }
  .skip { align-self: flex-end; background: none; border: none; color: var(--text-soft); font-family: var(--font-mono); font-size: 12px; text-transform: uppercase; cursor: pointer; padding: 8px 0; }
  .card { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 12px; animation: rise 0.35s ease-out; }
  .icon { font-size: 56px; }
  h2 { font-family: var(--font-display); font-size: 28px; margin: 0; line-height: 1.1; }
  p { color: var(--text-soft); font-size: 16px; line-height: 1.5; margin: 0; }
  .dots { display: flex; gap: 8px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--surface-2); }
  .dot.on { background: var(--accent-blue-atoll); }
  @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  :global(body.reduced-motion) .card { animation: none; }
</style>
