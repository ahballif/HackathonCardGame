export function deckStrength(cards) {
  const coverage = [0, 0, 0, 0];
  const mean = cards.reduce((total, card) => {
    const arrows = [...card.push.slice(0, 4)].map(Number);
    arrows.forEach((value, direction) => { if (value) coverage[direction]++; });
    const force = arrows.reduce((sum, value) => sum + (value === 2 ? 2.75 : value === 3 ? 3 : value), 0);
    const directions = arrows.filter(Boolean).length;
    const opposing = Number(arrows[0] > 0 && arrows[2] > 0) + Number(arrows[1] > 0 && arrows[3] > 0);
    return total + Math.min(100, (force + directions * 0.7 + opposing * 0.3) / 14.4 * 100);
  }, 0) / cards.length;
  const balance = Math.max(...coverage) ? Math.min(...coverage) / Math.max(...coverage) : 0;
  return Math.round(mean * (0.85 + 0.15 * balance) * 10) / 10;
}

export function expectedScore(a, b) {
  const effective = player => player.rating + (player.strength - 50) * 8;
  return 1 / (1 + 10 ** ((effective(b) - effective(a)) / 400));
}

function windowFor(entry, now) {
  const seconds = Math.max(0, (now - entry.queuedAt) / 1000);
  return { skill: Math.min(350, 100 + seconds * 2), deck: Math.min(22, 8 + seconds * 0.12),
    probability: Math.min(0.25, 0.15 + seconds / 1200) };
}

export function findPair(entries, now) {
  const ordered = [...entries].sort((a, b) => a.queuedAt - b.queuedAt);
  // Give the oldest eligible player priority, then choose their closest opponent.
  for (const anchor of ordered) {
    const candidates = ordered.filter(other => {
      if (other.id === anchor.id) return false;
      if ((anchor.opponents ?? []).some(result => result.id === other.id && now - result.at < 10 * 60 * 1000)) return false;
      if ((other.opponents ?? []).some(result => result.id === anchor.id && now - result.at < 10 * 60 * 1000)) return false;
      const a = windowFor(anchor, now), b = windowFor(other, now);
      return Math.abs(anchor.rating - other.rating) <= Math.min(a.skill, b.skill)
        && Math.abs(anchor.strength - other.strength) <= Math.min(a.deck, b.deck)
        && Math.abs(expectedScore(anchor, other) - 0.5) <= Math.min(a.probability, b.probability);
    });
    candidates.sort((a, b) => {
      const distance = other => Math.abs(expectedScore(anchor, other) - 0.5) * 1000
        + Math.abs(anchor.strength - other.strength) * 3
        + Number((anchor.games < 5) !== (other.games < 5)) * 40;
      return distance(a) - distance(b) || a.queuedAt - b.queuedAt;
    });
    if (candidates.length) return [anchor, candidates[0]];
  }
  return null;
}

export function ratedResult(a, b, winner, strengths, now) {
  const expected = expectedScore({ ...a, strength: strengths[0] }, { ...b, strength: strengths[1] });
  return [a, b].map((profile, player) => {
    const result = winner == null ? 0.5 : winner === player ? 1 : 0;
    const k = profile.games < 10 ? 40 : 24;
    return { ...profile, rating: Math.max(100, Math.min(3000, Math.round(profile.rating + k * (result - (player === 0 ? expected : 1 - expected))))),
      games: profile.games + 1, wins: profile.wins + Number(result === 1), losses: profile.losses + Number(result === 0),
      draws: profile.draws + Number(result === 0.5),
      opponents: [...(profile.opponents ?? []), { id: player === 0 ? b.id : a.id, at: now }].slice(-30) };
  });
}
