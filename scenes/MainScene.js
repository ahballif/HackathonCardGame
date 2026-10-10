import Card from "../objects/card.js";
import Tile from "../objects/tile.js";
import { legalMoves, scoreGems } from "../game/rules.js";
import { createGameMatch, applyPlayerAction } from "../game/setup.js";
import { readDeckLists } from "../game/deck-builder.js";

const COLORS = ["#7abfff", "#ff9979"];
const FONT = "Arial, sans-serif";

export default class MainScene extends Phaser.Scene {
  constructor() { super("MainScene"); }

  preload() {
    this.loadErrors = [];
    for (const direction of ["up", "right", "down", "left"]) {
      this.load.image(`arrow_${direction}`, `assets/arrow_${direction}_new.png`);
      this.load.image(`arrow_${direction}_double`, `assets/arrow_${direction}_double_new.png`);
    }
    for (const [key, path] of Object.entries({ back_tile: "Big Back Tile.png", no_play: "Non-Playable.png", picnic_tile: "Picnic Playable.png", gem: "Gem.png" })) this.load.image(key, `assets/${path}`);
    this.load.audio("bg", "assets/audio/Background audio.wav");
    this.load.audio("win", "assets/audio/Win audio.wav");
    CARD_LIBRARY.forEach(card => this.load.image(card.name, `Cards/${card.image}`));
    this.load.on("loaderror", file => { this.loadErrors.push(file.key); });
  }

  create(options = {}) {
    if (this.loadErrors.length) {
      document.getElementById("loading-status").textContent = `Could not load ${this.loadErrors.join(', ')}. Refresh to retry.`;
      return;
    }
    document.getElementById("loading-status").hidden = true;
    let previousMapId;
    try { previousMapId = localStorage.getItem('history-heroes-last-map'); } catch { /* Random maps work without storage. */ }
    this.network = options.network ?? (window.online?.session ? window.online : null);
    this.networkPending = false;
    this.match = options.snapshot ?? createGameMatch(CARD_LIBRARY, { previousMapId, mapId: document.getElementById('debug-map').value || undefined, deckLists: readDeckLists(CARD_LIBRARY), ...options });
    if (!this.network) try { localStorage.setItem('history-heroes-last-map', this.match.mapId); } catch { /* Optional preference. */ }
    this.selectedId = null;
    this.selectionVersion = 0;
    this.resolving = false;
    this.handViews = [];
    this.boardViews = new Map();
    this.tiles = [];
    this.add.rectangle(550, 410, 1100, 820, 0x12262b);
    this.add.rectangle(550, 382, 588, 588, 0x0b1c20).setStrokeStyle(1, 0x385458);
    this.text(550, 29, "HISTORY HEROES", 14, "#93aaa9").setLetterSpacing(5);
    this.turnText = this.text(550, 61, "", 27);
    this.playerLabels = [this.text(130, 129, "", 19), this.text(970, 129, "", 19)];
    this.deckLabels = [this.text(130, 159, "", 12), this.text(970, 159, "", 12)];
    this.handPanels = [130, 970].map(x => this.add.rectangle(x, 410, 206, 446, 0x193238).setStrokeStyle(1, 0x385458));
    const rows = this.match.map.length;
    const cols = this.match.map[0].length;
    this.tileSize = 560 / Math.max(rows, cols);
    this.boardCardSize = Math.min(96, this.tileSize * 0.69);
    this.match.map.forEach((row, y) => {
      this.tiles[y] = row.map((data, x) => new Tile(this, 550 + (x - (cols - 1) / 2) * this.tileSize,
        382 + (y - (rows - 1) / 2) * this.tileSize, this.tileSize, data));
    });
    this.gemViews = this.match.gems.map(gem => {
      const tile = this.tiles[gem.y][gem.x];
      const halo = this.add.circle(tile.x, tile.y, 22, 0x12262b, 0.95).setStrokeStyle(2, 0xffdc83).setDepth(16);
      const image = this.add.image(tile.x, tile.y, "gem").setDepth(17);
      this.tweens.add({ targets: image, alpha: 0.7, duration: 1000, yoyo: true, repeat: -1 });
      return { halo, image };
    });
    this.statusText = this.text(550, 705, "", 14, "#ffdc83").setWordWrapWidth(640);
    this.logText = this.text(550, 738, "", 13, "#a8bebc");
    this.scoreText = this.text(550, 780, "", 12, "#a8bebc");
    this.button(130, 704, this.network ? "Rematch" : "New match", () => this.network ? this.network.rematch() : this.scene.restart());
    this.muteButton = this.button(130, 756, this.sound.mute ? "Sound: off" : "Sound: on", () => {
      this.sound.mute = !this.sound.mute;
      this.muteButton.setText(this.sound.mute ? "Sound: off" : "Sound: on");
    });
    this.music = this.sound.add("bg", { loop: true, volume: 0.16 });
    this.music.play();
    this.events.once("shutdown", () => { this.music.stop(); this.music.destroy(); });
    const cancelSelection = () => { if (!this.resolving) this.clearSelection(); };
    this.input.keyboard.on("keydown-ESC", cancelSelection);
    this.events.once("shutdown", () => this.input.keyboard.off("keydown-ESC", cancelSelection));
    this.render();
    this.announceTurn();
    if (this.match.finished) this.showResult();
  }

