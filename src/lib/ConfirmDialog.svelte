<script>
  import { confirmRequest } from '../engine/confirm.js';
</script>

{#if $confirmRequest}
  <div class="scrim" on:click={() => $confirmRequest.resolve(false)}></div>
  <div class="dialog" role="alertdialog" aria-modal="true">
    <p class="msg">{$confirmRequest.message}</p>
    <div class="row">
      <button class="btn cancel" on:click={() => $confirmRequest.resolve(false)}>{$confirmRequest.cancelLabel}</button>
      <button class="btn action" on:click={() => $confirmRequest.resolve(true)}>{$confirmRequest.actionLabel}</button>
    </div>
  </div>
{/if}

<style>
  .scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 90; }
  .dialog {
    position: fixed;
    left: 50%;
    bottom: calc(15vh + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    width: min(88vw, 380px);
    background: var(--surface);
    padding: 24px;
    z-index: 91;
    box-shadow: 5px 6px 0 0 #000;
  }
  .msg { font-family: var(--font-body); font-size: 15px; margin: 0 0 20px; }
  .row { display: flex; gap: 10px; justify-content: flex-end; }
  .btn {
    font-family: var(--font-display); font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.02em; border: none; padding: 12px 20px; cursor: pointer;
    box-shadow: 4px 5px 0 0 #000; font-size: 12px;
  }
  .btn.cancel { background: var(--surface-2); color: var(--text); }
  .btn.action { background: var(--accent-fruit-dove); color: var(--on-accent-fruit-dove); }
</style>
