import { TILE_MAP } from '../data/maps.js';
import { createMatch, commitMove } from './rules.js';

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => ((value = (value * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// The host selects the seed and map once; clients receive the authoritative state.
export function createGameMatch(library, options = {}) {
  const seed = options.seed ?? globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid match seed.');
  const random = seededRandom(seed);
  const pool = TILE_MAP.filter(map => map.id !== options.previousMapId);
  const selected = options.mapId ? TILE_MAP.find(map => map.id === options.mapId)
    : pool[Math.floor(random() * pool.length)];
  if (!selected) throw new Error('Unknown map.');
  // Consume the map roll for fixed maps too, so saved setups reproduce exactly.
  if (options.mapId) random();
  const state = createMatch(library, selected.map, random, { ...options, gemCount: selected.gemCount });
  return { ...state, rulesVersion: 2, matchId: options.matchId ?? `match-${seed}`,
    seed, mapId: selected.id, mapTitle: selected.title };
}

// Transport-independent action boundary. The online host derives player from
// the authenticated connection, never trust a player number sent by a client.
export function applyPlayerAction(state, action) {
  if (!action || action.player !== state.turn || action.matchId !== state.matchId) return null;
  if (action.type === 'move') return commitMove(state, action);
  return null;
}
