<script>
  import { toasts } from '../engine/toast.js';
</script>

{#if $toasts.length}
  <div class="toast-stack" aria-live="polite">
    {#each $toasts as t (t.id)}
      <div class="toast {t.kind}">{t.message}</div>
    {/each}
  </div>
{/if}

<style>
  .toast-stack {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 100;
    width: min(92vw, 420px);
    pointer-events: none;
  }
  .toast {
    background: var(--surface-2);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 12px 16px;
    box-shadow: 5px 6px 0 0 #000;
    animation: toast-in 0.25s cubic-bezier(0.2, 1.1, 0.3, 1);
  }
  .toast.error { border-left: 3px solid var(--accent-fruit-dove); }
  .toast.success { border-left: 3px solid var(--accent-summer-green); }
  @keyframes toast-in {
    from { transform: translateY(12px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>
