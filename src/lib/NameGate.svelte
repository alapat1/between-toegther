<script>
  import PlateButton from './PlateButton.svelte';
  import { ensureProfile } from '../engine/auth.js';

  export let onReady; // (user, profile) => void

  let name = '';
  let busy = false;
  let errorMsg = '';

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) { errorMsg = 'need a name'; return; }
    busy = true;
    errorMsg = '';
    const res = await ensureProfile(trimmed);
    busy = false;
    if (!res.ok) { errorMsg = 'something went wrong'; return; }
    onReady(res.user, res.profile);
  }
</script>

<div class="gate">
  <h2>what should we call you?</h2>
  <input
    class="name-input"
    bind:value={name}
    placeholder="your name"
    on:keydown={(e) => e.key === 'Enter' && submit()}
  />
  {#if errorMsg}<p class="error">{errorMsg}</p>{/if}
  <PlateButton accent="var(--accent-blue-atoll)" onAccent="var(--on-accent-blue-atoll)" disabled={busy} on:click={submit}>
    {busy ? 'just a sec' : 'continue'}
  </PlateButton>
</div>

<style>
  .gate { padding: 32px 24px; display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
  h2 { font-family: var(--font-display); font-size: 20px; margin: 0; }
  .name-input {
    width: 100%;
    background: var(--surface);
    border: none;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 16px;
    padding: 14px 16px;
  }
  .name-input:focus { outline: 2px solid var(--accent-blue-atoll); }
  .error { color: var(--accent-fruit-dove); font-size: 12px; font-family: var(--font-mono); margin: 0; }
</style>
