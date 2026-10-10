import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createMatch, planMove, commitMove, legalMoves, canPlay, resolveMatchEnd, scoreGems, validateDeckLists } from '../game/rules.js';
import { createGameMatch, applyPlayerAction } from '../game/setup.js';
import { TILE_MAP } from '../data/maps.js';

const library = vm.runInNewContext(`${readFileSync(new URL('../data/library.js', import.meta.url), 'utf8')}\nCARD_LIBRARY`);
const hero = (id, push = '22220', owner = 0) => ({ id, name: id, push, owner });
function fixture() {
  const state = createMatch(library, TILE_MAP[0].map, () => 0.5);
  state.gem = { x: 2, y: 2 };
  state.gems = [state.gem];
  state.hands = [[hero('a'), hero('b'), hero('c')], [hero('d', '22220', 1)]];
  state.decks = [[hero('replacement')], []];
  return state;
}
const action = (state, x = 1, y = 1, direction = 0, cardId = 'a') => ({ cardId, x, y, direction, revision: state.revision });

test('dealing preserves library and gives unique cards, three per hand, thirteen per deck', () => {
  const before = JSON.stringify(library);
  for (let i = 0; i < 10; i++) {
    const state = createMatch(library, TILE_MAP[0].map);
    assert.deepEqual(state.hands.map(hand => hand.length), [3, 3]);
    assert.deepEqual(state.decks.map(deck => deck.length), [13, 13]);
    const cards = [...state.hands.flat(), ...state.decks.flat()];
    assert.equal(new Set(cards.map(card => card.id)).size, 32);
    assert.equal(new Set(cards.map(card => card.name)).size, 32);
  }
  assert.equal(JSON.stringify(library), before);
});

test('one placement consumes one card, draws one replacement, and advances turn once', () => {
  const state = fixture();
  const before = JSON.stringify(state);
  const next = commitMove(state, action(state));
  assert.equal(next.board[1][1].id, 'a');
  assert.equal(next.hands[0].length, 3);
  assert.equal(next.hands[0][0].id, 'replacement');
  assert.equal(next.decks[0].length, 0);
  assert.equal(next.turn, 1);
  assert.equal(next.revision, 1);
  assert.equal(next.moves, 1);
  assert.equal(JSON.stringify(state), before);
});

test('duplicate and stale turn callbacks cannot move a second card', () => {
  const state = fixture();
  const move = action(state);
  const next = commitMove(state, move);
  assert.equal(commitMove(next, move), null);
  assert.equal(commitMove(next, { ...move, cardId: 'd', x: 2 }), null);
});

test('wrong player, board cards, invalid coordinates, and invalid directions are rejected without mutation', () => {
  const state = fixture();
  const before = JSON.stringify(state);
  for (const move of [action(state, 1, 1, 0, 'd'), action(state, 1, 1, 0, 'unknown'), action(state, -1), action(state, 10), action(state, 1, 1, 8), action(state, 1.5), { ...action(state), direction: undefined }]) {
    assert.equal(commitMove(state, move), null);
  }
  assert.equal(JSON.stringify(state), before);
});

test('cannot directly place on the gem, grass, dirt, or an occupied tile', () => {
  const state = fixture();
  state.board[1][1] = hero('defender', '00000', 1);
  for (const [x, y] of [[2, 2], [1, 0], [0, 0], [1, 1]]) assert.equal(commitMove(state, action(state, x, y)), null);
});

test('equal arrows block, double arrows beat single arrows', () => {
  const state = fixture();
  state.board[1][1] = hero('defender', '00010', 1);
  assert.equal(planMove(state, hero('weak', '01000'), 1, 1, 2), null);
  assert.ok(planMove(state, hero('strong', '02000'), 1, 1, 2));
});

test('chain push shifts each card once and leaves no duplicate board references', () => {
  const state = fixture();
  state.board[1][1] = hero('one', '00000', 1);
  state.board[1][2] = hero('two', '00000', 1);
  const next = commitMove(state, action(state, 1, 1, 2));
  assert.deepEqual(next.board[1].map(card => card?.id ?? null), [null, 'a', 'one', 'two']);
  assert.equal(next.winner, null);
  // Not full: the remaining lower picnic tiles are empty.
  assert.equal(next.finished, false);
});

test('a defender later in the chain blocks the entire action atomically', () => {
  const state = fixture();
  state.board[1][1] = hero('one', '00000', 1);
  state.board[1][2] = hero('two', '00020', 1);
  const before = JSON.stringify(state);
  assert.equal(commitMove(state, action(state, 1, 1, 2)), null);
  assert.equal(JSON.stringify(state), before);
});

test('cannot push chains off the board or into dirt', () => {
  const state = fixture();
  state.board[1][1] = hero('one', '00000', 1);
  state.board[0][1] = hero('edge', '00000', 1);
  assert.equal(planMove(state, state.hands[0][0], 1, 1, 1), null);
  state.map[1][2].playable = 0;
  assert.equal(planMove(state, state.hands[0][0], 1, 1, 2), null);
});

