import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export class ProfileStore {
  constructor(filename = null) {
    this.filename = filename;
    this.pending = Promise.resolve();
    this.profiles = new Map();
    if (filename) {
      try { this.profiles = new Map(JSON.parse(readFileSync(filename, 'utf8')).map(profile => [profile.id, profile])); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  authenticate(credential) { return [...this.profiles.values()].find(profile => profile.token === credential); }
  create() {
    const profile = { id: randomBytes(12).toString('hex'), token: randomBytes(24).toString('hex'), rating: 1000,
      games: 0, wins: 0, losses: 0, draws: 0, opponents: [] };
    this.profiles.set(profile.id, profile);
    return profile;
  }
  save() {
    if (!this.filename) return Promise.resolve();
    const contents = JSON.stringify([...this.profiles.values()]);
    const write = this.pending.then(async () => {
      await mkdir(path.dirname(this.filename), { recursive: true });
      await writeFile(this.filename + '.tmp', contents);
      await rename(this.filename + '.tmp', this.filename);
    });
    this.pending = write.catch(error => console.error('Could not save matchmaking profiles:', error.message));
    return write;
  }
}

export function publicProfile(profile) {
  return { rating: profile.rating, games: profile.games, wins: profile.wins, losses: profile.losses,
    draws: profile.draws, provisional: profile.games < 10 };
}
