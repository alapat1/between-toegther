<script>
  import { onMount } from 'svelte';
  import { sb } from './engine/supabase.js';
  import { findMyMostRecentRoomCode } from './engine/room.js';
  import NameGate from './lib/NameGate.svelte';
  import Landing from './lib/Landing.svelte';
  import Room from './routes/Room.svelte';
  import Toast from './lib/Toast.svelte';
  import ConfirmDialog from './lib/ConfirmDialog.svelte';
  import Splash from './lib/Splash.svelte';
  import Welcome from './lib/Welcome.svelte';
  import { reducedMotion } from './engine/prefs.js';

  // Reduced motion: settings toggle (defaults to the OS preference) collapses
  // animations app-wide via a body class the token sheet can key off.
  $: if (typeof document !== 'undefined') {
    document.body.classList.toggle('reduced-motion', $reducedMotion);
  }

  let user = null;
  let profile = null;
  let roomCode = null;
  let booting = true; // splash until the session check finishes
  let welcomed = false;
  try { welcomed = localStorage.getItem('bt-welcomed') === '1'; } catch (e) { /* private mode */ }
  function finishWelcome() {
    welcomed = true;
    try { localStorage.setItem('bt-welcomed', '1'); } catch (e) { /* ignore */ }
  }

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
    // The static splash from index.html hands over to the in-app one.
    document.getElementById('boot')?.remove();
    readHash();
    window.addEventListener('hashchange', readHash);
    try {
      // If a session already exists (persisted anon auth), skip the name gate.
      const { data: { user: existing } } = await sb.auth.getUser();
      if (existing) {
        const { data: prof } = await sb.from('profiles').select('*').eq('id', existing.id).maybeSingle();
        if (prof) {
          user = existing; profile = prof;
          await tryAutoRejoin(existing.id);
        }
      }
    } catch (e) {
      // Offline or backend hiccup: fall through to the name gate rather than hang on the splash.
    } finally {
      // Hold the splash just long enough to feel intentional, never longer.
      const minMs = 600 - Math.min(600, performance.now());
      await new Promise((r) => setTimeout(r, minMs));
      booting = false;
    }
  });
</script>

<main>
  {#if booting}
    <Splash />
  {:else if !user && !welcomed}
    <Welcome onDone={finishWelcome} />
  {:else}
  <header class:compact={!!roomCode && !!user}>
    <h1>between &amp; together</h1>
  </header>

  {#if !user || !profile}
    <NameGate onReady={handleReady} />
  {:else if !roomCode}
    <Landing userId={user.id} onRoomReady={goToRoom} />
  {:else}
    <Room code={roomCode} userId={user.id} />
  {/if}
  {/if}
</main>

<Toast />
<ConfirmDialog />

<style>
  main {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  header {
    padding: 32px 24px 0;
  }
  header.compact { padding: 14px 24px 0; }
  header.compact h1 { font-size: 13px; letter-spacing: 0.04em; opacity: 0.7; }
  h1 {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 22px;
    margin: 0;
  }
</style>
