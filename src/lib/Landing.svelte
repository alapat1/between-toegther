<script>
  import PlateButton from './PlateButton.svelte';
  import { createRoom, joinRoom } from '../engine/room.js';

  export let userId;
  export let onRoomReady; // (code) => void

  let joinCode = '';
  let busy = false;
  let errorMsg = '';

  async function handleCreate() {
    busy = true; errorMsg = '';
    const res = await createRoom(userId);
    busy = false;
    if (!res.ok) { errorMsg = 'could not open a space — check your connection and try again'; return; }
    onRoomReady(res.code);
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) { errorMsg = 'enter the 4-letter space code'; return; }
    busy = true; errorMsg = '';
    const res = await joinRoom(code);
    busy = false;
    if (!res.ok) {
      errorMsg = res.reason === 'room-full' ? 'that space already has two people'
        : res.reason === 'no-such-room' ? 'no space with that code — check it with the person who invited you'
        : 'could not join — try again';
      return;
    }
    onRoomReady(code);
  }
</script>

<div class="landing">
  <p class="intro">a space is a private place for two people. open one and share its code, or join someone else's.</p>
  <PlateButton accent="var(--accent-orange-pop)" onAccent="var(--on-accent-orange-pop)" disabled={busy} on:click={handleCreate}>
    open a space
  </PlateButton>

  <div class="join-row">
    <label class="sr-only" for="join-code">space code</label>
    <input id="join-code" class="code-input" bind:value={joinCode} placeholder="space code" maxlength="4" autocomplete="off" autocapitalize="characters" on:keydown={(e) => e.key === 'Enter' && handleJoin()} />
    <PlateButton accent="var(--accent-summer-green)" onAccent="var(--on-accent-summer-green)" disabled={busy} on:click={handleJoin}>
      join
    </PlateButton>
  </div>

  {#if errorMsg}<p class="error" role="alert">{errorMsg}</p>{/if}
</div>

<style>
  .landing { padding: 24px; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
  .intro { color: var(--text-soft); font-size: 14px; line-height: 1.5; margin: 0; }
  .join-row { display: flex; gap: 8px; width: 100%; }
  .code-input {
    flex: 1;
    background: var(--surface);
    border: none;
    color: var(--text);
    font-family: var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-size: 16px;
    padding: 14px 16px;
  }
  .code-input:focus { outline: 2px solid var(--accent-summer-green); }
  .error { color: var(--accent-fruit-dove); font-size: 12px; font-family: var(--font-mono); margin: 0; }
</style>
