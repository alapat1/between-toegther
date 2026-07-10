// Ported from doSpin()/saveSpinResult()/advanceSpinRound() with flows.md
// §2.3's collapse: no separate result screen — handoff is inline, the wheel
// stays on screen and just recedes to background while the prompt is active.
import { SPIN_SEGMENTS } from '../../data/prompts.js';
import { fetchTodPrompt } from '../../engine/promptsRepo.js';
import { guardedGameWrite } from '../../engine/session.js';

export function initialState(totalRounds, firstSpinnerId) {
  return {
    round: 0,
    total_rounds: totalRounds,
    spinner_id: firstSpinnerId,
    scores: {},
    phase: 'spinning',
    wheel_result: null,
    spinner_done: false
  };
}

export function weightedPick(round, totalRounds) {
  const progress = round / Math.max(totalRounds - 1, 1);
  const weights = SPIN_SEGMENTS.map((seg) => {
    let w = seg.weight;
    if (seg.tier === 'easy') w *= Math.max(0.2, 1 - progress * 2);
    if (seg.tier === 'fun') w *= progress < 0.7 ? 1.5 : 0.8;
    if (seg.tier === 'wild') w *= progress > 0.3 ? 1.5 : 0.5;
    if (seg.tier === 'spicy') w *= Math.min(3, progress * 3);
    return Math.max(0.1, w);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return i;
  }
  return 0;
}

export async function spin(game) {
  const idx = weightedPick(game.state.round, game.state.total_rounds);
  const segment = SPIN_SEGMENTS[idx];
  const { id, text } = await fetchTodPrompt('casual', segment.tier, segment.type, game.state.usedPrompts || []);
  return guardedGameWrite(game.id, (current) => ({
    phase: 'prompt',
    state: {
      ...current.state,
      wheel_result: idx,
      current_tier: segment.tier,
      current_type: segment.type,
      prompt: text,
      promptId: id,
      usedPrompts: id ? [...(current.state.usedPrompts || []), id] : (current.state.usedPrompts || []),
      spinner_done: false
    }
  }));
}

export async function markSpinnerDone(game) {
  // Spinner's "i did it" never awards points itself — only the judge's
  // verdict does. (This is the exact bug fixed 2026-07-08: it used to jump
  // straight to a scored result and race the judge.)
  return guardedGameWrite(game.id, (current) => ({
    state: { ...current.state, spinner_done: true }
  }));
}

export async function judge(game, verdict, partnerId) {
  return guardedGameWrite(game.id, (current) => {
    const scores = { ...current.state.scores };
    if (verdict === 'did') scores[current.state.spinner_id] = (scores[current.state.spinner_id] || 0) + 1;
    return advance({ ...current.state, scores }, partnerId);
  });
}

function advance(state, partnerId) {
  const next = state.round + 1;
  if (next >= state.total_rounds) {
    return { phase: 'ended', state: { ...state, phase: 'ended' } };
  }
  return {
    phase: 'spinning',
    state: {
      ...state,
      round: next,
      spinner_id: partnerId, // rotate every round
      wheel_result: null,
      prompt: null,
      spinner_done: false
    }
  };
}
