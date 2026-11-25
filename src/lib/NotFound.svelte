<script>
  export let onHome;
</script>

<div class="nf">
  <p class="big" aria-hidden="true">🧭</p>
  <h2>nothing here</h2>
  <p>that link doesn’t lead anywhere. it may be mistyped or out of date.</p>
  <button on:click={onHome}>back to start</button>
</div>

<style>
  .nf { padding: 48px 24px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
  .big { font-size: 48px; margin: 0; }
  h2 { font-family: var(--font-display); font-size: 26px; margin: 0; }
  p { color: var(--text-soft); margin: 0; line-height: 1.5; }
  button { margin-top: 8px; width: 100%; background: var(--accent-blue-atoll); color: var(--on-accent-blue-atoll); border: none; padding: 16px; font-family: var(--font-display); font-weight: 800; text-transform: uppercase; cursor: pointer; box-shadow: 5px 6px 0 0 #000; }
</style>
