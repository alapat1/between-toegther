// One place that turns a finished game_sessions row into human words.
// Used by the shareable result card and the past-games list.
const TITLES = { wyr: 'would you rather', tod: 'truth or dare', spin: 'spin the wheel', fs: 'finger smash' };
export const gameTitle = (type) => TITLES[type] || type;

/** -> { title, headline, sub, mine, theirs, finished } where mine/theirs are short stat strings. */
export function summarizeGame(game, userId, partnerId, partnerName = 'your person') {
  const s = game.state || {};
  const type = game.game_type;
  const finished = game.phase === 'ended' || game.phase === 'end';
  const title = gameTitle(type);
  if (!finished) return { title, headline: 'ended early', sub: '', mine: '', theirs: '', finished };

  if (type === 'wyr') {
    const pips = s.pips || [];
    const matches = pips.filter((p) => p === 'match').length;
    const sub = matches > pips.length / 2 ? 'scarily in sync' : matches === 0 ? 'complete opposites' : 'enough clashes to stay interesting';
    return { title, headline: `${matches} of ${pips.length} matched`, sub, mine: '', theirs: '', finished };
  }
  if (type === 'tod') {
    const ms = (s.skips || {})[userId] || 0;
    const ts = (s.skips || {})[partnerId] || 0;
    return { title, headline: `${s.totalRounds || ''} rounds · ${s.theme || ''}`.trim(), sub: ms + ts === 0 ? 'no mercy needed' : 'a few skips along the way', mine: `${ms} skips`, theirs: `${ts} skips`, finished };
  }
  const my = (s.scores || {})[userId] || 0;
  const their = (s.scores || {})[partnerId] || 0;
  const headline = my > their ? 'you took it' : my < their ? `${partnerName} took it` : 'dead even';
  return { title, headline, sub: `${my} – ${their}`, mine: String(my), theirs: String(their), finished };
}
