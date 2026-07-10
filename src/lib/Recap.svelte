<script>
  // End-of-game recap — the screen that was missing when games "just
  // closed": a finished game_sessions row (ended_at set, phase ended/end)
  // renders here instead of snapping straight to the lobby. Scoreboard +
  // rematch (re-sends the same invite config) + back to lobby.
  export let game;        // the FINAL game_sessions row (ended)
  export let userId;
  export let partnerId;
  export let partnerName = 'them';
  export let onRematch;   // (gameType, rounds, config) => void
  export let onDone;      // () => void

  $: s = game.state || {};
  $: type = game.game_type;

  // --- per-game summary ---
  $: pips = s.pips || [];
  $: matches = pips.filter((p) => p === 'match').length;

  $: myScore = (s.scores || {})[userId] || 0;
  $: theirScore = (s.scores || {})[partnerId] || 0;
  $: mySkips = (s.skips || {})[userId] || 0;
  $: theirSkips = (s.skips || {})[partnerId] || 0;

  $: verdict =
    type === 'wyr' ? null
    : myScore > theirScore ? 'you took it'
    : myScore < theirScore ? `${partnerName} took it`
    : 'dead even';

  function rematchConfig() {
    if (type === 'wyr') return { rounds: (s.prompts || []).length || s.totalRounds || 10, config: {} };
    if (type === 'tod') return { rounds: s.totalRounds || 6, config: { theme: s.theme, firstTurnUserId: userId, chooserUserId: partnerId } };
    if (type === 'spin') return { rounds: s.total_rounds || 6, config: { firstSpinnerId: userId } };
    return { rounds: s.totalRounds || 5, config: {} };
  }

  function rematch() {
    const { rounds, config } = rematchConfig();
    onRematch(type, rounds, config);
  }

  const TITLES = { wyr: 'would you rather', tod: 'truth or dare', spin: 'spin', fs: 'finger smash' };
</script>

<div class="recap">
  <p class="over-label">{TITLES[type] || type} · done</p>

  {#if type === 'wyr'}
    <p class="headline">{matches} of {pips.length} matched</p>
    <div class="pip-trace" aria-label="round history">
      {#each pips as pip}
        <span class="pip {pip}"></span>
      {/each}
    </div>
    <p class="sub">{matches > pips.length / 2 ? 'scarily in sync.' : matches === 0 ? 'complete opposites. somehow it works.' : 'enough clashes to stay interesting.'}</p>
  {:else if type === 'tod'}
    <p class="headline">{s.totalRounds || '—'} rounds · {s.theme}</p>
    <div class="score-row">
      <div class="score-cell"><span class="num">{mySkips}</span><span class="who">skips — you</span></div>
      <div class="score-cell"><span class="num">{theirSkips}</span><span class="who">skips — {partnerName}</span></div>
    </div>
    <p class="sub">{mySkips + theirSkips === 0 ? 'no mercy needed. respect.' : 'the skips know what they did.'}</p>
  {:else}
    <p class="headline">{verdict}</p>
    <div class="score-row">
      <div class="score-cell" class:won={myScore >= theirScore}><span class="num">{myScore}</span><span class="who">you</span></div>
      <div class="score-cell" class:won={theirScore >= myScore}><span class="num">{theirScore}</span><span class="who">{partnerName}</span></div>
    </div>
  {/if}

  <div class="actions">
    <button class="act done-btn" on:click={onDone}>back to lobby</button>
    <button class="act rematch-btn" on:click={rematch}>rematch</button>
  </div>
</div>

<style>
  .recap {
    padding: 40px 24px calc(32px + env(safe-area-inset-bottom, 0px));
    display: flex; flex-direction: column; gap: 18px; align-items: center;
    min-height: 55vh; text-align: center;
  }
  .over-label {
    font-family: var(--font-mono); font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--text-soft);
  }
  .headline { font-family: var(--font-display); font-weight: 800; font-size: 28px; }
  .sub { color: var(--text-soft); font-size: 14px; }
  .pip-trace { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
  .pip { width: 10px; height: 10px; border-radius: 50%; }
  .pip.match { background: var(--accent-freesia); }
  .pip.clash { background: var(--accent-fruit-dove); }
  .score-row { display: flex; gap: 14px; }
  .score-cell {
    background: var(--surface); padding: 18px 28px; display: flex;
    flex-direction: column; gap: 4px; min-width: 110px;
  }
  .score-cell.won { background: var(--surface-2); box-shadow: 4px 5px 0 0 #000; }
  .num { font-family: var(--font-display); font-weight: 800; font-size: 32px; }
  .who { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; color: var(--text-soft); }
  .actions { display: flex; gap: 12px; margin-top: auto; width: 100%; }
  .act {
    font-family: var(--font-display); font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.02em; border: none; padding: 16px 20px; cursor: pointer;
    box-shadow: 5px 6px 0 0 #000; font-size: 13px;
  }
  .done-btn { background: var(--surface-2); color: var(--text); }
  .rematch-btn { background: var(--accent-summer-green); color: var(--on-accent-summer-green); flex: 1; }
</style>
