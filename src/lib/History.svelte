<script>
  // Past games in this space, newest first.
  import { onMount } from 'svelte';
  import { sb } from '../engine/supabase.js';
  import { summarizeGame } from '../engine/summary.js';
  export let roomId;
  export let userId;
  export let partnerId;
  export let partnerName = 'your person';
  export let onClose;

  let rows = null; // null = loading
  let failed = false;

  onMount(async () => {
    const { data, error } = await sb
      .from('game_sessions')
      .select('id, game_type, phase, state, created_at, ended_at')
      .eq('room_id', roomId)
      .not('ended_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) { failed = true; rows = []; return; }
    rows = data || [];
  });

  function when(ts) {
    const d = new Date(ts);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && onClose()} />

<div class="history">
  <div class="head">
    <p class="title">past games</p>
    <button class="close" on:click={onClose}>done</button>
  </div>

  {#if rows === null}
    <p class="empty" role="status">loading…</p>
  {:else if failed}
    <p class="empty" role="alert">couldn't load your history — check your connection and try again.</p>
  {:else if rows.length === 0}
    <p class="empty">nothing here yet. finish a game and it will show up here.</p>
  {:else}
    <ul>
      {#each rows as g}
        {@const sum = summarizeGame(g, userId, partnerId, partnerName)}
        <li>
          <div>
            <p class="game">{sum.title}</p>
            <p class="result">{sum.headline}{#if sum.finished && sum.mine && sum.theirs}{' · ' + sum.mine + ' / ' + sum.theirs}{/if}</p>
          </div>
          <span class="when">{when(g.created_at)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .history { position: fixed; inset: 0; z-index: 30; background: var(--bg); overflow-y: auto; padding: 20px max(24px, calc((100vw - 480px) / 2 + 24px)) 40px; display: flex; flex-direction: column; gap: 16px; }
  .head { display: flex; justify-content: space-between; align-items: center; }
  .title { font-family: var(--font-display); font-weight: 800; font-size: 22px; margin: 0; }
  .close { background: none; border: none; color: var(--accent-blue-atoll); font-family: var(--font-mono); font-size: 12px; text-transform: uppercase; cursor: pointer; padding: 8px 0; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  li { background: var(--surface); padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .game { font-family: var(--font-display); font-weight: 700; font-size: 15px; margin: 0; }
  .result { color: var(--text-soft); font-size: 13px; margin: 2px 0 0; }
  .when { font-family: var(--font-mono); font-size: 11px; color: var(--text-soft); text-transform: uppercase; white-space: nowrap; }
  .empty { color: var(--text-soft); font-size: 15px; line-height: 1.5; }
</style>
