import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
const base = process.env.GAME_URL || 'http://127.0.0.1:8080';
const errors = [];
try {
  const pages = [];
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext();
    const page = await context.newPage(); pages.push(page);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForFunction(() => window.game?.scene.getScene('MainScene')?.handViews?.length === 6);
    await page.evaluate(() => {
      const deck = CARD_LIBRARY.slice(20, 36).map(card => card.name);
      localStorage.setItem('history-heroes-decks-v1', JSON.stringify([deck, deck]));
    });
  }
  const [a, b] = pages;
  // Cancel while the first profile request is still in flight.
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await a.route('**/api/profile', async route => { await gate; await route.continue(); });
  await a.locator('#match-find').click();
  await a.locator('#match-cancel').click();
  release();
  await a.waitForFunction(() => !online.searching && document.getElementById('match-status').textContent.includes('cancelled'));
  assert.equal(await a.locator('#match-find').isEnabled(), true);
  await a.unroute('**/api/profile');
  await a.locator('#match-find').click();
  await a.waitForFunction(() => online.searching && !online.joining);
  const token = await a.evaluate(() => localStorage.getItem('history-heroes-profile'));
  await a.reload();
  await a.waitForFunction(() => online.searching && !online.joining);
  assert.equal(await a.evaluate(() => localStorage.getItem('history-heroes-profile')), token);
  assert.equal(await a.locator('#deck-builder-open').isDisabled(), true);
  await b.locator('#match-deck').selectOption('1');
  await b.locator('#match-find').click();
  for (const page of pages) await page.waitForFunction(() => online.canAct() && online.room.ranked && game.scene.getScene('MainScene').match.matchId === online.room.state.matchId);
  assert.notEqual(await b.evaluate(() => localStorage.getItem('history-heroes-profile')), token);
  assert.equal(await a.evaluate(() => online.session.code), await b.evaluate(() => online.session.code));
  assert.notEqual(await a.evaluate(() => online.session.player), await b.evaluate(() => online.session.player));
  assert.equal(await a.evaluate(() => online.room.state.gems.length), 3);
  assert.equal(await a.evaluate(() => online.room.state.map.flat().filter(tile => tile.playable === 2).length), 9);
  assert.equal(await a.locator('#match-cancel').isHidden(), true);
  const initial = await a.evaluate(() => online.room.state);
  const actor = await a.evaluate(() => online.session.player) === initial.turn ? a : b;
  await actor.evaluate(async () => {
    const scene = game.scene.getScene('MainScene');
    const { legalMoves } = await import('/game/rules.js');
    const card = scene.match.hands[scene.match.turn].find(card => legalMoves(scene.match, card).length);
    scene.select(card); scene.tiles.flat().flatMap(tile => tile.buttons)[0].emit('pointerdown');
  });
  for (const page of pages) await page.waitForFunction(() => game.scene.getScene('MainScene').match.revision === 1 && !game.scene.getScene('MainScene').resolving);
  assert.deepEqual(await a.evaluate(() => game.scene.getScene('MainScene').match), await b.evaluate(() => game.scene.getScene('MainScene').match));
  await b.reload();
  await b.waitForFunction(() => online.canAct() && game.scene.getScene('MainScene')?.match?.revision === 1);
  await a.waitForFunction(() => online.canAct());
  await b.locator('#room-leave').click();
  for (const page of pages) await page.waitForFunction(() => !online.session);
  await a.waitForFunction(() => document.getElementById('profile-status').textContent.includes('1W'));
  await b.locator('#match-find').click();
  await b.waitForFunction(() => online.searching && !online.joining && document.getElementById('profile-status').textContent.includes('1L'));
  await b.locator('#match-cancel').click();
  await b.waitForFunction(() => !online.searching);
  assert.deepEqual(errors, []);
  console.log('Matchmaking browser checks passed: immediate cancellation, queue refresh, guest identity, two seats, locked decks, standard board, synchronized move, reconnect, ranked forfeit, and saved results.');
} finally { await browser.close(); }
