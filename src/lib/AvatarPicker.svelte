<script>
  import { EMOJIS, COLORS, formatAvatar, parseAvatar } from '../engine/avatar.js';
  import Avatar from './Avatar.svelte';
  export let value = null;      // "🦊|2"
  export let id = '';
  export let onChange = (v) => {};

  $: cur = parseAvatar(value, id);
  function pick(e, c) { value = formatAvatar(e, c); onChange(value); }
</script>

<div class="picker">
  <div class="preview"><Avatar avatar={value} {id} size={64} /></div>
  <div class="grid" role="group" aria-label="choose an emoji">
    {#each EMOJIS as e, i}
      <button type="button" class="cell" class:on={cur.emojiIdx === i} aria-pressed={cur.emojiIdx === i} aria-label={e} on:click={() => pick(i, cur.colorIdx)}>{e}</button>
    {/each}
  </div>
  <div class="colors" role="group" aria-label="choose a colour">
    {#each COLORS as c, i}
      <button type="button" class="swatch" class:on={cur.colorIdx === i} aria-pressed={cur.colorIdx === i} aria-label={'colour ' + (i + 1)} style="background: {c.bg}" on:click={() => pick(cur.emojiIdx, i)}></button>
    {/each}
  </div>
</div>

<style>
  .picker { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; width: 100%; }
  .preview { display: flex; }
  .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; width: 100%; }
  .cell { background: var(--surface); border: 2px solid transparent; font-size: 22px; padding: 8px 0; cursor: pointer; }
  .cell.on { border-color: var(--accent-blue-atoll); }
  .colors { display: flex; gap: 10px; }
  .swatch { width: 28px; height: 28px; border: 2px solid transparent; cursor: pointer; }
  .swatch.on { border-color: var(--text); }
</style>
