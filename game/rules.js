// Rules are independent of Phaser. A rejected action never mutates the match.
export const DIRECTIONS = [null, [0, -1], [1, 0], [0, 1], [-1, 0]];

function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function validateDeckLists(library, deckLists) {
  if (!Array.isArray(deckLists) || deckLists.length !== 2) throw new Error("Choose a deck for each player.");
  const byName = new Map(library.map(card => [card.name, card]));
  return deckLists.map((names, owner) => {
    if (!Array.isArray(names) || names.length !== 16 || new Set(names).size !== 16) throw new Error(`Player ${owner + 1} needs 16 different cards.`);
    return names.map(name => {
      if (!byName.has(name)) throw new Error(`Unknown card: ${name}`);
      return { ...byName.get(name) };
    });
  });
}

export function createMatch(library, map, random = Math.random, { deckLists = null, gemCount = 1 } = {}) {
  if (library.length < 6) throw new Error("At least six cards are required.");
  const picnic = map.flatMap((row, y) => row.flatMap((tile, x) => tile.playable === 2 ? [{ x, y }] : []));
  if (picnic.length < 2) throw new Error("At least two picnic tiles are required.");
  if (!Number.isInteger(gemCount) || gemCount < 1 || gemCount >= picnic.length) throw new Error("Leave at least one picnic tile without a gem.");
  let decks;
  if (deckLists) {
    decks = validateDeckLists(library, deckLists).map((cards, owner) => shuffled(cards, random).map((data, index) => ({ ...data, id: `p${owner}-${index}`, owner })));
  } else {
    const deck = shuffled(library, random).slice(0, 32).map((data, id) => ({ ...data, id: `card-${id}`, owner: id % 2 }));
    decks = [deck.filter(card => card.owner === 0), deck.filter(card => card.owner === 1)];
  }
  const gems = shuffled(picnic, random).slice(0, gemCount);
  return resolveMatchEnd({
    map: map.map(row => row.map(tile => ({ ...tile }))), board: map.map(row => row.map(() => null)),
    hands: decks.map(cards => cards.splice(0, 3)), decks,
    gems, gem: gems[0], turn: 0, revision: 0, moves: 0,
    finished: false, winner: null, reason: null, lastMove: "Choose a hero, then choose a highlighted move."
  });
}

function inside(state, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && !!state.map[y]?.[x];
}

export function planMove(state, card, x, y, direction) {
  if (!inside(state, x, y) || state.map[y][x].playable !== 2 || !Number.isInteger(direction) || direction < 0 || direction > 4) return null;
  const target = state.board[y][x];
  if (direction === 0) return !target && !(state.gems ?? [state.gem]).some(gem => gem.x === x && gem.y === y) ? { cells: [], destroy: false } : null;
  if (!target) return null;
  const strength = Number(card.push[direction - 1]);
  if (!strength) return null;
  const opposite = (direction + 1) % 4;
  const [dx, dy] = DIRECTIONS[direction];
  const cells = [];
  let cx = x;
  let cy = y;
  while (inside(state, cx, cy) && state.map[cy][cx].playable !== 0) {
    const occupant = state.board[cy][cx];
    if (!occupant) return { cells, destroy: false };
    // Grass is the graveyard: occupied squares remain immovable blockers.
    if (state.map[cy][cx].playable === 1) return null;
    // Equal arrows block. The incoming hero's force must beat every defender.
    if (strength <= Number(occupant.push[opposite])) return null;
    cells.push({ x: cx, y: cy });
    // Strength 3 is reserved for bomb cards: remove the first defender.
    if (strength === 3) return { cells, destroy: true };
    cx += dx;
    cy += dy;
  }
  return null;
}

export function legalMoves(state, card) {
  if (state.finished || !card || !state.hands[state.turn].some(item => item.id === card.id)) return [];
  const moves = [];
  state.map.forEach((row, y) => row.forEach((_, x) => {
    for (let direction = 0; direction <= 4; direction++) {
      if (planMove(state, card, x, y, direction)) moves.push({ x, y, direction });
    }
  }));
  return moves;
}

export function canPlay(state) {
  return state.hands[state.turn].some(card => legalMoves(state, card).length > 0);
}

export function scoreGems(state) {
  const scores = [0, 0];
  for (const gem of state.gems ?? [state.gem]) {
    const owner = state.board[gem.y][gem.x]?.owner;
    if (owner === 0 || owner === 1) scores[owner]++;
  }
  return scores;
}

function finish(state, reason) {
  state.finished = true;
  state.reason = reason;
  const scores = scoreGems(state);
  state.winner = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
}

export function resolveMatchEnd(state) {
  if (state.finished) return state;
  if (state.map.every((row, y) => row.every((tile, x) => tile.playable !== 2 || state.board[y][x]))) {
    const next = { ...state };
    finish(next, "Every picnic tile is occupied.");
    return next;
  }
  for (const player of [state.turn, 1 - state.turn]) {
    if (!canPlay({ ...state, turn: player })) {
      const next = { ...state };
      finish(next, `Player ${player + 1} has no legal moves.`);
      return next;
    }
  }
  return state;
}

export function commitMove(state, { cardId, x, y, direction, revision }) {
  if (state.finished || revision !== state.revision) return null;
  const card = state.hands[state.turn].find(item => item.id === cardId);
  if (!card) return null;
  const plan = planMove(state, card, x, y, direction);
  if (!plan) return null;
  const next = { ...state, board: state.board.map(row => [...row]), hands: state.hands.map(hand => [...hand]),
    decks: state.decks.map(deck => [...deck]), revision: state.revision + 1, moves: state.moves + 1 };
  if (direction && !plan.destroy) {
    const [dx, dy] = DIRECTIONS[direction];
    for (const cell of [...plan.cells].reverse()) {
      let pushed = next.board[cell.y][cell.x];
      if (card.push[4] === "1" && cell.x === x && cell.y === y) pushed = { ...pushed, owner: card.owner };
      next.board[cell.y + dy][cell.x + dx] = pushed;
    }
  }
  next.board[y][x] = card;
  const slot = next.hands[state.turn].findIndex(item => item.id === cardId);
  const replacement = next.decks[state.turn].shift();
  next.hands[state.turn].splice(slot, 1, ...(replacement ? [replacement] : []));
  next.lastMove = `Player ${state.turn + 1} ${direction ? "pushed with" : "played"} ${card.name}.`;
  next.turn = 1 - state.turn;
  return resolveMatchEnd(next);
}
