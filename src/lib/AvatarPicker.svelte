<script>
  // Pick a look: choose a style, then tap one of twelve variations — or shuffle for more.
  import { STYLES, randomSeed, formatAvatar, parseAvatar, renderer, loadRenderer } from '../engine/avatar.js';
  loadRenderer();
  import Avatar from './Avatar.svelte';
  export let value = null;      // "db:lo:k3j9x2ab"
  export let id = '';
  export let onChange = (v) => {};

  const fresh = (n) => Array.from({ length: n }, randomSeed);
  const cur0 = parseAvatar(value, id);
  let style = cur0.kind === 'db' ? cur0.style : 'lo';
  let seeds = cur0.kind === 'db' ? [cur0.seed, ...fresh(11)] : fresh(12);

  $: cur = parseAvatar(value, id);
  function choose(seed) { value = formatAvatar(style, seed); onChange(value); }
  function setStyle(s) {
    style = s;
    // keep the same person when switching style, so it's easy to compare
    const keep = cur.kind === 'db' ? cur.seed : seeds[0];
    seeds = [keep, ...fresh(11)];
    choose(keep);
  }
  function shuffle() { seeds = fresh(12); choose(seeds[0]); }
</script>

<div class="picker">
  <div class="preview"><Avatar avatar={value} {id} size={88} /></div>
  <div class="styles" role="tablist" aria-label="avatar style">
    {#each STYLES as s}
      <button type="button" role="tab" aria-selected={style === s.id} class:on={style === s.id} on:click={() => setStyle(s.id)}>{s.label}</button>
    {/each}
  </div>
  <div class="grid" role="group" aria-label="choose an avatar">
    {#each seeds as seed}
      <button type="button" class="cell" class:on={cur.kind === 'db' && cur.style === style && cur.seed === seed} aria-label={'avatar ' + seed} aria-pressed={cur.kind === 'db' && cur.style === style && cur.seed === seed} on:click={() => choose(seed)}>
        {#if $renderer}<img src={$renderer.render(style, seed)} alt="" draggable="false" />{:else}<span class="ph"></span>{/if}
      </button>
    {/each}
  </div>
  <button type="button" class="shuffle" on:click={shuffle}>🔀 shuffle</button>
</div>

<style>
  .picker { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; width: 100%; }
  .styles { display: flex; gap: 6px; flex-wrap: wrap; }
  .styles button { background: var(--surface); color: var(--text-soft); border: none; padding: 8px 12px; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; cursor: pointer; }
  .styles button.on { background: var(--surface-2); color: var(--text); box-shadow: inset 0 -3px 0 var(--accent-blue-atoll); }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 100%; }
  .cell { background: var(--surface); border: 3px solid transparent; padding: 0; cursor: pointer; line-height: 0; }
  .ph { display: block; aspect-ratio: 1; background: var(--surface-2); }
  .cell img { width: 100%; height: auto; display: block; }
  .cell.on { border-color: var(--text); }
  .shuffle { background: var(--surface-2); color: var(--text); border: none; padding: 10px 14px; font-family: var(--font-mono); font-size: 12px; text-transform: uppercase; cursor: pointer; }
</style>
