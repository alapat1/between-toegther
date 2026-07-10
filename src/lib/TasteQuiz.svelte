<script>
  // roadmap.md's 6-question taste quiz — skippable at any step, re-editable
  // later from Screening Room ("edit your taste"). Each answer is actionable,
  // not fluff (see roadmap.md comments per question).
  import PlateButton from './PlateButton.svelte';
  import { saveTasteProfile } from '../engine/screeningRoom.js';

  export let roomId;
  export let userId;
  export let onDone; // () => void

  const steps = ['mix', 'loved', 'hardNo', 'anime', 'length', 'discovery'];
  let step = 0;
  let answers = { mix: null, loved: [], hardNoGenres: [], anime: null, length: null, discovery: null };

  const GENRES = ['action', 'comedy', 'horror', 'romance', 'thriller', 'drama'];

  function toggleGenre(g) {
    answers.hardNoGenres = answers.hardNoGenres.includes(g)
      ? answers.hardNoGenres.filter((x) => x !== g)
      : [...answers.hardNoGenres, g];
  }

  function next() {
    if (step < steps.length - 1) step += 1;
    else finish();
  }
  function skipAll() { finish(); }

  async function finish() {
    await saveTasteProfile(roomId, userId, {
      mix: answers.mix,
      loved_titles: answers.loved,
      hard_no_genres: answers.hardNoGenres,
      anime_pref: answers.anime,
      session_length: answers.length,
      discovery_pref: answers.discovery
    });
    onDone();
  }
</script>

<div class="quiz">
  <button class="skip" on:click={skipAll}>skip for now</button>

  {#if steps[step] === 'mix'}
    <p class="q">movies, series, or both?</p>
    <div class="row">
      {#each ['movies', 'series', 'both'] as opt}
        <PlateButton accent={answers.mix === opt ? 'var(--accent-blue-atoll)' : 'var(--surface-2)'} onAccent="var(--on-accent-blue-atoll)" on:click={() => { answers.mix = opt; next(); }}>{opt}</PlateButton>
      {/each}
    </div>
  {:else if steps[step] === 'loved'}
    <p class="q">name up to 3 titles you've loved</p>
    <input class="text-input" placeholder="type a title, press enter" on:keydown={(e) => {
      if (e.key === 'Enter' && e.target.value.trim() && answers.loved.length < 3) {
        answers.loved = [...answers.loved, e.target.value.trim()];
        e.target.value = '';
      }
    }} />
    <div class="chips">{#each answers.loved as t}<span class="chip">{t}</span>{/each}</div>
    <PlateButton accent="var(--accent-summer-green)" onAccent="var(--on-accent-summer-green)" on:click={next}>next</PlateButton>
  {:else if steps[step] === 'hardNo'}
    <p class="q">any genres that are a hard no?</p>
    <div class="chips">
      {#each GENRES as g}
        <button class="chip toggle" class:on={answers.hardNoGenres.includes(g)} on:click={() => toggleGenre(g)}>{g}</button>
      {/each}
    </div>
    <PlateButton accent="var(--accent-summer-green)" onAccent="var(--on-accent-summer-green)" on:click={next}>next</PlateButton>
  {:else if steps[step] === 'anime'}
    <p class="q">anime: subbed, dubbed, or not for us?</p>
    <div class="row">
      {#each [['subbed','subbed'],['dubbed','dubbed'],['skip','not for us']] as [val,label]}
        <PlateButton accent={answers.anime === val ? 'var(--accent-blue-atoll)' : 'var(--surface-2)'} onAccent="var(--on-accent-blue-atoll)" on:click={() => { answers.anime = val; next(); }}>{label}</PlateButton>
      {/each}
    </div>
  {:else if steps[step] === 'length'}
    <p class="q">a usual night gives you how long?</p>
    <div class="row">
      {#each [['episode','one episode'],['movie','a movie'],['marathon','a marathon']] as [val,label]}
        <PlateButton accent={answers.length === val ? 'var(--accent-freesia)' : 'var(--surface-2)'} onAccent="var(--on-accent-freesia)" on:click={() => { answers.length = val; next(); }}>{label}</PlateButton>
      {/each}
    </div>
  {:else if steps[step] === 'discovery'}
    <p class="q">new stuff, or comfort rewatches?</p>
    <div class="row">
      {#each [['new','new stuff'],['comfort','comfort rewatches'],['mixed','a mix']] as [val,label]}
        <PlateButton accent={answers.discovery === val ? 'var(--accent-fruit-dove)' : 'var(--surface-2)'} onAccent="var(--on-accent-fruit-dove)" on:click={() => { answers.discovery = val; finish(); }}>{label}</PlateButton>
      {/each}
    </div>
  {/if}
</div>

<style>
  .quiz { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .skip { align-self: flex-end; background: none; border: none; color: var(--text-soft); font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; cursor: pointer; }
  .q { font-family: var(--font-display); font-size: 18px; font-weight: 700; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; }
  .text-input {
    background: var(--surface); border: none; color: var(--text);
    font-family: var(--font-body); font-size: 15px; padding: 14px;
  }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip { background: var(--surface); color: var(--text-soft); font-family: var(--font-mono); font-size: 11px; padding: 6px 10px; border: none; }
  .chip.toggle { cursor: pointer; }
  .chip.toggle.on { background: var(--accent-fruit-dove); color: var(--on-accent-fruit-dove); }
</style>
