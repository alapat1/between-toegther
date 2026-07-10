<script>
  import { onMount } from 'svelte';
  import { sb } from './engine/supabase.js';
  import { findMyMostRecentRoomCode } from './engine/room.js';
  import NameGate from './lib/NameGate.svelte';
  import Landing from './lib/Landing.svelte';
  import Room from './routes/Room.svelte';

  let user = null;
  let profile = null;
  let roomCode = null;

  function readHash() {
    const m = window.location.hash.match(/^#\/r\/([A-Z0-9]+)$/i);
    roomCode = m ? m[1].toUpperCase() : null;
  }

  function goToRoom(code) {
    window.location.hash = '/r/' + code;
    roomCode = code;
  }

  // Auto-return to the space you already belong to, instead of always
  // dropping back on the landing/code-entry screen. The code becomes an
  // invite/recovery mechanism, not something you re-type every session.
  async function tryAutoRejoin(userId) {
    if (roomCode) return; // hash already points somewhere specific
    const code = await findMyMostRecentRoomCode(userId);
    if (code) goToRoom(code);
  }

  async function handleReady(u, p) {
    user = u;
    profile = p;
    await tryAutoRejoin(u.id);
  }

  onMount(async () => {
    readHash();
    window.addEventListener('hashchange', readHash);
    // If a session already exists (persisted anon auth), skip the name gate.
    const { data: { user: existing } } = await sb.auth.getUser();
    if (existing) {
      const { data: prof } = await sb.from('profiles').select('*').eq('id', existing.id).maybeSingle();
      if (prof) {
        user = existing; profile = prof;
        await tryAutoRejoin(existing.id);
      }
    }
  });
</script>

<main>
  <header>
    <h1>between &amp; together</h1>
  </header>

  {#if !user || !profile}
    <NameGate onReady={handleReady} />
  {:else if !roomCode}
    <Landing userId={user.id} onRoomReady={goToRoom} />
  {:else}
    <Room code={roomCode} userId={user.id} />
  {/if}
</main>

<style>
  main {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
  }
  header {
    padding: 32px 24px 0;
  }
  h1 {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 22px;
    margin: 0;
  }
</style>