test('all four push directions move toward their matching neighbor', () => {
  for (const [direction, x, y, dx, dy] of [[1, 1, 1, 0, -1], [2, 2, 1, 1, 0], [3, 1, 2, 0, 1], [4, 1, 1, -1, 0]]) {
    const state = fixture();
    state.board[y][x] = hero('defender', '00000', 1);
    const next = commitMove(state, action(state, x, y, direction));
    assert.equal(next.board[y][x].id, 'a');
    assert.equal(next.board[y + dy][x + dx].id, 'defender');
  }
});

test('empty decks shrink the hand without creating undefined cards', () => {
  const state = fixture();
  state.decks[0] = [];
  const next = commitMove(state, action(state));
  assert.equal(next.hands[0].length, 2);
  assert.ok(next.hands.flat().every(Boolean));
});

test('capture changes actual owner and bomb destroys its target', () => {
  const state = fixture();
  state.hands[0][0] = hero('a', '02001');
  state.board[1][1] = hero('defender', '00000', 1);
  assert.equal(commitMove(state, action(state, 1, 1, 2)).board[1][2].owner, 0);
  state.hands[0][0] = hero('a', '03000');
  const next = commitMove(state, action(state, 1, 1, 2));
  assert.equal(next.board[1][1].id, 'a');
  assert.equal(next.board[1][2], null);
});

test('full picnic ends the match and scores the current gem owner', () => {
  const state = fixture();
  state.board[1][2] = hero('one', '00000', 1);
  state.board[2][1] = hero('two', '00000', 0);
  state.board[2][2] = hero('gem-holder', '00000', 1);
  const next = commitMove(state, action(state));
  assert.equal(next.finished, true);
  assert.equal(next.winner, 1);
  assert.equal(commitMove(next, action(next, 1, 1, 2, 'd')), null);
  assert.deepEqual(legalMoves(next, next.hands[1][0]), []);
});

test('one blocked player ends the match even if the other player can move; equal scores draw', () => {
  const state = fixture();
  assert.equal(resolveMatchEnd(state), state);
  state.hands[0] = [];
  assert.ok(canPlay({ ...state, turn: 1 }));
  const draw = resolveMatchEnd(state);
  assert.equal(draw.finished, true);
  assert.equal(draw.winner, null);
  assert.equal(draw.reason, 'Player 1 has no legal moves.');
  assert.equal(state.finished, false);
  assert.equal(applyPlayerAction(draw, { type: 'pass', player: 0, matchId: draw.matchId, revision: draw.revision }), null);
});

test('a move that blocks the next player ends automatically and scores gems without forfeiting', () => {
  const state = fixture();
  state.hands[1] = [hero('blocked', '00000', 1)];
  state.board[1][2] = hero('defender', '00000', 0);
  state.board[2][1] = hero('defender-two', '00000', 1);
  // The final empty non-gem space is filled; Player 2 cannot push onto the gem.
  const next = commitMove(state, action(state));
  assert.equal(next.finished, true);
  assert.equal(next.reason, 'Player 2 has no legal moves.');
  assert.equal(next.winner, null);
  assert.equal(next.board[2][2], null);
  assert.equal(commitMove(next, action(next, 1, 1, 2, 'blocked')), null);

  const scored = fixture();
  scored.hands[1] = [];
  scored.board[2][2] = hero('gem-owner', '00000', 1);
  const won = commitMove(scored, action(scored));
  assert.equal(won.finished, true);
  assert.equal(won.winner, 1);
  assert.equal(won.reason, 'Player 2 has no legal moves.');
});

