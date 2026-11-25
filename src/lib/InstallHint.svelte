<script>
  // Gentle "add to home screen" nudge: native prompt on Android/Chrome,
  // step-by-step on iPhone, nothing when already installed or dismissed.
  import { installPrompt, isStandalone, isIos } from '../engine/connection.js';
  let dismissed = false;
  try { dismissed = localStorage.getItem('bt-install-dismissed') === '1'; } catch (e) { /* ignore */ }
  const ios = isIos();
  const show = () => !dismissed && !isStandalone() && ($installPrompt || ios);

  function dismiss() {
    dismissed = true;
    try { localStorage.setItem('bt-install-dismissed', '1'); } catch (e) { /* ignore */ }
  }
  async function install() {
    const p = $installPrompt;
    if (!p) return;
    p.prompt();
    await p.userChoice.catch(() => {});
    installPrompt.set(null);
  }
</script>

{#if show()}
  <div class="hint">
    <div>
      <p class="t">keep us on your home screen</p>
      {#if $installPrompt}
        <p class="s">opens full-screen, like an app.</p>
      {:else}
        <p class="s">tap the share button, then “add to home screen”.</p>
      {/if}
    </div>
    <div class="btns">
      {#if $installPrompt}<button class="go" on:click={install}>install</button>{/if}
      <button class="x" on:click={dismiss} aria-label="dismiss">not now</button>
    </div>
  </div>
{/if}

<style>
  .hint { margin: 16px 24px 0; background: var(--surface); padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .t { font-family: var(--font-display); font-weight: 700; font-size: 14px; margin: 0; }
  .s { color: var(--text-soft); font-size: 12px; margin: 2px 0 0; }
  .btns { display: flex; gap: 6px; }
  button { border: none; padding: 10px 12px; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; cursor: pointer; white-space: nowrap; }
  .go { background: var(--accent-blue-atoll); color: var(--on-accent-blue-atoll); }
  .x { background: none; color: var(--text-soft); }
</style>
