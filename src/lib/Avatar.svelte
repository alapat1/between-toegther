<script>
  import { parseAvatar } from '../engine/avatar.js';
  export let avatar = null;   // "🦊|2" or null
  export let id = '';         // fallback seed
  export let size = 28;
  $: a = parseAvatar(avatar, id);
</script>

<span class="avatar" style="--size: {size}px; background: {a.bg}; color: {a.fg};" aria-hidden="true">{a.emoji}</span>

<style>
  .avatar {
    display: inline-flex; align-items: center; justify-content: center; flex: none;
    width: var(--size); height: var(--size); font-size: calc(var(--size) * 0.55);
    line-height: 1; user-select: none;
  }
</style>
