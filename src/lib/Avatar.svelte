<script>
  import { parseAvatar, renderer, loadRenderer } from '../engine/avatar.js';
  loadRenderer();
  export let avatar = null;   // "db:lo:k3j9x2ab", legacy "🦊|2", or null
  export let id = '';         // fallback seed
  export let size = 28;
  $: a = parseAvatar(avatar, id);
  $: uri = a.kind === 'db' && $renderer ? $renderer.render(a.style, a.seed) : null;
</script>

{#if a.kind === 'db' && uri}
  <img class="avatar" src={uri} width={size} height={size} alt="" aria-hidden="true" draggable="false" />
{:else if a.kind === 'db'}
  <span class="avatar ph" style="width: {size}px; height: {size}px;" aria-hidden="true"></span>
{:else}
  <span class="avatar emoji" style="--size: {size}px; background: {a.bg}; color: {a.fg};" aria-hidden="true">{a.emoji}</span>
{/if}

<style>
  .ph { background: var(--surface-2); }
  .avatar { display: inline-block; flex: none; vertical-align: middle; user-select: none; }
  .emoji { display: inline-flex; align-items: center; justify-content: center; width: var(--size); height: var(--size); font-size: calc(var(--size) * 0.55); line-height: 1; }
</style>
