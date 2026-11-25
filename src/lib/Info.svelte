<script>
  // Help and privacy — plain-language, reachable from Settings and the start screen.
  export let section = 'help'; // 'help' | 'privacy'
  export let onClose;

  const TABS = [['help', 'help'], ['privacy', 'privacy']];

  const FAQ = [
    ['what is a space?', 'a private place for exactly two people. one of you opens it and shares the code or link; the other joins. games are only ever played between the two of you.'],
    ['how do we start a game?', 'either of you picks a game and sends an invite. the other taps “let’s go”. nobody is pulled into a game without saying yes.'],
    ['what if one of us loses signal?', 'your game is saved. when the connection comes back, it picks up where you left off. if the other person drops off, you’ll see a note while you wait.'],
    ['i got a new phone — how do i get back in?', 'your seat in a space is tied to the device you joined from. on your old phone, open the menu and choose “leave this space”, then join again from the new phone with the same code. if you no longer have the old phone, the space may show as full.'],
    ['can i change my name or look?', 'yes — open the menu, then settings. the other person sees the update right away.'],
    ['how do i make text bigger or turn off sound?', 'settings has text size, sound, haptics and reduced motion.']
  ];
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && onClose()} />

<div class="info" role="dialog" aria-modal="true" aria-label="help and information">
  <div class="head">
    <p class="title">help &amp; info</p>
    <button class="close" on:click={onClose}>done</button>
  </div>
  <div class="tabs" role="tablist">
    {#each TABS as [id, label]}
      <button role="tab" aria-selected={section === id} class:on={section === id} on:click={() => (section = id)}>{label}</button>
    {/each}
  </div>

  {#if section === 'help'}
    {#each FAQ as [q, a]}
      <div class="item"><h3>{q}</h3><p>{a}</p></div>
    {/each}
    <div class="item"><h3>credits</h3><p>avatars are made with DiceBear (MIT). styles: Lorelei by Lisa Wischofsky, Notionists by Zoish, Open Peeps by Pablo Stanley, and Pixel Art by DiceBear — all public domain (CC0). QR codes by qrcode-generator (MIT).</p></div>
  {:else}
    <div class="item"><h3>what we keep</h3><p>your first name or nickname, your emoji look, the spaces you belong to, and the game state while you play (for example, which option you picked in would you rather). there are no accounts, passwords or email addresses.</p></div>
    <div class="item"><h3>who can see it</h3><p>only the two people in a space can see what happens in it. we don’t sell data, show ads, or run advertising trackers.</p></div>
    <div class="item"><h3>technical reports</h3><p>when something fails, the app can send a short technical error report (what failed and the kind of device) so we can fix it. it doesn’t include your answers.</p></div>
    <div class="item"><h3>third parties</h3><p>fonts come from Google Fonts. posters in the screening room come from TMDB. data is stored with our hosting provider, Supabase.</p></div>
    <div class="item"><h3>your choices</h3><p>you can change your name and look in settings, and leave a space any time. this summary describes how the app works today.</p></div>
  {/if}
</div>

<style>
  .info { position: fixed; inset: 0; z-index: 35; background: var(--bg); overflow-y: auto; padding: 20px max(24px, calc((100vw - 480px) / 2 + 24px)) 48px; display: flex; flex-direction: column; gap: 14px; }
  .head { display: flex; justify-content: space-between; align-items: center; }
  .title { font-family: var(--font-display); font-weight: 800; font-size: 22px; margin: 0; }
  .close { background: none; border: none; color: var(--accent-blue-atoll); font-family: var(--font-mono); font-size: 12px; text-transform: uppercase; cursor: pointer; padding: 8px 0; }
  .tabs { display: flex; gap: 6px; }
  .tabs button { flex: 1; background: var(--surface); color: var(--text-soft); border: none; padding: 10px 0; font-family: var(--font-mono); font-size: 12px; text-transform: uppercase; cursor: pointer; }
  .tabs button.on { background: var(--surface-2); color: var(--text); box-shadow: inset 0 -3px 0 var(--accent-blue-atoll); }
  .item { background: var(--surface); padding: 14px 16px; }
  h3 { font-family: var(--font-display); font-size: 15px; margin: 0 0 6px; }
  p { color: var(--text-soft); font-size: 14px; line-height: 1.55; margin: 0; }
</style>
