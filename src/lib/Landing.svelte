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
    if (!res.ok) { errorMsg = 'could not open room'; return; }
    onRoomReady(res.code);
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) { errorMsg = 'enter a code'; return; }
    busy = true; errorMsg = '';
    const res = await joinRoom(code);
    busy = false;
    if (!res.ok) {
      errorMsg = res.reason === 'room-full' ? 'that room is full'
        : res.reason === 'no-such-room' ? 'no room with that code'
        : 'could not join';
      return;
    }
    onRoomReady(code);
  }
</script>

<div class="landing">
  <PlateButton accent="var(--accent-orange-pop)" onAccent="var(--on-accent-orange-pop)" disabled={busy} on:click={handleCreate}>
    open a room
  </PlateButton>

  <div class="join-row">
    <input class="code-input" bind:value={joinCode} placeholder="room code" maxlength="4" />
    <PlateButton accent="var(--accent-summer-green)" onAccent="var(--on-accent-summer-green)" disabled={busy} on:click={handleJoin}>
      join
    </PlateButton>
  </div>

  {#if errorMsg}<p class="error">{errorMsg}</p>{/if}
</div>

<style>
  .landing { padding: 24px; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
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
