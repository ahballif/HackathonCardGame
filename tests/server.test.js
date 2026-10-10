import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createGameServer } from '../server/server.js';
import { legalMoves } from '../game/rules.js';

test('authoritative rooms validate seats, moves, reconnect, rematch, and private draw piles', async () => {
  const server = createGameServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const streams = [];
  async function post(path, data) {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return { status: response.status, data: await response.json() };
  }
  async function connect(code, token) {
    const abort = new AbortController();
    const response = await fetch(`${base}/api/rooms/${code}/events?token=${token}`, { signal: abort.signal });
    assert.equal(response.status, 200);
    const reader = response.body.getReader();
    await reader.read();
    streams.push({ abort, reader });
    return abort;
  }
  try {
    assert.equal((await post('/api/rooms', { mapId: 'fake' })).status, 400);
    assert.equal((await post('/api/rooms', { deck: ['fake'] })).status, 400);
    const host = (await post('/api/rooms', { mapId: 'courtyard' })).data;
    assert.equal(host.player, 0);
    await connect(host.code, host.token);
    const guest = (await post(`/api/rooms/${host.code}/join`, {})).data;
    assert.equal(guest.player, 1);
    await connect(host.code, guest.token);
    assert.equal((await post(`/api/rooms/${host.code}/join`, {})).status, 409);
    assert.equal((await post(`/api/rooms/${host.code}/snapshot`, { token: 'wrong' })).status, 401);
    let snapshot = (await post(`/api/rooms/${host.code}/snapshot`, { token: host.token })).data;
    assert.equal(snapshot.state.mapId, 'courtyard');
    assert.equal(snapshot.state.gems.length, 3);
    assert.equal(snapshot.state.seed, undefined);
    assert.ok(snapshot.state.decks.flat().every(card => card === null));
    const state = snapshot.state;
    const card = state.hands[0].find(card => legalMoves(state, card).length);
    const move = { ...legalMoves(state, card)[0], cardId: card.id, revision: state.revision, matchId: state.matchId };
    assert.equal((await post(`/api/rooms/${host.code}/action`, { ...move, token: guest.token, player: 0 })).status, 409);
    const accepted = await post(`/api/rooms/${host.code}/action`, { ...move, token: host.token, player: 1 });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.state.revision, 1);
    assert.equal((await post(`/api/rooms/${host.code}/action`, { ...move, token: host.token })).status, 409);
    assert.equal((await post(`/api/rooms/${host.code}/rematch`, { token: host.token })).status, 409);

    const disconnected = streams.pop();
    disconnected.abort.abort();
    let paused;
    for (let i = 0; i < 30; i++) {
      paused = (await post(`/api/rooms/${host.code}/snapshot`, { token: host.token })).data;
      if (!paused.players[1].connected) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(paused.players[1].connected, false);
    const guestCard = paused.state.hands[1].find(card => legalMoves(paused.state, card).length);
    const guestMove = { ...legalMoves(paused.state, guestCard)[0], cardId: guestCard.id, revision: 1, matchId: state.matchId, token: guest.token };
    assert.equal((await post(`/api/rooms/${host.code}/action`, guestMove)).status, 409);
    await connect(host.code, guest.token);
    snapshot = (await post(`/api/rooms/${host.code}/snapshot`, { token: host.token })).data;
    for (let i = 0; !snapshot.state.finished && i < 40; i++) {
      const current = snapshot.state;
      const hero = current.hands[current.turn].find(card => legalMoves(current, card).length);
      assert.ok(hero);
      const next = await post(`/api/rooms/${host.code}/action`, { ...legalMoves(current, hero)[0], cardId: hero.id,
        revision: current.revision, matchId: current.matchId, token: current.turn === 0 ? host.token : guest.token });
      assert.equal(next.status, 200);
      snapshot = next.data;
    }
    assert.equal(snapshot.state.finished, true);
    assert.equal((await post(`/api/rooms/${host.code}/rematch`, { token: host.token })).data.state.matchId, state.matchId);
    const rematch = (await post(`/api/rooms/${host.code}/rematch`, { token: guest.token })).data;
    assert.notEqual(rematch.state.matchId, state.matchId);
    assert.equal(rematch.state.moves, 0);
    assert.equal(rematch.state.mapId, 'courtyard');
    assert.equal((await post(`/api/rooms/${host.code}/action`, { ...move, token: host.token })).status, 409);
    assert.equal((await fetch(base + '/server/server.js')).status, 404);
    assert.equal((await post(`/api/rooms/${host.code}/leave`, { token: guest.token })).status, 200);
    assert.equal((await post(`/api/rooms/${host.code}/snapshot`, { token: host.token })).status, 404);
  } finally {
    streams.forEach(stream => stream.abort.abort());
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
