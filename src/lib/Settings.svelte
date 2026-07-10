<script>
  // Device + profile settings. Deliberately small: name (shared, Supabase),
  // haptics/motion (device-local, prefs.js), taste re-entry, space info.
  import { sb } from '../engine/supabase.js';
  import { hapticsEnabled, reducedMotion, buzz } from '../engine/prefs.js';
  import { toast } from '../engine/toast.js';

  export let userId;
  export let room; // { code, display_name }
  export let displayName;
  export let onClose;
  export let onEditTaste; // () => void — opens the Screening Room taste quiz
  export let onSwitchSpace; // () => void
  export let onLeaveRoom; // () => void

  let nameDraft = displayName;
  let savingName = false;

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === displayName || savingName) return;
    savingName = true;
    const { error } = await sb.from('profiles').update({ display_name: trimmed }).eq('id', userId);
    savingName = false;
    if (error) { toast("couldn't save your name — try again", 'error'); return; }
    displayName = trimmed;
    toast('name updated', 'success');
  }

  function copyCode() {
    const link = `${location.origin}${location.pathname}#/r/${room.code}`;
    navigator.clipboard?.writeText(link).then(
      () => toast('invite link copied', 'success'),
      () => toast(`your code is ${room.code}`)
    );
  }
</script>

<div class="settings">
  <div class="head">
    <p class="title">settings</p>
    <button class="close" on:click={onClose}>done</button>
  </div>

  <div class="section">
    <p class="label">your name</p>
    <div class="name-row">
      <input class="input" bind:value={nameDraft} on:keydown={(e) => e.key === 'Enter' && saveName()} maxlength="24" />
      <button class="mini" on:click={saveName} disabled={savingName}>save</button>
    </div>
  </div>

  <div class="section">
    <p class="label">this phone</p>
    <label class="toggle-row">
      <span>haptics</span>
      <input type="checkbox" bind:checked={$hapticsEnabled} on:change={() => $hapticsEnabled && buzz()} />
    </label>
    <label class="toggle-row">
      <span>reduce motion</span>
      <input type="checkbox" bind:checked={$reducedMotion} />
    </label>
  </div>

  <div class="section">
    <p class="label">screening room</p>
    <button class="row-btn" on:click={onEditTaste}>edit your taste →</button>
  </div>

  <div class="section">
    <p class="label">your space</p>
    <p class="space-name">{room.display_name || `room ${room.code}`} · <span class="code">{room.code}</span></p>
    <button class="row-btn" on:click={copyCode}>copy invite link</button>
    <button class="row-btn" on:click={onSwitchSpace}>switch space →</button>
    <button class="row-btn danger" on:click={onLeaveRoom}>leave this space</button>
  </div>

  <p class="fineprint">watch data and posters provided by TMDB.</p>
</div>

<style>
  .settings { padding: 24px; display: flex; flex-direction: column; gap: 24px; }
  .head { display: flex; justify-content: space-between; align-items: center; }
  .title { font-family: var(--font-display); font-weight: 800; font-size: 18px; }
  .close {
    background: var(--surface-2); border: none; color: var(--text);
    font-family: var(--font-mono); font-size: 11px; text-transform: uppercase;
    padding: 8px 14px; cursor: pointer;
  }
  .section { display: flex; flex-direction: column; gap: 10px; }
  .label {
    font-family: var(--font-mono); font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--text-soft);
  }
  .name-row { display: flex; gap: 8px; }
  .input {
    flex: 1; background: var(--surface); border: none; color: var(--text);
    font-family: var(--font-body); font-size: 15px; padding: 12px 14px;
  }
  .mini {
    background: var(--accent-blue-atoll); color: var(--on-accent-blue-atoll);
    border: none; font-family: var(--font-display); font-weight: 700;
    text-transform: uppercase; font-size: 11px; padding: 0 16px; cursor: pointer;
  }
  .toggle-row {
    display: flex; justify-content: space-between; align-items: center;
    background: var(--surface); padding: 12px 14px; font-size: 14px; cursor: pointer;
  }
  .row-btn {
    background: var(--surface); border: none; color: var(--text); text-align: left;
    font-family: var(--font-body); font-size: 14px; padding: 12px 14px; cursor: pointer;
  }
  .row-btn.danger { color: var(--accent-fruit-dove); }
  .space-name { font-size: 14px; }
  .code { font-family: var(--font-mono); color: var(--text-soft); }
  .fineprint { font-family: var(--font-mono); font-size: 10px; color: var(--text-soft); }
</style>
