import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { createGameMatch, applyPlayerAction } from '../game/setup.js';
import { validateDeckLists } from '../game/rules.js';
import { TILE_MAP } from '../data/maps.js';
import { deckStrength, findPair, ratedResult } from './matchmaking.js';
import { ProfileStore, publicProfile } from './profiles.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const library = vm.runInNewContext(`${await readFile(new URL('../data/library.js', import.meta.url), 'utf8')}\nCARD_LIBRARY`);
const token = () => randomBytes(24).toString('hex');
function failure(message, status = 400) { const error = new Error(message); error.status = status; throw error; }

export function createGameServer({ profiles = new ProfileStore(), now = Date.now, disconnectGraceMs = 90000 } = {}) {
  const rooms = new Map();
  const queue = new Map();
  const assignments = new Map();
  const publicRoom = room => ({ code: room.code, players: room.players.map((player, i) => ({ player: i, connected: player.connections.size > 0 })),
    ranked: !!room.ranked, ratings: room.players.map(player => player.profileId ? publicProfile(profiles.profiles.get(player.profileId)) : null),
    votes: [...room.votes], state: room.state ? { ...room.state, seed: undefined,
      decks: room.state.decks.map(deck => Array(deck.length).fill(null)) } : null });
  function broadcast(room, action = null) {
    const message = `data: ${JSON.stringify({ ...publicRoom(room), action })}\n\n`;
    room.players.forEach(player => player.connections.forEach(response => response.write(message)));
  }
  function authenticate(room, credential) {
    const player = room.players.findIndex(player => player.token === credential);
    if (player < 0) failure('Room credentials are invalid.', 401);
    return player;
  }
  function profileFor(credential) {
    const profile = profiles.authenticate(credential);
    if (!profile) failure('Guest profile is invalid. Reload and try again.', 401);
    return profile;
  }
  function randomDeck() {
    const cards = [...library];
    for (let i = cards.length - 1; i > 0; i--) { const j = randomInt(i + 1); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    return cards.slice(0, 16).map(card => card.name);
  }
  function newCode() {
    let code;
    do { code = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
    return code;
  }
  async function record(room) {
    if (!room.ranked || !room.state.finished || room.ratedMatchId === room.state.matchId) return;
    room.ratedMatchId = room.state.matchId;
    const [a, b] = room.players.map(player => profiles.profiles.get(player.profileId));
    ratedResult(a, b, room.state.winner, room.strengths, now()).forEach(profile => profiles.profiles.set(profile.id, profile));
    await profiles.save().catch(() => {});
  }
  function matchQueue() {
    for (const [id, entry] of queue) if (now() - entry.seenAt > 30000) queue.delete(id);
    for (const [id, assignment] of assignments) if (!rooms.has(assignment.code)) assignments.delete(id);
    let pair;
    while (rooms.size < 500 && (pair = findPair([...queue.values()], now()))) {
      if (randomInt(2)) pair.reverse();
      const standard = TILE_MAP.filter(map => map.gemCount === 3 && map.map.flat().filter(tile => tile.playable === 2).length === 9);
      const room = { code: newCode(), ranked: true, mapId: standard[randomInt(standard.length)].id,
        strengths: pair.map(entry => entry.strength), players: pair.map(entry => ({ token: token(), deck: entry.deck, profileId: entry.id, connections: new Set() })),
        state: null, votes: new Set(), touched: now(), assignedAt: now() };
      start(room); rooms.set(room.code, room);
      pair.forEach((entry, player) => {
        queue.delete(entry.id);
        assignments.set(entry.id, { code: room.code, token: room.players[player].token, player });
      });
    }
  }
  function queueStatus(profile) {
    const assignment = assignments.get(profile.id);
    if (assignment) return { status: 'matched', session: assignment, room: publicRoom(rooms.get(assignment.code)), profile: publicProfile(profile) };
    const entry = queue.get(profile.id);
    return { status: entry ? 'searching' : 'idle', waited: entry ? Math.floor((now() - entry.queuedAt) / 1000) : 0,
      strength: entry?.strength, profile: publicProfile(profile) };
  }
  function start(room) {
    const lists = room.players.map(player => {
      if (player.deck) return player.deck;
      return randomDeck();
    });
    room.state = createGameMatch(library, { mapId: room.mapId, previousMapId: room.state?.mapId,
      deckLists: lists, matchId: token() });
    room.votes.clear();
  }
  async function body(request) {
    let data = '';
    for await (const chunk of request) { data += chunk; if (data.length > 16384) failure('Request too large.', 413); }
    try { return JSON.parse(data || '{}'); } catch { failure('Invalid JSON.'); }
  }
  function json(response, status, value) { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(value)); }
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}` && request.headers.origin !== `https://${request.headers.host}`) failure('Use the same server for the game and room requests.', 403);
        const data = request.method === 'POST' ? await body(request) : {};
        if (url.pathname === '/api/profile' && request.method === 'POST') {
          const profile = data.profileToken ? profileFor(data.profileToken) : profiles.create();
          await profiles.save();
          return json(response, 200, { token: profile.token, profile: publicProfile(profile) });
        }
        if (/^\/api\/matchmaking\/(join|status|cancel)$/.test(url.pathname) && request.method === 'POST') {
          const profile = profileFor(data.profileToken);
          matchQueue();
          const operation = url.pathname.split('/').pop();
          if (operation === 'join' && !queue.has(profile.id) && !assignments.has(profile.id)) {
            if (queue.size >= 500) failure('Matchmaking is full. Try again later.', 503);
            if ([...rooms.values()].some(room => room.ranked && !room.state.finished && room.players.some(player => player.profileId === profile.id))) failure('You already have an active ranked match.', 409);
            const deck = data.deck ?? randomDeck();
            const cards = validateDeckLists(library, [deck, deck])[0];
            queue.set(profile.id, { ...profile, deck: [...deck], strength: deckStrength(cards), queuedAt: now(), seenAt: now() });
          }
          if (operation === 'cancel') queue.delete(profile.id);
          else if (queue.has(profile.id)) queue.get(profile.id).seenAt = now();
          matchQueue();
          return json(response, 200, queueStatus(profiles.profiles.get(profile.id)));
        }
        if (url.pathname === '/api/rooms' && request.method === 'POST') {
          if (rooms.size >= 500) failure('Server is full. Try again later.', 503);
          if (data.mapId && !TILE_MAP.some(map => map.id === data.mapId)) failure('Unknown map.');
          if (data.deck) validateDeckLists(library, [data.deck, data.deck]);
          const code = newCode();
          const room = { code, mapId: data.mapId || undefined, players: [{ token: token(), deck: data.deck || null, connections: new Set() }], state: null, votes: new Set(), touched: Date.now() };
          rooms.set(code, room);
          return json(response, 201, { code, token: room.players[0].token, player: 0, ...publicRoom(room) });
        }
        const match = /^\/api\/rooms\/([A-F0-9]{6})\/(join|events|snapshot|action|rematch|leave)$/.exec(url.pathname);
        if (!match) failure('Endpoint not found.', 404);
        const room = rooms.get(match[1]);
        if (!room) failure('Room no longer exists. Create a new room.', 404);
        room.touched = Date.now();
        const operation = match[2];
        if (operation === 'join' && request.method === 'POST') {
          if (room.players.length === 2) failure('This room already has two players.', 409);
          if (data.deck) validateDeckLists(library, [data.deck, data.deck]);
          room.players.push({ token: token(), deck: data.deck || null, connections: new Set() });
          start(room); broadcast(room);
          return json(response, 200, { ...publicRoom(room), token: room.players[1].token, player: 1 });
        }
        const player = authenticate(room, operation === 'events' ? url.searchParams.get('token') : data.token);
        if (operation === 'events' && request.method === 'GET') {
          response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
          room.players[player].connections.add(response);
          if (room.players.length === 2 && room.players.every(member => member.connections.size)) { room.started = true; room.disconnectedAt = null; }
          if (room.players[player].profileId) assignments.delete(room.players[player].profileId);
          broadcast(room);
          const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15000);
          request.on('close', () => { clearInterval(heartbeat); room.players[player].connections.delete(response); room.touched = Date.now(); if (!room.players[player].connections.size && room.started) room.disconnectedAt ??= now(); broadcast(room); });
          return;
        }
        if (request.method !== 'POST') failure('Method not allowed.', 405);
        if (operation === 'snapshot') return json(response, 200, publicRoom(room));
        if (operation === 'leave') {
          if (room.ranked && room.started && !room.state.finished) {
            room.state = { ...room.state, finished: true, winner: 1 - player, reason: `Player ${player + 1} left the ranked match.`, revision: room.state.revision + 1 };
            await record(room);
            broadcast(room);
          }
          room.players.forEach(member => member.connections.forEach(connection => { connection.write(`data: ${JSON.stringify({ closed: true })}\n\n`); connection.end(); }));
          rooms.delete(room.code);
          return json(response, 200, { closed: true });
        }
        if (!room.state || room.players.length !== 2 || room.players.some(member => !member.connections.size)) failure('Waiting for both players to connect.', 409);
        if (operation === 'rematch') {
          if (!room.state.finished) failure('Finish this match before requesting a rematch.', 409);
          room.votes.add(player);
          if (room.votes.size === 2) { room.ranked = false; start(room); }
          broadcast(room);
          return json(response, 200, publicRoom(room));
        }
        if (operation === 'action') {
          // Pick only permitted fields. Ownership is derived from the room credential.
          const action = { type: 'move', player, matchId: data.matchId, revision: data.revision,
            cardId: data.cardId, x: data.x, y: data.y, direction: data.direction };
          const next = applyPlayerAction(room.state, action);
          if (!next) failure('That move is no longer legal. Wait for the latest board.', 409);
          room.state = next;
          await record(room);
          broadcast(room, action);
          return json(response, 200, { ...publicRoom(room), action });
        }
        failure('Endpoint not found.', 404);
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') failure('Method not allowed.', 405);
      const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      if (!/^\/(index\.html|main\.js|(?:assets|Cards|data|game|scenes|objects)\/[^\\]+)$/.test(name)) failure('File not found.', 404);
      const filename = path.resolve(root, '.' + name);
      if (!filename.startsWith(root + path.sep) && !filename.startsWith(root)) failure('File not found.', 404);
      const content = await readFile(filename);
      const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
      response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) { if (!response.headersSent) json(response, error.status || (error.code === 'ENOENT' ? 404 : 400), { error: error.message }); }
  });
  const matchmaking = setInterval(() => {
    matchQueue();
    for (const room of rooms.values()) {
      if (room.ranked && !room.started && now() - room.assignedAt > 60000) {
        room.players.forEach(player => player.connections.forEach(connection => { connection.write('data: {"closed":true}\n\n'); connection.end(); }));
        rooms.delete(room.code);
      } else if (room.ranked && room.started && !room.state.finished && room.disconnectedAt != null && now() - room.disconnectedAt >= disconnectGraceMs) {
        const connected = room.players.flatMap((player, index) => player.connections.size ? [index] : []);
        if (connected.length === 1) {
          room.state = { ...room.state, finished: true, winner: connected[0], reason: 'Opponent did not reconnect within 90 seconds.', revision: room.state.revision + 1 };
          record(room).then(() => broadcast(room)).catch(() => broadcast(room));
        }
      }
    }
  }, 1000);
  matchmaking.unref();
  const cleanup = setInterval(() => {
    for (const [code, room] of rooms) if (Date.now() - room.touched > 2 * 60 * 60 * 1000 && room.players.every(player => !player.connections.size)) rooms.delete(code);
  }, 60000);
  cleanup.unref();
  server.on('close', () => { clearInterval(cleanup); clearInterval(matchmaking); });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  createGameServer({ profiles: new ProfileStore(path.join(root, '.data', 'profiles.json')) }).listen(port, process.env.HOST || '0.0.0.0', () => console.log(`History Heroes server listening on port ${port}`));
}
