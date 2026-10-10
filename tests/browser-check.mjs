// Run against npm start with Playwright installed (or PLAYWRIGHT_MODULE_PATH set).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
const page = await browser.newPage({ viewport: { width: 1200, height: 1100 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
try {
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8080');
  await page.waitForFunction(() => window.game?.scene.getScene('MainScene')?.handViews?.length === 6);
  await page.evaluate(() => game.scene.getScene('MainScene').scene.restart({ mapId: 'classic', seed: 42 }));
  await page.waitForFunction(() => game.scene.getScene('MainScene').match.seed === 42);
  const colors = await page.evaluate(() => {
    const scene = game.scene.getScene('MainScene');
    return { labels: scene.playerLabels.map(label => label.style.color),
      frames: [0, 1].map(owner => scene.handViews.find(view => view.card.owner === owner).card.frame.strokeColor) };
  });
  assert.deepEqual(colors.labels, ['#7abfff', '#ff9979']);
  assert.deepEqual(colors.frames, [0x7abfff, 0xff9979]);
  assert.ok(await page.evaluate(() => game.scene.getScene('MainScene').gemViews.every(view => view.image.displayWidth > 0 && view.image.displayHeight > 0)));
  const coords = async (x, y) => {
    const box = await page.locator('canvas').boundingBox();
    return { x: box.x + x * box.width / 1100, y: box.y + y * box.height / 820 };
  };
  const click = async (x, y) => { const pos = await coords(x, y); await page.mouse.click(pos.x, pos.y); };
  await click(130, 245);
  const first = await page.evaluate(() => {
    const scene = game.scene.getScene('MainScene');
    window.staleButton = scene.tiles.flat().flatMap(tile => tile.buttons)[0];
    window.staleCallback = window.staleButton.listeners('pointerdown')[0];
    return { id: scene.selectedId, buttons: scene.tiles.flat().flatMap(tile => tile.buttons).length };
  });
  assert.equal(first.buttons, 3);
  await click(130, 385);
  await click(130, 525);
  const selection = await page.evaluate(() => {
    const scene = game.scene.getScene('MainScene');
    // Simulate a queued callback from a control that was already destroyed.
    window.staleCallback();
    return { id: scene.selectedId, expected: scene.match.hands[0][2].id, moves: scene.match.moves,
      buttons: scene.tiles.flat().flatMap(tile => tile.buttons).length, destroyed: !window.staleButton.scene };
  });
  assert.equal(selection.id, selection.expected);
  assert.notEqual(selection.id, first.id);
  assert.equal(selection.moves, 0);
  assert.equal(selection.buttons, 3);
  assert.equal(selection.destroyed, true);
  const movePosition = await page.evaluate(() => {
    const button = game.scene.getScene('MainScene').tiles.flat().flatMap(tile => tile.buttons)[0];
    window.moveCallback = button.listeners('pointerdown')[0];
    return { x: button.x, y: button.y };
  });
  await click(movePosition.x, movePosition.y);
  const locked = await page.evaluate(() => {
    const scene = game.scene.getScene('MainScene');
    window.moveCallback();
    scene.select(scene.match.hands[scene.match.turn][0]);
    return scene.selectedId;
  });
  assert.equal(locked, null);
  await page.waitForFunction(() => !game.scene.getScene('MainScene').resolving);
  const played = await page.evaluate(() => {
    const scene = game.scene.getScene('MainScene');
    return { turn: scene.match.turn, moves: scene.match.moves, deck: scene.match.decks[0].length,
      hand: scene.match.hands[0].length, board: scene.match.board.flat().filter(Boolean).map(card => card.id), buttons: scene.tiles.flat().flatMap(tile => tile.buttons).length };
  });
  assert.equal(played.turn, 1);
  assert.equal(played.moves, 1);
  assert.equal(played.deck, 12);
  assert.equal(played.hand, 3);
  assert.deepEqual(played.board, [selection.id]);
  assert.equal(played.buttons, 0);
  await click(130, 245);
  assert.equal(await page.evaluate(() => game.scene.getScene('MainScene').selectedId), null);
  await click(970, 245);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => game.scene.getScene('MainScene').selectedId), null);

  // Move controls start at the entry edge; printed badges stay on their direction's edge.
  const arrows = await page.evaluate(() => {
    const scene = game.scene.getScene('MainScene');
    const tile = scene.tiles[1][1];
    for (let direction = 1; direction <= 4; direction++) tile.showOption(direction, () => {});
    window.pulseButton = tile.buttons[0];
    return {
      controls: tile.buttons.map(button => ({ direction: button.direction, x: button.x - tile.x, y: button.y - tile.y })),
      badges: scene.handViews.flatMap(view => view.card.arrows.map(arrow => ({ direction: arrow.direction, x: arrow.x, y: arrow.y })))
    };
  });
  assert.deepEqual(arrows.controls, [
    { direction: 1, x: 0, y: 55 }, { direction: 2, x: -55, y: 0 },
    { direction: 3, x: 0, y: -55 }, { direction: 4, x: 55, y: 0 }
  ]);
  for (const arrow of arrows.badges) {
    if (arrow.direction === 'right') assert.ok(arrow.x > 0);
    if (arrow.direction === 'left') assert.ok(arrow.x < 0);
    if (arrow.direction === 'up') assert.ok(arrow.y < 0);
    if (arrow.direction === 'down') assert.ok(arrow.y > 0);
  }
  await page.waitForFunction(() => window.pulseButton.scaleX > 1.08);
  await page.evaluate(() => game.scene.getScene('MainScene').clearSelection());
  await page.waitForFunction(() => game.scene.getScene('MainScene').tweens.getTweensOf(window.pulseButton).length === 0);

  // Play a complete match through actual UI control events, selecting several cards per turn.
  for (let i = 0; i < 70; i++) {
    const result = await page.evaluate(async () => {
      const scene = game.scene.getScene('MainScene');
      const { legalMoves } = await import('/game/rules.js');
      if (scene.match.finished) return 'finished';
      const hand = scene.match.hands[scene.match.turn];
      for (const card of hand) scene.select(card);
      const playable = hand.find(card => legalMoves(scene.match, card).length);
      scene.clearSelection();
      scene.select(playable);
      const buttons = scene.tiles.flat().flatMap(tile => tile.buttons);
      buttons[Math.floor(Math.random() * buttons.length)].emit('pointerdown');
      return 'move';
    });
    if (result === 'finished') break;
    await page.waitForFunction(() => !game.scene.getScene('MainScene').resolving);
  }
  assert.equal(await page.evaluate(() => game.scene.getScene('MainScene').match.finished), true);
  const beforeReplay = await page.evaluate(() => {
    const scene = game.scene.getScene('MainScene');
    const revision = scene.match.revision;
    scene.select(scene.match.hands[scene.match.turn][0]);
    return { selected: scene.selectedId, revision: scene.match.revision === revision,
      result: scene.children.list.some(child => child.text === 'Play again') };
  });
  assert.equal(beforeReplay.selected, null);
  assert.equal(beforeReplay.revision, true);
  assert.equal(beforeReplay.result, true);
  await click(550, 496);
  await page.waitForFunction(() => game.scene.getScene('MainScene').match.moves === 0);
  assert.equal(await page.evaluate(() => game.scene.getScene('MainScene').handViews.length), 6);
  // Observe actual rendered motion: all four pushes finish along their push axis,
  // while placement arrives enlarged over the destination and descends onto it.
  for (let direction = 0; direction <= 4; direction++) {
    const motion = await page.evaluate(async direction => {
      const scene = game.scene.getScene('MainScene');
      const { createMatch } = await import('/game/rules.js');
      const { TILE_MAP } = await import('/data/maps.js');
      scene.clearSelection();
      scene.match = createMatch(CARD_LIBRARY, TILE_MAP[0].map);
      scene.match.gem = { x: 2, y: 2 };
      scene.match.gems = [scene.match.gem];
      const incoming = scene.match.hands[0][0];
      incoming.push = '22220';
      if (direction) {
        const defender = scene.match.hands[1].shift();
        defender.push = '00000';
        scene.match.board[1][1] = defender;
      }
      scene.render();
      scene.play({ cardId: incoming.id, x: 1, y: 1, direction, revision: scene.match.revision });
      const card = scene.boardViews.get(incoming.id);
      const start = scene.time.now;
      const samples = await new Promise(resolve => {
        const result = [];
        function sample() {
          result.push({ t: scene.time.now - start, x: card.x, y: card.y, scale: card.scaleX });
          if (scene.resolving) requestAnimationFrame(sample);
          else resolve(result);
        }
        requestAnimationFrame(sample);
      });
      return { samples, target: { x: scene.tiles[1][1].x, y: scene.tiles[1][1].y }, final: { x: card.x, y: card.y, scale: card.scaleX } };
    }, direction);
    assert.equal(motion.final.x, motion.target.x);
    assert.equal(motion.final.y, motion.target.y);
    assert.equal(motion.final.scale, 1);
    if (direction) {
      const [dx, dy] = [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]][direction];
      const drive = motion.samples.filter(sample => sample.t > 360 && sample.t < 480);
      assert.ok(drive.length > 1);
      assert.ok(drive.some(sample => (sample.x - motion.target.x) * dx + (sample.y - motion.target.y) * dy < -20));
      for (const sample of drive) assert.ok(Math.abs((sample.x - motion.target.x) * dy - (sample.y - motion.target.y) * dx) < 1);
    } else {
      assert.ok(motion.samples.some(sample => Math.abs(sample.x - motion.target.x) < 2 && sample.y < motion.target.y - 15 && sample.scale > 1.2));
    }
  }
  await page.evaluate(() => game.scene.getScene('MainScene').scene.restart());
  await page.waitForFunction(() => game.scene.getScene('MainScene').match.moves === 0);
  await page.setViewportSize({ width: 600, height: 900 });
  await page.waitForFunction(() => document.querySelector('canvas').getBoundingClientRect().width <= 600);
  await click(130, 245);
  assert.ok(await page.evaluate(() => game.scene.getScene('MainScene').selectedId));
  await page.setViewportSize({ width: 1200, height: 1100 });
  await page.keyboard.press('Escape');
  const maps = await page.evaluate(async () => (await import('/data/maps.js')).TILE_MAP.map(map => ({ id: map.id, rows: map.map.length, cols: map.map[0].length, gems: map.gemCount })));
  for (const [index, map] of maps.entries()) {
    await page.evaluate(({ map, seed }) => game.scene.getScene('MainScene').scene.restart({ mapId: map.id, seed }), { map, seed: 100 + index });
    await page.waitForFunction(seed => game.scene.getScene('MainScene').match.seed === seed, 100 + index);
    const visual = await page.evaluate(() => {
      const scene = game.scene.getScene('MainScene');
      const state = scene.match;
      for (const gem of state.gems) {
        const holder = state.hands[0].shift() ?? state.decks[0].shift();
        state.board[gem.y][gem.x] = holder;
      }
      let grass;
      state.map.forEach((row, y) => row.forEach((tile, x) => { if (!grass && tile.playable === 1) grass = { x, y }; }));
      const retired = state.hands[1].shift();
      state.board[grass.y][grass.x] = retired;
      scene.render();
      const card = scene.boardViews.get(retired.id);
      return { rows: scene.tiles.length, cols: scene.tiles[0].length, gems: scene.gemViews.length,
        grey: card.outOfPlay && card.cardImage.tintTopLeft === 0x969b9e && card.alpha < 0.8,
        occupies: state.board[grass.y][grass.x].id === retired.id,
        visible: scene.gemViews.every(view => view.image.visible && view.image.depth > 12 && view.halo.visible && view.image.displayWidth === 34 && view.image.displayHeight === 34),
        bounds: scene.tiles.flat().every(tile => tile.x - tile.size / 2 >= 270 && tile.x + tile.size / 2 <= 830 && tile.y - tile.size / 2 >= 102 && tile.y + tile.size / 2 <= 662) };
    });
    assert.equal(visual.rows, map.rows);
    assert.equal(visual.cols, map.cols);
    assert.equal(visual.gems, map.gems);
    assert.ok(visual.grey && visual.occupies && visual.visible && visual.bounds);
  }
  await page.getByRole('button', { name: 'Build decks', exact: true }).click();
  await page.locator('.deck-card[aria-pressed="true"]').first().click();
  assert.match(await page.locator('#deck-count').innerText(), /15\/16/);
  assert.equal(await page.locator('#deck-save').isDisabled(), true);
  await page.locator('#deck-random').click();
  await page.locator('[data-deck-player="1"]').click();
  await page.locator('#deck-clear').click();
  assert.match(await page.locator('#deck-count').innerText(), /0\/16/);
  await page.locator('#deck-random').click();
  await page.locator('#deck-save').click();
  await page.waitForFunction(() => game.scene.getScene('MainScene').match.moves === 0 && game.scene.getScene('MainScene').handViews.length === 6);
  const saved = await page.evaluate(() => {
    const scene = game.scene.getScene('MainScene');
    const lists = JSON.parse(localStorage.getItem('history-heroes-decks-v1'));
    return { lists, actual: scene.match.hands.map((hand, owner) => [...hand, ...scene.match.decks[owner]].map(card => card.name).sort()), mapId: scene.match.mapId };
  });
  assert.deepEqual(saved.actual, saved.lists.map(deck => [...deck].sort()));
  await page.reload();
  await page.waitForFunction(() => game.scene.getScene('MainScene')?.handViews?.length === 6);
  const refreshed = await page.evaluate(() => {
    const scene = game.scene.getScene('MainScene');
    return { actual: scene.match.hands.map((hand, owner) => [...hand, ...scene.match.decks[owner]].map(card => card.name).sort()), mapId: scene.match.mapId };
  });
  assert.deepEqual(refreshed.actual, saved.actual);
  assert.notEqual(refreshed.mapId, saved.mapId);
  if (process.env.GAME_SCREENSHOT) await page.screenshot({ path: process.env.GAME_SCREENSHOT, fullPage: true });
  assert.deepEqual(errors, []);
  console.log(`Browser checks passed: turn regression, animations, ${maps.length} map layouts, visible claimed gems, grass tint and occupancy, saved deck picker, map reroll on refresh, replay, and responsive input.`);
} finally {
  await browser.close();
}
