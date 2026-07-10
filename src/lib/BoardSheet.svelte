<script>
  // roadmap.md's Pinterest-style boards — bottom sheet, inline board
  // creation, no settings-page detour. Shared by the swipe deck, mood
  // slider results, and search fallback (every title card, everywhere).
  import { listBoards, createBoard, addToBoard } from '../engine/screeningRoom.js';

  export let roomId;
  export let userId;
  export let candidate; // the title being saved
  export let onClose; // () => void
  export let onSaved = () => {};

  let boards = [];
  let newBoardName = '';
  let loading = true;

  async function refresh() {
    boards = await listBoards(roomId);
    loading = false;
  }
  refresh();

  async function save(boardId) {
    await addToBoard(boardId, candidate, userId);
    onSaved(boardId);
    onClose();
  }

  async function saveToNewBoard() {
    if (!newBoardName.trim()) return;
    const res = await createBoard(roomId, newBoardName.trim());
    if (res.ok) await save(res.board.id);
  }
</script>

<div class="scrim" on:click={onClose}></div>
<div class="sheet">
  <p class="title">save "{candidate.title}"</p>
  {#if loading}
    <p class="status">loading boards…</p>
  {:else}
    <div class="board-list">
      {#each boards as b}
        <button class="board-row" on:click={() => save(b.id)}>{b.name}{#if b.is_default} · default{/if}</button>
      {/each}
    </div>
    <div class="new-board-row">
      <input class="text-input" placeholder="new board name" bind:value={newBoardName} on:keydown={(e) => e.key === 'Enter' && saveToNewBoard()} />
      <button class="add-btn" on:click={saveToNewBoard}>+</button>
    </div>
  {/if}
</div>

<style>
  .scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10; }
  .sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 11;
    background: var(--surface); padding: 20px; display: flex; flex-direction: column; gap: 12px;
    box-shadow: 0 -6px 0 0 #000;
  }
  .title { font-family: var(--font-display); font-weight: 700; font-size: 15px; }
  .status { color: var(--text-soft); font-size: 13px; }
  .board-list { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
  .board-row {
    text-align: left; background: var(--surface-2); border: none; color: var(--text);
    font-family: var(--font-body); font-size: 14px; padding: 12px 14px; cursor: pointer;
  }
  .new-board-row { display: flex; gap: 8px; }
  .text-input { flex: 1; background: var(--surface-2); border: none; color: var(--text); font-family: var(--font-body); font-size: 14px; padding: 12px; }
  .add-btn {
    background: var(--accent-summer-green); color: var(--on-accent-summer-green); border: none;
    font-family: var(--font-display); font-weight: 800; font-size: 16px; padding: 0 18px; cursor: pointer;
  }
</style>
