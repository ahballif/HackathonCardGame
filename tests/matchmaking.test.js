import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { once } from 'node:events';
import { deckStrength, findPair, expectedScore, ratedResult } from '../server/matchmaking.js';
import { ProfileStore } from '../server/profiles.js';
import { createGameServer } from '../server/server.js';
import { legalMoves } from '../game/rules.js';

const entry = (id, overrides = {}) => ({ id, rating: 1000, strength: 50, games: 0, queuedAt: 0, opponents: [], ...overrides });
const library = vm.runInNewContext(`${readFileSync(new URL('../data/library.js', import.meta.url), 'utf8')}\nCARD_LIBRARY`);
test('deck strength rewards doubles, coverage, and balanced directions', () => {
  const strength = push => deckStrength(Array(16).fill({ push }));
  assert.equal(strength('00000'), 0);
  assert.ok(strength('20000') > strength('10000'));
  assert.ok(strength('11110') > strength('20000'));
  assert.equal(strength('22220'), 100);
});
test('matching prioritizes oldest eligible player then closest opponent', () => {
  const a = entry('a'), b = entry('b', { rating: 1020, queuedAt: 100 }), c = entry('c', { rating: 1001, queuedAt: 200 });
  assert.deepEqual(findPair([b, c, a], 1000).map(player => player.id), ['a', 'c']);
  assert.equal(findPair([a, a], 1000), null);
});
test('wait windows widen but fresh players and hard deck differences stay protected', () => {
  const a = entry('a'), b = entry('b', { rating: 1150 });
  assert.equal(findPair([a, b], 0), null);
  assert.ok(findPair([a, b], 120000));
  assert.equal(findPair([a, { ...b, queuedAt: 120000 }], 120000), null);
  const strong = entry('strong', { rating: 800, strength: 80 });
  const weak = entry('weak', { rating: 1200, strength: 30 });
  assert.equal(expectedScore(strong, weak), 0.5);
  assert.equal(findPair([strong, weak], 1000000), null);
});
test('recent opponents cannot farm rated rematches', () => {
  const a = entry('a', { opponents: [{ id: 'b', at: 0 }] }), b = entry('b');
  assert.equal(findPair([a, b], 1000), null);
  assert.ok(findPair([a, b], 600001));
});
test('results track draws and account for deck advantage in rating changes', () => {
  const a = { ...entry('a'), wins: 0, losses: 0, draws: 0 }, b = { ...a, id: 'b' };
  const win = ratedResult(a, b, 0, [50, 50], 100);
  assert.deepEqual(win.map(profile => profile.rating), [1020, 980]);
  assert.equal(win[0].wins, 1); assert.equal(win[1].losses, 1);
  const draw = ratedResult(a, b, null, [50, 50], 100);
  assert.ok(draw.every(profile => profile.rating === 1000 && profile.draws === 1 && profile.games === 1));
  assert.ok(ratedResult(a, b, 0, [70, 50], 100)[0].rating < win[0].rating);
});
test('guest credentials and server-owned results persist across restart', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'heroes-profile-'));
  try {
    const filename = path.join(directory, 'profiles.json');
    const store = new ProfileStore(filename);
    const profile = store.create(); profile.rating = 1234;
    await store.save();
    const restored = new ProfileStore(filename);
    assert.equal(restored.authenticate(profile.token).rating, 1234);
    assert.equal(restored.authenticate('fake'), undefined);
  } finally { await rm(directory, { recursive: true }); }
});
test('queue locks canonical decks, assigns two seats, records once, and leaves practice unrated', async () => {
  let clock = 10000;
  const store = new ProfileStore();
  const server = createGameServer({ profiles: store, now: () => clock });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const streams = [];
  async function post(route, data) { const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return { status: response.status, data: await response.json() }; }
  async function connect(session) {
    const abort = new AbortController();
    const response = await fetch(`${base}/api/rooms/${session.code}/events?token=${session.token}`, { signal: abort.signal });
    await response.body.getReader().read(); streams.push(abort);
  }
  try {
    const a = (await post('/api/profile', {})).data, b = (await post('/api/profile', {})).data;
    assert.equal((await post('/api/profile', { profileToken: 'fake', rating: 1 })).status, 401);
    assert.equal((await post('/api/profile', { profileToken: a.token, rating: 2500 })).data.profile.rating, 1000);
    const deck = library.slice(20, 36).map(card => card.name);
    assert.equal((await post('/api/matchmaking/join', { profileToken: a.token, deck: ['fake'] })).status, 400);
    assert.equal((await post('/api/matchmaking/join', { profileToken: a.token, deck })).data.status, 'searching');
    assert.equal((await post('/api/matchmaking/join', { profileToken: a.token, deck })).data.status, 'searching');
    assert.equal((await post('/api/matchmaking/cancel', { profileToken: a.token })).data.status, 'idle');
    await post('/api/matchmaking/join', { profileToken: a.token, deck });
    clock += 31000;
    assert.equal((await post('/api/matchmaking/status', { profileToken: a.token })).data.status, 'idle');
    await post('/api/matchmaking/join', { profileToken: a.token, deck });
    const foundB = (await post('/api/matchmaking/join', { profileToken: b.token, deck })).data;
    const foundA = (await post('/api/matchmaking/status', { profileToken: a.token })).data;
    assert.equal(foundB.status, 'matched'); assert.equal(foundA.status, 'matched');
    assert.equal(foundA.session.code, foundB.session.code);
    assert.notEqual(foundA.session.player, foundB.session.player);
    assert.equal(foundA.room.state.gems.length, 3);
    assert.equal(foundA.room.state.map.flat().filter(tile => tile.playable === 2).length, 9);
    await connect(foundA.session); await connect(foundB.session);
    assert.equal((await post('/api/matchmaking/join', { profileToken: a.token, deck })).status, 409);
    const seats = [foundA.session, foundB.session].sort((x, y) => x.player - y.player);
    let state = foundA.room.state;
    let lastMove;
    for (let i = 0; !state.finished && i < 40; i++) {
      const card = state.hands[state.turn].find(card => legalMoves(state, card).length);
      lastMove = { ...legalMoves(state, card)[0], cardId: card.id, revision: state.revision, matchId: state.matchId, token: seats[state.turn].token };
      state = (await post(`/api/rooms/${seats[0].code}/action`, lastMove)).data.state;
    }
    assert.equal(state.finished, true);
    const record = (await post('/api/profile', { profileToken: a.token })).data.profile;
    assert.equal(record.games, 1);
    assert.equal(record.wins + record.losses + record.draws, 1);
    assert.equal((await post(`/api/rooms/${seats[0].code}/action`, lastMove)).status, 409);
    assert.equal((await post('/api/profile', { profileToken: a.token })).data.profile.games, 1);
    await post(`/api/rooms/${seats[0].code}/rematch`, { token: seats[0].token });
    const practice = (await post(`/api/rooms/${seats[0].code}/rematch`, { token: seats[1].token })).data;
    assert.equal(practice.ranked, false);
    await post(`/api/rooms/${seats[0].code}/leave`, { token: seats[0].token });
    assert.equal((await post('/api/profile', { profileToken: a.token })).data.profile.games, 1);
  } finally { streams.forEach(abort => abort.abort()); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('ranked leave and expired reconnect grace record one forfeit; absent arrivals stay unrated', async () => {
  let clock = 10000;
  const store = new ProfileStore();
  const server = createGameServer({ profiles: store, now: () => clock, disconnectGraceMs: 100 });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const streams = [];
  async function post(route, data) {
    const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    assert.equal(response.status, 200);
    return response.json();
  }
  async function pair() {
    const profiles = [await post('/api/profile', {}), await post('/api/profile', {})];
    const deck = library.slice(20, 36).map(card => card.name);
    await post('/api/matchmaking/join', { profileToken: profiles[0].token, deck });
    const b = await post('/api/matchmaking/join', { profileToken: profiles[1].token, deck });
    const a = await post('/api/matchmaking/status', { profileToken: profiles[0].token });
    return { profiles, sessions: [a.session, b.session] };
  }
  async function connect(session) {
    const abort = new AbortController();
    const response = await fetch(`${base}/api/rooms/${session.code}/events?token=${session.token}`, { signal: abort.signal });
    await response.body.getReader().read(); streams.push(abort); return abort;
  }
  try {
    const left = await pair();
    for (const session of left.sessions) await connect(session);
    await post(`/api/rooms/${left.sessions[0].code}/leave`, { token: left.sessions[0].token });
    const loser = await post('/api/profile', { profileToken: left.profiles[0].token });
    const winner = await post('/api/profile', { profileToken: left.profiles[1].token });
    assert.equal(loser.profile.losses, 1); assert.equal(winner.profile.wins, 1);

    const dropped = await pair();
    const abort = await connect(dropped.sessions[0]); await connect(dropped.sessions[1]);
    abort.abort();
    for (let i = 0; i < 20; i++) {
      const snapshot = await post(`/api/rooms/${dropped.sessions[1].code}/snapshot`, { token: dropped.sessions[1].token });
      if (!snapshot.players[dropped.sessions[0].player].connected) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    clock += 101;
    await new Promise(resolve => setTimeout(resolve, 1100));
    const final = await post(`/api/rooms/${dropped.sessions[1].code}/snapshot`, { token: dropped.sessions[1].token });
    assert.equal(final.state.finished, true); assert.equal(final.state.winner, dropped.sessions[1].player);
    assert.equal(final.ratings[dropped.sessions[1].player].wins, 1);
    await post(`/api/rooms/${dropped.sessions[1].code}/leave`, { token: dropped.sessions[1].token });
    assert.equal((await post('/api/profile', { profileToken: dropped.profiles[1].token })).profile.games, 1);

    const absent = await pair(); clock += 61000;
    await new Promise(resolve => setTimeout(resolve, 1100));
    assert.equal((await post('/api/matchmaking/status', { profileToken: absent.profiles[0].token })).status, 'idle');
    assert.equal((await post('/api/profile', { profileToken: absent.profiles[0].token })).profile.games, 0);
  } finally { streams.forEach(abort => abort.abort()); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
