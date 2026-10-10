import { readDeckLists } from './deck-builder.js';

export class OnlineController {
  constructor(game, library) {
    this.game = game;
    this.library = library;
    this.session = null;
    this.room = null;
    this.connected = false;
    this.pending = null;
    this.retiredMatches = new Set();
    this.status = document.getElementById('online-status');
    this.code = document.getElementById('room-code');
    const invitation = new URL(location.href).searchParams.get('room');
    if (invitation) this.code.value = invitation.toUpperCase();
    document.getElementById('room-create').onclick = () => this.enter('create');
    document.getElementById('room-join').onclick = () => this.enter('join');
    document.getElementById('room-leave').onclick = () => this.leave();
    document.getElementById('match-find').onclick = () => this.findMatch();
    document.getElementById('match-cancel').onclick = () => this.cancelSearch();
    this.searching = false;
    this.matchStatus = document.getElementById('match-status');
    this.timer = setInterval(() => this.flush(), 50);
    try {
      const saved = JSON.parse(sessionStorage.getItem('history-heroes-room'));
      if (saved) this.resume(saved);
      else if (sessionStorage.getItem('history-heroes-search')) this.findMatch(true);
    } catch { /* No saved room. */ }
  }

  async request(path, data) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    let result;
    try { result = await response.json(); } catch { throw new Error('Online play needs the Node game server. Run npm start.'); }
    if (!response.ok) throw new Error(result.error || 'Room request failed.');
    return result;
  }

  async enter(kind) {
    if (this.session || this.busy || this.searching) return;
    this.busy = true;
    this.status.textContent = 'Connecting…';
    try {
      const owner = kind === 'create' ? 0 : 1;
      const deck = readDeckLists(this.library)?.[owner];
      const code = this.code.value.trim().toUpperCase();
      if (kind === 'join' && !/^[A-F0-9]{6}$/.test(code)) throw new Error('Enter a six-character room code.');
      const result = await this.request(kind === 'create' ? '/api/rooms' : `/api/rooms/${code}/join`,
        { deck, mapId: document.getElementById('debug-map').value || undefined });
      this.attach({ code: result.code, token: result.token, player: result.player });
      this.receive(result);
    } catch (error) { this.status.textContent = error.message; }
    finally { this.busy = false; }
  }

  async resume(session) {
    this.status.textContent = 'Rejoining room…';
    try {
      const room = await this.request(`/api/rooms/${session.code}/snapshot`, { token: session.token });
      this.attach(session); this.receive(room);
    } catch (error) { sessionStorage.removeItem('history-heroes-room'); this.status.textContent = error.message; }
  }

  attach(session) {
    this.stopSearch();
    this.session = session;
    sessionStorage.setItem('history-heroes-room', JSON.stringify(session));
    this.code.value = session.code;
    this.code.readOnly = true;
    for (const id of ['room-create', 'room-join', 'debug-map', 'deck-builder-open', 'match-find', 'match-deck']) document.getElementById(id).disabled = true;
    document.getElementById('room-leave').hidden = false;
    const link = document.getElementById('room-invite');
    link.href = `${location.origin}/?room=${session.code}`;
    link.textContent = `Invite link · ${session.code}`;
    link.hidden = false;
    this.events = new EventSource(`/api/rooms/${session.code}/events?token=${encodeURIComponent(session.token)}`);
    this.events.onmessage = event => { this.connected = true; this.receive(JSON.parse(event.data)); };
    this.events.onerror = () => { this.connected = false; this.status.textContent = 'Connection interrupted. Reconnecting…'; const scene = this.game.scene.getScene('MainScene'); if (scene?.statusText) scene.updateHud(); };
  }

  receive(room) {
    if (room.closed) { this.detach('The room was closed.'); return; }
    if (room.state && this.room?.state) {
      if (this.retiredMatches.has(room.state.matchId)) return;
      if (room.state.matchId === this.room.state.matchId && room.state.revision < this.room.state.revision) return;
      if (room.state.matchId !== this.room.state.matchId) this.retiredMatches.add(this.room.state.matchId);
    }
    this.room = room;
    const rating = room.ratings?.[this.session?.player];
    if (rating) this.showProfile(rating);
    const role = this.session?.player === 0 ? 'Blue' : 'Red';
    this.status.textContent = !room.state ? `Room ${room.code} · You are ${role} · Waiting for player 2`
      : room.players.some(player => !player.connected) ? `Room ${room.code} · You are ${role} · Waiting for the other player to reconnect`
      : room.votes?.length ? `Room ${room.code} · Rematch requested (${room.votes.length}/2)`
      : `Room ${room.code} · You are ${role} · ${room.ranked ? 'Ranked match' : 'Connected'}`;
    if (room.state) this.pending = room;
    const scene = this.game.scene.getScene('MainScene');
    if (scene?.statusText) {
      scene.network = this;
      if (!scene.resolving) scene.clearSelection();
    }
  }

  canAct() { return this.connected && this.room?.state && this.room.players.length === 2 && this.room.players.every(player => player.connected); }

  flush() {
    const scene = this.game.scene.getScene('MainScene');
    if (!this.pending || !scene?.statusText || scene.resolving) return;
    const room = this.pending;
    this.pending = null;
    if (scene.match.matchId !== room.state.matchId || scene.match.mapId !== room.state.mapId) {
      scene.scene.restart({ snapshot: room.state, network: this });
    } else if (room.state.revision > scene.match.revision) {
      if (room.action && room.state.revision === scene.match.revision + 1) scene.presentMove(room.state, room.action);
      else scene.scene.restart({ snapshot: room.state, network: this });
    } else scene.updateHud();
  }

  async move(action) {
    const room = await this.request(`/api/rooms/${this.session.code}/action`, { ...action, token: this.session.token });
    this.receive(room);
  }

  async rematch() {
    try { this.receive(await this.request(`/api/rooms/${this.session.code}/rematch`, { token: this.session.token })); }
    catch (error) { this.status.textContent = error.message; }
  }

  async leave() {
    const session = this.session;
    this.detach('Local play · room left');
    try { await this.request(`/api/rooms/${session.code}/leave`, { token: session.token }); } catch { /* Already closed or disconnected. */ }
  }

  detach(message) {
    this.events?.close();
    this.session = null; this.room = null; this.pending = null; this.connected = false;
    this.retiredMatches.clear();
    sessionStorage.removeItem('history-heroes-room');
    this.code.readOnly = false;
    for (const id of ['room-create', 'room-join', 'debug-map', 'deck-builder-open', 'match-find', 'match-deck']) document.getElementById(id).disabled = false;
    document.getElementById('room-leave').hidden = true;
    document.getElementById('room-invite').hidden = true;
    this.status.textContent = message;
    this.game.scene.getScene('MainScene').scene.restart({ network: null });
  }

  showProfile(profile) {
    document.getElementById('profile-status').textContent = `Rating ${profile.rating}${profile.provisional ? ' · provisional' : ''} · ${profile.wins}W / ${profile.draws}D / ${profile.losses}L`;
  }

  async guestProfile() {
    const credential = localStorage.getItem('history-heroes-profile');
    const result = await this.request('/api/profile', { profileToken: credential || undefined });
    this.profileToken = result.token;
    localStorage.setItem('history-heroes-profile', result.token);
    this.showProfile(result.profile);
  }

  searchControls(searching) {
    for (const id of ['room-create', 'room-join', 'debug-map', 'deck-builder-open', 'match-find', 'match-deck']) document.getElementById(id).disabled = searching || !!this.session;
    document.getElementById('match-cancel').hidden = !searching;
  }

  async findMatch(resume = false) {
    if (this.session || this.busy || this.searching) return;
    const version = this.searchVersion = (this.searchVersion || 0) + 1;
    this.joining = true;
    this.cancelRequested = false;
    this.searching = true;
    this.searchControls(true);
    this.matchStatus.textContent = 'Finding an opponent with similar deck and player strength…';
    try {
      await this.guestProfile();
      const deck = readDeckLists(this.library)?.[Number(document.getElementById('match-deck').value)];
      const result = await this.request(`/api/matchmaking/${resume ? 'status' : 'join'}`, { profileToken: this.profileToken, deck });
      if (version !== this.searchVersion) return;
      this.joining = false;
      if (this.cancelRequested) { await this.cancelSearch(); return; }
      sessionStorage.setItem('history-heroes-search', '1');
      this.searchResult(result);
      if (this.searching) this.searchTimer = setInterval(() => this.pollSearch(), 2000);
    } catch (error) { this.stopSearch(); this.matchStatus.textContent = error.message; }
    finally { this.joining = false; }
  }

  async pollSearch() {
    if (this.polling || !this.searching || this.cancelRequested) return;
    const version = this.searchVersion;
    this.polling = true;
    try {
      const result = await this.request('/api/matchmaking/status', { profileToken: this.profileToken });
      if (version === this.searchVersion && !this.cancelRequested) this.searchResult(result);
    }
    catch (error) { if (version === this.searchVersion) this.matchStatus.textContent = `${error.message} Retrying…`; }
    finally { this.polling = false; }
  }

  searchResult(result) {
    this.showProfile(result.profile);
    if (result.status === 'matched') {
      this.attach(result.session);
      this.receive(result.room);
      this.matchStatus.textContent = 'Balanced match found · deck locked for this match';
    } else if (result.status === 'idle') {
      this.stopSearch();
      this.matchStatus.textContent = 'Search expired or cancelled. Find a match to try again.';
    } else this.matchStatus.textContent = `Searching · ${result.waited}s · deck strength ${result.strength}/100 · ${result.waited >= 30 ? 'Search gradually widening within fair limits' : 'Looking for a close match'}`;
  }

  async cancelSearch() {
    if (!this.searching) return;
    this.cancelRequested = true;
    this.matchStatus.textContent = 'Cancelling search…';
    if (this.joining) return;
    if (this.cancelling) return;
    this.cancelling = true;
    try {
      const result = await this.request('/api/matchmaking/cancel', { profileToken: this.profileToken });
      this.searchResult(result);
    } catch (error) { this.cancelRequested = false; this.matchStatus.textContent = error.message; }
    finally { this.cancelling = false; }
  }

  stopSearch() {
    clearInterval(this.searchTimer);
    this.searchVersion = (this.searchVersion || 0) + 1;
    this.searching = false;
    this.cancelRequested = false;
    sessionStorage.removeItem('history-heroes-search');
    this.searchControls(false);
  }
}
