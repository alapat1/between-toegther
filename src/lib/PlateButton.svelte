<script>
  // The base tactile atom for the whole system (design-bank.md §2 skeleton,
  // effects #1 "spark press"). Every button/card/plate in the app should be
  // built from this, not a one-off — that's what keeps "press travels into
  // a hard offset shadow" consistent everywhere instead of drifting per screen.
  export let accent = 'var(--accent-orange-pop)';
  export let onAccent = 'var(--on-accent-orange-pop)';
  export let disabled = false;

  let pressed = false;
</script>

<button
  class="plate"
  class:pressed
  {disabled}
  style="--accent: {accent}; --on-accent: {onAccent};"
  on:pointerdown={() => (pressed = true)}
  on:pointerup={() => (pressed = false)}
  on:pointerleave={() => (pressed = false)}
  on:click
>
  <slot />
</button>

<style>
  .plate {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--on-accent);
    background: var(--accent);
    border: none;
    border-radius: var(--radius);
    padding: 14px 22px;
    cursor: pointer;
    box-shadow: var(--plate-shadow-x) var(--plate-shadow-y) 0 0 #000;
    transform: translate(0, 0);
    transition: transform 90ms ease, box-shadow 90ms ease;
  }

  .plate.pressed {
    transform: translate(var(--plate-shadow-x), var(--plate-shadow-y));
    box-shadow: 0 0 0 0 #000;
  }

  .plate:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
