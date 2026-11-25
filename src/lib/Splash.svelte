<script>
  // Branded loading screen (shown while we check for an existing session).
  // Two shapes drift together — "between" becoming "together".
</script>

<div class="splash" role="status" aria-label="loading between and together">
  <div class="mark" aria-hidden="true">
    <span class="a"></span><span class="b"></span>
  </div>
  <p class="word">between &amp; together</p>
  <p class="tag">a space for two</p>
</div>

<style>
  .splash { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: var(--bg); }
  .mark { position: relative; width: 88px; height: 56px; }
  .mark span { position: absolute; top: 0; width: 56px; height: 56px; border-radius: 50%; mix-blend-mode: screen; }
  .a { background: var(--accent-blue-atoll); left: 0; animation: meet-a 1.6s ease-in-out infinite alternate; }
  .b { background: var(--accent-fruit-dove); right: 0; animation: meet-b 1.6s ease-in-out infinite alternate; }
  @keyframes meet-a { from { transform: translateX(-10px); } to { transform: translateX(10px); } }
  @keyframes meet-b { from { transform: translateX(10px); } to { transform: translateX(-10px); } }
  .word { font-family: var(--font-display); font-weight: 800; font-size: 20px; margin: 10px 0 0; }
  .tag { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-soft); margin: 0; }
  :global(body.reduced-motion) .mark span { animation: none; }
</style>
