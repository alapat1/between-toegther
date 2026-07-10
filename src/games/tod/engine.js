// Ported from index.html's tod2* functions, updated for flows.md §2.1
// (2026-07-09): theme is host-set at the cabinet, not voted in-game — the
// old theme_vote phase and its highest-wins resolution are gone entirely.
// Truth rounds skip judging outright (only dares are contestable); the
// judging phase holds until the judge taps confirm or NOPE — no timer.
import { fetchTodPrompt } from '../../engine/promptsRepo.js';
import { guardedGameWrite } from '../../engine/session.js';

export function initialState(theme, totalRounds, firstTurnUserId, chooserUserId) {
  return {
    theme,
    round: 0,
    totalRounds,
    currentTurn: firstTurnUserId,
    chooser: chooserUserId,
    phase: 'chooser_picks',
    skips: {},
    usedPrompts: []
  };
}

export async function pickChoice(game, choice) {
  const { theme, usedPrompts } = game.state;
  const tier = defaultTierFor(theme);
  const { id, text } = await fetchTodPrompt(theme, tier, choice, usedPrompts || []);
  return guardedGameWrite(game.id, (current) => ({
    phase: 'prompt_active',
    state: {
      ...current.state,
      choice,
      tier,
      promptId: id,
      prompt: text,
      completedBy: null,
      usedPrompts: id ? [...(current.state.usedPrompts || []), id] : (current.state.usedPrompts || []),
      phase: 'prompt_active'
    }
  }));
}

// Truth ends the round the moment the performer taps done — nothing to
// contest. Dare moves to judging and HOLDS there until the judge acts.
export async function done(game, userId) {
  if (game.state.choice === 'truth') {
    return advanceRound(game, game.state);
  }
  return guardedGameWrite(game.id, (current) => ({
    phase: 'judging',
    state: { ...current.state, completedBy: userId, phase: 'judging' }
  }));
}

export async function skip(game, userId) {
  return guardedGameWrite(game.id, (current) => {
    const skips = { ...current.state.skips, [userId]: (current.state.skips[userId] || 0) + 1 };
    return advanceRoundState({ ...current.state, skips });
  });
}

// The judge's one required tap — confirm (fast/default) or NOPE (contest).
// Nothing else advances the round; this IS the gate (flows.md §2.1).
export async function judgeConfirm(game, completed) {
  return guardedGameWrite(game.id, (current) => {
    const skips = { ...current.state.skips };
    if (!completed) skips[current.state.currentTurn] = (skips[current.state.currentTurn] || 0) + 1;
    return advanceRoundState({ ...current.state, skips });
  });
}

function advanceRoundState(state) {
  const nextRound = state.round + 1;
  if (nextRound >= state.totalRounds) {
    return { phase: 'end', state: { ...state, phase: 'end' } };
  }
  return {
    phase: 'chooser_picks',
    state: {
      ...state,
      round: nextRound,
      currentTurn: state.currentTurn, // swapped by caller if needed
      phase: 'chooser_picks',
      choice: null,
      prompt: null,
      completedBy: null
    }
  };
}

async function advanceRound(game, state) {
  return guardedGameWrite(game.id, () => advanceRoundState(state));
}

function defaultTierFor(theme) {
  return { casual: 'easy', playful: 'fun', romantic: 'fun', unfiltered: 'spicy' }[theme] || 'easy';
}
