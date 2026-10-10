import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
const base = process.env.GAME_URL || 'http://127.0.0.1:8080';
const errors = [];
try {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  for (const page of [host, guest]) {
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForFunction(() => window.game?.scene.getScene('MainScene')?.handViews?.length === 6);
  }
  await host.locator('#debug-map').selectOption('courtyard');
  await host.waitForFunction(() => game.scene.getScene('MainScene').match.mapId === 'courtyard');
  await host.reload();
  await host.waitForFunction(() => game.scene.getScene('MainScene')?.match?.mapId === 'courtyard');
  await host.locator('#room-create').click();
  await host.waitForFunction(() => window.online?.session?.code);
  const code = await host.locator('#room-code').inputValue();
  await guest.locator('#room-code').fill(code);
  await guest.locator('#room-join').click();
  for (const page of [host, guest]) await page.waitForFunction(() => online.canAct() && game.scene.getScene('MainScene').match.matchId === online.room.state.matchId);
  assert.equal(await host.evaluate(() => online.session.player), 0);
  assert.equal(await guest.evaluate(() => online.session.player), 1);
  assert.equal(await guest.evaluate(() => game.scene.getScene('MainScene').match.mapId), 'courtyard');
  assert.equal(await host.locator('#debug-map').isDisabled(), true);
  await guest.evaluate(() => {
    const scene = game.scene.getScene('MainScene');
    scene.select(scene.match.hands[0][0]);
  });
  assert.equal(await guest.evaluate(() => game.scene.getScene('MainScene').selectedId), null);
  const play = async page => {
    await page.evaluate(async () => {
      const scene = game.scene.getScene('MainScene');
      const { legalMoves } = await import('/game/rules.js');
      const card = scene.match.hands[scene.match.turn].find(card => legalMoves(scene.match, card).length);
      scene.select(card);
      const button = scene.tiles.flat().flatMap(tile => tile.buttons)[0];
      window.oldMove = button.listeners('pointerdown')[0];
      button.emit('pointerdown');
      window.oldMove();
    });
  };
  await play(host);
  for (const page of [host, guest]) await page.waitForFunction(() => game.scene.getScene('MainScene').match.revision === 1 && !game.scene.getScene('MainScene').resolving);
  const shared = await host.evaluate(() => game.scene.getScene('MainScene').match);
  assert.deepEqual(await guest.evaluate(() => game.scene.getScene('MainScene').match), shared);
  assert.ok(shared.decks.flat().every(card => card === null));
  await guest.reload();
  await guest.waitForFunction(() => online.canAct() && game.scene.getScene('MainScene')?.match?.revision === 1);
  await host.waitForFunction(() => online.canAct());
  await play(guest);
  for (const page of [host, guest]) await page.waitForFunction(() => game.scene.getScene('MainScene').match.revision === 2 && !game.scene.getScene('MainScene').resolving);
  await host.evaluate(shared => online.receive({ ...online.room, state: shared }), shared);
  assert.equal(await host.evaluate(() => online.room.state.revision), 2);
  for (let i = 0; i < 35; i++) {
    const state = await host.evaluate(() => game.scene.getScene('MainScene').match);
    if (state.finished) break;
    await play(state.turn === 0 ? host : guest);
    for (const page of [host, guest]) await page.waitForFunction(revision => {
      const scene = game.scene.getScene('MainScene');
      return scene.match.revision > revision && !scene.resolving;
    }, state.revision);
  }
  assert.equal(await host.evaluate(() => game.scene.getScene('MainScene').match.finished), true);
  assert.deepEqual(await guest.evaluate(() => game.scene.getScene('MainScene').match), await host.evaluate(() => game.scene.getScene('MainScene').match));
  const oldId = await host.evaluate(() => game.scene.getScene('MainScene').match.matchId);
  await host.evaluate(() => game.scene.getScene('MainScene').children.list.find(child => child.text === 'Request rematch').emit('pointerdown'));
  await host.waitForFunction(() => online.room.votes.length === 1);
  assert.equal(await host.evaluate(() => game.scene.getScene('MainScene').match.matchId), oldId);
  await guest.evaluate(() => game.scene.getScene('MainScene').children.list.find(child => child.text === 'Request rematch').emit('pointerdown'));
  for (const page of [host, guest]) await page.waitForFunction(id => game.scene.getScene('MainScene').match.matchId !== id && game.scene.getScene('MainScene').match.moves === 0, oldId);
  await host.evaluate(shared => online.receive({ ...online.room, state: shared }), shared);
  assert.notEqual(await host.evaluate(() => online.room.state.matchId), oldId);
  await guest.locator('#room-leave').click();
  for (const page of [host, guest]) await page.waitForFunction(() => !online.session && !game.scene.getScene('MainScene').network);
  assert.deepEqual(errors, []);
  console.log('Online browser checks passed: persistent debug map, separate player seats, synchronized moves and animations, duplicate clicks, refresh/reconnect, full match, mutual rematch, and leave.');
} finally { await browser.close(); }
