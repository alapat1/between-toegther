<script>
  // Everything needed to get one other person into this space: the code,
  // a tappable link, the phone's native share sheet, and a QR code for
  // when you're sitting next to each other.
  import qrcode from 'qrcode-generator';
  import { toast } from '../engine/toast.js';
  export let code;

  $: link = `${location.origin}${location.pathname}#/r/${code}`;
  $: svg = (() => {
    const qr = qrcode(0, 'M');
    qr.addData(link);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  })();
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  let showQr = false;

  async function share() {
    try {
      await navigator.share({ title: 'between & together', text: 'come join me — open this link to join our space:', url: link });
    } catch (e) { /* user closed the sheet */ }
  }
  function copy() {
    navigator.clipboard?.writeText(link).then(
      () => toast('invite link copied', 'success'),
      () => toast(`your space code is ${code}`)
    );
  }
</script>

<div class="share">
  <p class="label">space code</p>
  <p class="code" aria-label={'space code ' + code.split('').join(' ')}>{code}</p>
  <div class="row">
    {#if canShare}<button class="primary" on:click={share}>share invite</button>{/if}
    <button class:primary={!canShare} on:click={copy}>copy link</button>
    <button on:click={() => (showQr = !showQr)} aria-expanded={showQr}>{showQr ? 'hide QR' : 'show QR'}</button>
  </div>
  {#if showQr}
    <div class="qr" role="img" aria-label="QR code for the invite link">{@html svg}</div>
    <p class="hint">they can scan this with their camera.</p>
  {/if}
</div>

<style>
  .share { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; width: 100%; }
  .label { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-soft); margin: 0; }
  .code { font-family: var(--font-mono); font-size: 40px; letter-spacing: 0.25em; margin: 0; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
  button { background: var(--surface-2); color: var(--text); border: none; padding: 12px 16px; font-family: var(--font-display); font-weight: 700; font-size: 13px; cursor: pointer; }
  button.primary { background: var(--accent-blue-atoll); color: var(--on-accent-blue-atoll); }
  .qr { background: #fff; padding: 8px; width: 200px; height: 200px; }
  .qr :global(svg) { width: 100%; height: 100%; display: block; }
  .hint { font-size: 12px; color: var(--text-soft); margin: 0; }
</style>