test('seeded complete matches preserve card counts and terminate', () => {
  for (const map of TILE_MAP) {
  for (let seed = 1; seed <= 100; seed++) {
    let value = seed;
    const random = () => ((value = (value * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    let state = createMatch(library, map.map, random, { gemCount: map.gemCount });
    let steps = 0;
    while (!state.finished && steps++ < 100) {
      const choices = state.hands[state.turn].flatMap(card => legalMoves(state, card).map(move => ({ ...move, cardId: card.id, revision: state.revision })));
      assert.ok(choices.length, 'An ongoing match must have a legal move');
      const next = commitMove(state, choices[Math.floor(random() * choices.length)]);
      assert.ok(next);
      const cards = [...next.board.flat().filter(Boolean), ...next.hands.flat(), ...next.decks.flat()];
      assert.equal(cards.length, 32);
      assert.equal(new Set(cards.map(card => card.id)).size, 32);
      assert.equal(next.turn, 1 - state.turn);
      assert.equal(next.revision, state.revision + 1);
      state = next;
    }
    assert.ok(state.finished, `${map.id} seed ${seed} should finish`);
  }
  }
});

test('multiple gems are distinct, cannot receive direct placements, and score independently', () => {
  const state = createGameMatch(library, { seed: 42, mapId: 'courtyard' });
  assert.equal(state.gems.length, 3);
  assert.equal(new Set(state.gems.map(gem => `${gem.x},${gem.y}`)).size, 3);
  state.gems.forEach((gem, i) => {
    assert.equal(commitMove(state, { ...action(state), cardId: state.hands[0][0].id, ...gem }), null);
    state.board[gem.y][gem.x] = hero(`holder-${i}`, '00000', i === 2 ? 1 : 0);
  });
  assert.deepEqual(scoreGems(state), [2, 1]);
});

test('equal gem ownership draws and stealing a gem changes the score', () => {
  const state = fixture();
  state.gems = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
  state.board[1][1] = hero('opponent', '00000', 1);
  state.board[2][2] = hero('mine', '00000', 0);
  assert.deepEqual(scoreGems(state), [1, 1]);
  const next = commitMove(state, action(state, 1, 1, 4));
  assert.deepEqual(scoreGems(next), [2, 0]);
  state.board[1][2] = hero('other', '00000', 0);
  const draw = commitMove(state, action(state, 1, 2));
  assert.equal(draw.finished, true);
  assert.equal(draw.winner, null);
});

test('grass occupants stay on the board and block further pushes', () => {
  const state = fixture();
  state.board[1][1] = hero('defender', '00000', 1);
  const next = commitMove(state, action(state, 1, 1, 4));
  assert.equal(next.board[1][0].id, 'defender');
  next.hands[1][0].push = '22220';
  const before = JSON.stringify(next);
  assert.equal(commitMove(next, action(next, 1, 1, 4, 'd')), null);
  assert.equal(JSON.stringify(next), before);
});

test('chosen decks are validated and dealt only from selected cards', () => {
  const lists = [library.slice(0, 16).map(card => card.name), library.slice(0, 16).map(card => card.name)];
  const state = createGameMatch(library, { seed: 7, deckLists: lists });
  for (const owner of [0, 1]) {
    const cards = [...state.hands[owner], ...state.decks[owner]];
    assert.deepEqual(cards.map(card => card.name).sort(), [...lists[owner]].sort());
    assert.ok(cards.every(card => card.owner === owner));
  }
  assert.equal(new Set([...state.hands.flat(), ...state.decks.flat()].map(card => card.id)).size, 32);
  assert.throws(() => validateDeckLists(library, [lists[0].slice(1), lists[1]]));
  assert.throws(() => validateDeckLists(library, [[...lists[0].slice(1), lists[0][1]], lists[1]]));
  assert.throws(() => validateDeckLists(library, [[...lists[0].slice(1), 'unknown'], lists[1]]));
});

test('shared seeded setup reproduces after serialization and rejects wrong-player or wrong-match actions', () => {
  const state = createGameMatch(library, { seed: 42, previousMapId: 'classic' });
  const replica = createGameMatch(library, { seed: state.seed, mapId: state.mapId });
  assert.deepEqual(replica, state);
  const card = state.hands[state.turn].find(card => legalMoves(state, card).length);
  const move = { ...legalMoves(state, card)[0], cardId: card.id, revision: state.revision,
    type: 'move', player: state.turn, matchId: state.matchId };
  assert.equal(applyPlayerAction(state, { ...move, player: 1 }), null);
  assert.equal(applyPlayerAction(state, { ...move, matchId: 'other-match' }), null);
  const next = applyPlayerAction(state, move);
  assert.deepEqual(applyPlayerAction(JSON.parse(JSON.stringify(state)), move), next);
  assert.equal(applyPlayerAction(next, move), null);
});

test('map pool is varied and rerolls avoid the previous layout', () => {
  const ids = new Set();
  for (let seed = 1; seed <= 100; seed++) ids.add(createGameMatch(library, { seed: seed * 98765 }).mapId);
  assert.equal(ids.size, TILE_MAP.length);
  for (const map of TILE_MAP) assert.notEqual(createGameMatch(library, { seed: 3, previousMapId: map.id }).mapId, map.id);
});

test('most maps have a connected 3x3 playable area and three reachable gems', () => {
  const standard = TILE_MAP.filter(map => map.gemCount === 3 && map.map.length === 5 && map.map[0].length === 5
    && map.map.every((row, y) => row.every((tile, x) => (tile.playable === 2) === (x >= 1 && x <= 3 && y >= 1 && y <= 3))));
  assert.ok(standard.length > TILE_MAP.length / 2);
  assert.equal(new Set(TILE_MAP.map(map => map.id)).size, TILE_MAP.length);
  assert.equal(new Set(TILE_MAP.map(map => JSON.stringify(map.map))).size, TILE_MAP.length);
  for (const map of TILE_MAP) {
    const picnic = map.map.flatMap((row, y) => row.flatMap((tile, x) => tile.playable === 2 ? [{ x, y }] : []));
    assert.ok(picnic.length > map.gemCount);
    for (const { x, y } of picnic) assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => map.map[y + dy]?.[x + dx]?.playable === 2), `${map.id} has an isolated potential gem`);
  }
});