  text(x, y, value, size = 16, color = "#ecf3e8") {
    return this.add.text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color, align: "center" }).setOrigin(0.5);
  }

  button(x, y, label, callback) {
    const text = this.add.text(x, y, label, { fontFamily: FONT, fontSize: "14px", color: "#dce9e4", backgroundColor: "#27454b", padding: { x: 18, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    text.on("pointerdown", () => { if (!this.resolving) callback(); });
    text.on("pointerover", () => text.setStyle({ backgroundColor: "#3a6066" }));
    text.on("pointerout", () => text.setStyle({ backgroundColor: "#27454b" }));
    return text;
  }

  clearSelection() {
    this.selectedId = null;
    this.selectionVersion++;
    this.tiles.flat().forEach(tile => tile.clearOptions());
    this.handViews.forEach(view => view.card.setSelected(false));
    this.updateHud();
  }

  select(card) {
    if (this.resolving || this.networkPending || this.match.finished) return;
    if (this.network && (!this.network.canAct() || card.owner !== this.network.session.player)) {
      this.statusText.setText(this.network.canAct() ? 'Choose a hero from your own hand.' : 'Waiting for both players to connect.');
      return;
    }
    if (card.owner !== this.match.turn) {
      this.statusText.setText(`Player ${this.match.turn + 1}'s turn — choose a hero from their hand.`);
      return;
    }
    const wasSelected = this.selectedId === card.id;
    this.clearSelection();
    if (wasSelected) return;
    this.selectedId = card.id;
    const version = this.selectionVersion;
    const revision = this.match.revision;
    const matchId = this.match.matchId;
    this.handViews.forEach(view => view.card.setSelected(view.card.cardData.id === card.id));
    const moves = legalMoves(this.match, card);
    for (const move of moves) {
      this.tiles[move.y][move.x].showOption(move.direction, () => {
        if (this.resolving || this.selectedId !== card.id || version !== this.selectionVersion || matchId !== this.match.matchId) return;
        this.play({ ...move, cardId: card.id, revision, matchId, player: card.owner });
      });
    }
    this.statusText.setText(moves.length ? `${card.name} · choose a gold move · Esc to cancel` : `${card.name} has no legal moves. Choose another hero.`);
  }

  play(action) {
    if (this.resolving || this.networkPending) return;
    if (this.network) {
      if (!this.network.canAct() || this.match.turn !== this.network.session.player) return;
      this.networkPending = true;
      this.statusText.setText('Sending move…');
      this.network.move(action).catch(error => {
        this.statusText.setText(error.message);
      }).finally(() => { this.networkPending = false; });
      return;
    }
    const next = applyPlayerAction(this.match, { ...action, type: 'move', player: action.player ?? this.match.turn, matchId: action.matchId ?? this.match.matchId });
    if (!next) return;
    this.presentMove(next, action);
  }

  presentMove(next, action) {
    this.resolving = true;
    const oldGemOwners = this.match.gems.map(gem => this.match.board[gem.y][gem.x]?.owner);
    this.match = next;
    this.clearSelection();
    this.render(true, action);
    this.statusText.setText("Resolving move…");
    this.time.delayedCall(880, () => {
      this.resolving = false;
      this.updateHud();
      this.match.gems.forEach((position, i) => {
        const owner = this.match.board[position.y][position.x]?.owner;
        if (owner != null && owner !== oldGemOwners[i]) {
          const tile = this.tiles[position.y][position.x];
          this.impact(tile.x, tile.y, 0xffdc83, 22);
          this.floatingText(tile.x, tile.y - this.tileSize * 0.45, oldGemOwners[i] == null ? "GEM CLAIMED!" : "GEM STOLEN!", "#ffdc83");
        }
      });
      if (this.match.finished) this.showResult();
      else this.announceTurn();
    });
  }

  render(animate = false, action = null) {
    const previous = this.boardViews;
    const oldHandIds = new Set(this.handViews.map(view => view.card.cardData.id));
    this.boardViews = new Map();
    this.match.board.forEach((row, y) => row.forEach((data, x) => {
      if (!data) return;
      const tile = this.tiles[y][x];
      let card = previous.get(data.id);
      const entering = !card;
      if (card && card.owner !== data.owner) { card.destroy(); card = null; }
      if (!card) {
        const hand = this.handViews.find(view => view.card.cardData.id === data.id);
        card = new Card(this, animate && hand ? hand.card.x : tile.x, animate && hand ? hand.card.y : tile.y, data, null, this.boardCardSize).setDepth(5);
      }
      previous.delete(data.id);
      this.boardViews.set(data.id, card);
      if (animate && (card.x !== tile.x || card.y !== tile.y)) {
        this.animateMove(card, tile, entering, action);
      }
      else card.setPosition(tile.x, tile.y);
      card.setOutOfPlay(this.match.map[y][x].playable === 1);
    }));
    previous.forEach(card => card.destroy());
    this.handViews.forEach(view => { view.card.destroy(); view.label.destroy(); });
    this.handViews = [];
    this.match.hands.forEach((hand, owner) => hand.forEach((data, i) => {
      const x = owner === 0 ? 130 : 970;
      const y = 245 + i * 140;
      const card = new Card(this, x, y, data, () => this.select(data), 94).setDepth(6);
      const label = this.text(x, y + 65, data.name, 11, COLORS[owner]);
      label.setWordWrapWidth(188);
      card.setAlpha(owner === this.match.turn && !this.match.finished ? 1 : 0.5);
      card.setArrowsActive(owner === this.match.turn && !this.match.finished && (!this.network || owner === this.network.session.player));
      if (animate && !oldHandIds.has(data.id)) {
        const alpha = card.alpha;
        card.setPosition(x + (owner === 0 ? -26 : 26), y).setScale(0.8).setAlpha(0);
        this.tweens.add({ targets: card, x, scaleX: 1, scaleY: 1, alpha, delay: 420, duration: 230, ease: "Back.Out" });
      }
      this.handViews.push({ card, label });
    }));
    this.updateHud();
  }

  updateGems() {
    this.match.gems.forEach((gem, i) => {
      const tile = this.tiles[gem.y][gem.x];
      const occupied = this.match.board[gem.y][gem.x];
      const x = tile.x + (occupied ? this.tileSize * 0.27 : 0);
      const y = tile.y - (occupied ? this.tileSize * 0.27 : 0);
      const view = this.gemViews[i];
      if (!view) return;
      const size = occupied ? 34 : Math.min(75, this.tileSize * 0.52);
      view.image.setPosition(x, y).setDisplaySize(size, size);
      view.halo.setPosition(x, y).setVisible(!!occupied).setStrokeStyle(2, occupied?.owner === 0 ? 0x7abfff : 0xff9979);
    });
  }

  animateMove(card, tile, entering, action) {
    const color = card.owner === 0 ? 0x7abfff : 0xff9979;
    if (entering) {
      card.setDepth(12);
      const pushing = action.direction !== 0;
      const [dx, dy] = [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]][action.direction];
      // Fly to the entry edge first, then drive along the push axis.
      // A placement instead hovers above its target before descending in depth.
      const approach = pushing ? { x: tile.x - dx * this.tileSize * 0.786, y: tile.y - dy * this.tileSize * 0.786 }
        : { x: tile.x, y: tile.y - 35 };
      const shadow = !pushing ? this.add.ellipse(tile.x, tile.y + 10, 116, 60, 0x031216, 0.1).setDepth(4).setScale(0.5) : null;
      if (pushing) this.pushLane(tile, action.direction, color);
      this.tweens.add({ targets: card, scaleX: pushing ? 1.12 : 1.5, scaleY: pushing ? 1.12 : 1.5,
        angle: card.owner === 0 ? -6 : 6, duration: 90, ease: "Quad.Out" });
      this.tweens.add({ targets: card, x: approach.x, y: approach.y, angle: 0, delay: 90,
        duration: 240, ease: "Cubic.Out", onComplete: () => {
          if (shadow) this.tweens.add({ targets: shadow, scaleX: 1, scaleY: 1, alpha: 0.65, duration: 180, ease: "Quad.In" });
          this.tweens.add({ targets: card, x: tile.x, y: tile.y, scaleX: 1, scaleY: 1,
            duration: 180, ease: "Cubic.In", onStart: () => {
              if (pushing) this.pushStreak(approach, action.direction, color);
            }, onComplete: () => {
              if (shadow) this.tweens.add({ targets: shadow, alpha: 0, duration: 160, onComplete: () => shadow.destroy() });
              this.impact(tile.x, tile.y, color);
              if (pushing) {
                this.cameras.main.shake(100, 0.002);
                this.pushStreak(tile, action.direction, color);
              }
              this.tweens.add({ targets: card, scaleX: 1.05, scaleY: 0.9, duration: 70,
                onComplete: () => this.tweens.add({ targets: card, scaleX: 1, scaleY: 1,
                  duration: 140, ease: "Back.Out", onComplete: () => card.setDepth(5) }) });
            } });
        } });
    } else {
      const distance = (Math.abs(tile.x - this.tiles[action.y][action.x].x) + Math.abs(tile.y - this.tiles[action.y][action.x].y)) / this.tileSize;
      const delay = 450 + distance * 35;
      this.tweens.add({ targets: card, x: tile.x, y: tile.y, angle: action.direction % 2 ? -4 : 4,
        delay, duration: 200, ease: "Back.Out", onStart: () => {
          this.pushStreak({ x: card.x, y: card.y }, action.direction, color);
        }, onComplete: () => {
          this.impact(tile.x, tile.y, color, 6);
          this.tweens.add({ targets: card, angle: 0, duration: 100, ease: "Sine.Out" });
        } });
    }
  }

  pushLane(tile, direction, color) {
    const [dx, dy] = [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]][direction];
    const lane = this.add.graphics().setDepth(10).setAlpha(0.8);
    lane.lineStyle(4, color, 0.8);
    lane.lineBetween(tile.x - dx * 110, tile.y - dy * 110, tile.x + dx * 105, tile.y + dy * 105);
    for (const distance of [-65, 0, 65]) {
      const x = tile.x + dx * distance;
      const y = tile.y + dy * distance;
      lane.lineBetween(x - dx * 14 - dy * 10, y - dy * 14 + dx * 10, x, y);
      lane.lineBetween(x - dx * 14 + dy * 10, y - dy * 14 - dx * 10, x, y);
    }
    this.tweens.add({ targets: lane, alpha: 0, delay: 510, duration: 200, onComplete: () => lane.destroy() });
  }

  impact(x, y, color, count = 12) {
    const ring = this.add.circle(x, y, 24).setStrokeStyle(3, color).setDepth(14);
    this.tweens.add({ targets: ring, scaleX: 3.2, scaleY: 3.2, alpha: 0, duration: 400,
      ease: "Quad.Out", onComplete: () => ring.destroy() });
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 2 * i / count;
      const distance = Phaser.Math.Between(40, 85);
      const spark = this.add.rectangle(x, y, 5, 9, color).setRotation(angle).setDepth(15);
      this.tweens.add({ targets: spark, x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance, angle: spark.angle + 90, alpha: 0,
        scaleX: 0.2, scaleY: 0.2, duration: 400, ease: "Cubic.Out", onComplete: () => spark.destroy() });
    }
  }

  pushStreak(tile, direction, color) {
    const [dx, dy] = [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]][direction];
    for (let i = -1; i <= 1; i++) {
      const streak = this.add.rectangle(tile.x - dx * 36 - dy * i * 20,
        tile.y - dy * 36 + dx * i * 20, dx ? 48 : 3, dy ? 48 : 3, color, 0.75).setDepth(4);
      this.tweens.add({ targets: streak, x: streak.x + dx * 100, y: streak.y + dy * 100,
        alpha: 0, duration: 280, ease: "Quad.Out", onComplete: () => streak.destroy() });
    }
  }

  floatingText(x, y, message, color) {
    const label = this.text(x, y, message, 17, color).setDepth(25).setStroke("#102229", 4);
    this.tweens.add({ targets: label, y: y - 28, alpha: 0, delay: 240, duration: 700,
      ease: "Cubic.Out", onComplete: () => label.destroy() });
  }

  announceTurn() {
    this.tweens.killTweensOf(this.turnText);
    this.turnText.setScale(0.88).setAlpha(0.4);
    this.tweens.add({ targets: this.turnText, scaleX: 1, scaleY: 1, alpha: 1,
      duration: 330, ease: "Back.Out" });
    const panel = this.handPanels[this.match.turn];
    this.tweens.add({ targets: panel, alpha: 0.65, duration: 180, yoyo: true });
  }

  updateHud() {
    const state = this.match;
    this.updateGems();
    this.turnText.setText(state.finished ? "MATCH COMPLETE" : `PLAYER ${state.turn + 1}'S TURN`).setColor(state.finished ? "#ffdc83" : COLORS[state.turn]);
    this.playerLabels.forEach((label, owner) => {
      label.setText(`PLAYER ${owner + 1}${state.turn === owner && !state.finished ? "  •" : ""}`).setColor(COLORS[owner]);
      this.deckLabels[owner].setText(`${state.hands[owner].length} IN HAND  /  ${state.decks[owner].length} IN DECK`);
      this.handPanels[owner].setStrokeStyle(state.turn === owner && !state.finished ? 2 : 1, state.turn === owner && !state.finished ? owner === 0 ? 0x7abfff : 0xff9979 : 0x385458);
    });
    this.statusText.setText(state.finished ? "Most gems wins." : "Choose a hero from your hand to see legal moves.");
    if (this.network && !state.finished) this.statusText.setText(!this.network.canAct() ? 'Waiting for both players to connect.'
      : state.turn !== this.network.session.player ? "Opponent's turn · waiting for their move" : 'Your turn · choose a hero');
    this.logText.setText(state.lastMove);
    const occupied = state.map.reduce((sum, row, y) => sum + row.filter((tile, x) => tile.playable === 2 && state.board[y][x]).length, 0);
    const total = state.map.flat().filter(tile => tile.playable === 2).length;
    const scores = scoreGems(state);
    this.scoreText.setText(`${state.mapTitle ?? 'Picnic'}   ·   MOVE ${state.moves}   ·   PICNIC ${occupied}/${total}   ·   GEMS  BLUE ${scores[0]} / RED ${scores[1]} / FREE ${state.gems.length - scores[0] - scores[1]}`);
  }

  showResult() {
    this.music.stop();
    this.sound.play("win", { volume: 0.4 });
    this.add.rectangle(550, 410, 1100, 820, 0x06171c, 0.88).setDepth(40).setInteractive();
    this.add.rectangle(550, 390, 600, 310, 0x193238).setStrokeStyle(2, 0xffdc83).setDepth(41);
    this.text(550, 295, "THE PICNIC IS OVER", 14, "#a8bebc").setDepth(42);
    const title = this.text(550, 350, this.match.winner == null ? "It's a draw!" : `Player ${this.match.winner + 1} wins!`, 42, "#ffdc83").setDepth(42).setScale(0.65);
    this.tweens.add({ targets: title, scaleX: 1, scaleY: 1, duration: 550, ease: "Back.Out" });
    this.text(550, 408, this.match.reason, 16).setDepth(42);
    const scores = scoreGems(this.match);
    this.text(550, 440, `Gems held · Blue ${scores[0]} / Red ${scores[1]}`, 14, "#a8bebc").setDepth(42);
    this.button(550, 496, this.network ? "Request rematch" : "Play again", () => this.network ? this.network.rematch() : this.scene.restart()).setDepth(42);
    for (let i = 0; i < 50; i++) {
      const confetti = this.add.rectangle(Phaser.Math.Between(220, 880), -20,
        6, 12, [0xffdc83, 0xff9979, 0x7abfff][i % 3]).setDepth(43);
      this.tweens.add({ targets: confetti, x: confetti.x + Phaser.Math.Between(-130, 130),
        y: 860, angle: Phaser.Math.Between(-540, 540), alpha: 0, delay: i * 15,
        duration: Phaser.Math.Between(1800, 2600), ease: "Sine.In", onComplete: () => confetti.destroy() });
    }
  }
}
