<script>
  // Roadmap's designated "WYR reference screen" — the approval gate before
  // the redesign rolls out to every other screen (roadmap.md sequencing #3).
  // Implements flows.md §2.2: split-slam choice, heat-shimmer waiting state,
  // flip reveal, pip trace strip, wait-for-both advance (no auto-timer).
  import { makeChoice, bothChosen, markReadyForNext } from './engine.js';

  export let game;        // game_sessions row (state.prompts, state.round, state.pips, state.readyForNext)
  export let userId;
  export let partnerId;
  export let moves = [];  // wyr_moves rows for this game

  $: round = game.state.round;
  $: prompt = game.state.prompts[round];
  $: myChoice = moves.find((m) => m.round === round && m.user_id === userId)?.choice;
  $: reveal = bothChosen(moves, round, userId, partnerId);
  $: iAmReady = !!(game.state.readyForNext || {})[userId];

  async function choose(side) {
    if (myChoice) return;
    await makeChoice(game, userId, side);
  }

  async function confirmReady() {
    if (iAmReady) return;
    const pip = reveal.mine === reveal.theirs ? 'match' : 'clash';
    await markReadyForNext(game, userId, partnerId, pip);
  }
</script>

<div class="wyr">
  <div class="pip-strip" aria-label="round history">
    {#each game.state.pips || [] as pip}
      <span class="pip {pip}"></span>
    {/each}
  </div>

  {#if !reveal}
    <div class="slam-row">
      <button
        class="slam-half a"
        class:chosen={myChoice === 'a'}
        class:waiting={myChoice && myChoice !== 'a'}
        disabled={!!myChoice}
        on:click={() => choose('a')}
      >
        {prompt[0]}
      </button>
      <div class="or-pill">or</div>
      <button
        class="slam-half b"
        class:chosen={myChoice === 'b'}
        class:waiting={myChoice && myChoice !== 'b'}
        disabled={!!myChoice}
        on:click={() => choose('b')}
      >
        {prompt[1]}
      </button>
    </div>
    {#if myChoice}
      <p class="waiting-label">waiting on them<span class="shimmer"></span></p>
    {/if}
  {:else}
    <div class="reveal" class:match={reveal.mine === reveal.theirs}>
      <p class="reveal-label">{reveal.mine === reveal.theirs ? 'you matched' : 'you clashed'}</p>
      <p class="reveal-choices">you: {prompt[reveal.mine === 'a' ? 0 : 1]} · them: {prompt[reveal.theirs === 'a' ? 0 : 1]}</p>
      <button class="ready-btn" class:done={iAmReady} on:click={confirmReady} disabled={iAmReady}>
        {iAmReady ? 'waiting on them…' : 'next round'}
      </button>
    </div>
  {/if}
</div>

<style>
  .wyr {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
  }

  .pip-strip {
    display: flex;
    gap: 4px;
    /* trace beat (D2) — overlaps the header below it rather than sitting flush */
    margin-bottom: -6px;
    z-index: 1;
  }
  .pip {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .pip.match { background: var(--accent-freesia); }
  .pip.clash { background: var(--accent-fruit-dove); }

  .slam-row {
    position: relative;
    display: flex;
    min-height: 220px;
  }

  .slam-half {
    flex: 1;
    border: none;
    color: var(--text);
    background: var(--surface);
    font-family: var(--font-body);
    font-size: 18px;
    font-weight: 500;
    padding: 24px;
    cursor: pointer;
    transition: flex 0.35s cubic-bezier(0.2, 1.1, 0.3, 1), background 0.2s;
  }
  .slam-half.chosen { flex: 1.6; background: var(--accent-blue-atoll); color: var(--on-accent-blue-atoll); }
  .slam-half.waiting { flex: 0.5; opacity: 0.5; }

  .or-pill {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg);
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 12px;
    padding: 6px 12px;
    z-index: 2;
  }

  .waiting-label {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-soft);
    text-align: center;
  }

  .reveal { text-align: center; }
  .reveal-label { font-family: var(--font-display); font-size: 22px; font-weight: 800; }
  .reveal.match .reveal-label { color: var(--accent-freesia); }
  .reveal:not(.match) .reveal-label { color: var(--accent-fruit-dove); }
  .reveal-choices { font-size: 13px; color: var(--text-soft); margin: 8px 0 20px; }

  .ready-btn {
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    background: var(--accent-summer-green);
    color: var(--on-accent-summer-green);
    border: none;
    padding: 14px 28px;
    cursor: pointer;
    box-shadow: 5px 6px 0 0 #000;
  }
  .ready-btn.done { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: translate(5px, 6px); }
</style>
