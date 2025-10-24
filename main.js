// Simple Phaser 3 tile-card game (ES6 OOP style)
class Tile {
  constructor(scene, x, y, size, row, col) {
    this.scene = scene;
    this.row = row;
    this.col = col;
    this.size = size;
    this.x = x;
    this.y = y;
    this.occupied = false;

    // Draw rectangle and make interactive
    this.rect = scene.add.rectangle(x, y, size - 4, size - 4, 0x444444).setStrokeStyle(2, 0x999999);
    this.rect.setInteractive();
    this.rect.on('pointerdown', () => this.onClick());

    // small reference to placed card
    this.card = null;
  }

  highlight(valid = true) {
    if (this.occupied) return; // don't highlight occupied
    this.rect.setFillStyle(valid ? 0x336633 : 0x663333);
  }

  clearHighlight() {
    if (this.occupied) return;
    this.rect.setFillStyle(0x444444);
  }

  placeCard(card) {
    if (this.occupied) return false;
    this.card = card;
    this.occupied = true;
    card.placeAt(this.x, this.y);
    return true;
  }

  onClick() {
    // bubble up to scene
    this.scene.handleTileClick(this);
  }
}

class Card {
  constructor(scene, x, y, w, h, label, color=0xffff66) {
    this.scene = scene;
    this.w = w; this.h = h;
    this.x = x; this.y = y;
    this.label = label;
    this.color = color;
    this.placed = false;

    this.container = scene.add.container(x, y);
    this.bg = scene.add.rectangle(0, 0, w, h, color).setStrokeStyle(2, 0x222222);
    this.txt = scene.add.text(0, 0, label, { fontFamily: 'sans-serif', fontSize: '16px', color: '#000' }).setOrigin(0.5);
    this.container.add([this.bg, this.txt]);
    this.container.setSize(w, h);
    this.container.setInteractive(new Phaser.Geom.Rectangle(-w/2, -h/2, w, h), Phaser.Geom.Rectangle.Contains);
    this.container.on('pointerdown', () => this.onClick());

    // simple pointerover cursor change
    this.container.on('pointerover', () => { this.bg.setStrokeStyle(3, 0xffffff); });
    this.container.on('pointerout', () => { this.bg.setStrokeStyle(2, 0x222222); });
  }

  onClick() {
    if (this.placed) return; // can't select placed card
    this.scene.handleCardClick(this);
  }

  placeAt(x, y) {
    this.container.x = x;
    this.container.y = y;
    this.placed = true;
    // visually shrink a bit
    this.container.scale = 0.9;
    // disable interactivity
    this.container.disableInteractive();
  }

  select() {
    this.bg.setStrokeStyle(4, 0xffd700);
  }

  deselect() {
    this.bg.setStrokeStyle(2, 0x222222);
  }
}

class GameState {
  constructor() {
    this.selectedCard = null;
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // no assets, all drawn procedurally
  }

  create() {
    this.gameState = new GameState();

    // Board layout
    const cols = 5, rows = 5;
    const tileSize = 96;
    const boardWidth = cols * tileSize;
    const boardHeight = rows * tileSize;

    const startX = (this.sys.game.config.width - boardWidth) / 2 + tileSize/2;
    const startY = (this.sys.game.config.height - boardHeight) / 2 - 60;

    this.tiles = [];
    for (let r=0; r<rows; r++) {
      this.tiles[r] = [];
      for (let c=0; c<cols; c++) {
        const x = startX + c*tileSize;
        const y = startY + r*tileSize;
        const t = new Tile(this, x, y, tileSize, r, c);
        this.tiles[r][c] = t;
      }
    }

    // Player hand area (simple fixed set of cards)
    this.cards = [];
    const handY = startY + boardHeight/2 + 160;
    const handX0 = this.sys.game.config.width/2 - 160;
    for (let i=0; i<4; i++) {
      const card = new Card(this, handX0 + i*110, handY, 100, 140, 'Card ' + (i+1), 0xffffb3 - i*0x1010);
      this.cards.push(card);
    }

    // small status text
    this.statusText = this.add.text(10, this.sys.game.config.height - 30, 'Select a card', { fontFamily: 'sans-serif', fontSize: '16px', color:'#fff' });
  }

  handleCardClick(card) {
    // deselect previously selected
    if (this.gameState.selectedCard === card) {
      // deselect
      card.deselect();
      this.gameState.selectedCard = null;
      this.clearHighlights();
      this.statusText.setText('Select a card');
      return;
    }

    if (this.gameState.selectedCard) {
      this.gameState.selectedCard.deselect();
    }
    this.gameState.selectedCard = card;
    card.select();
    this.showValidTilesFor(card);
    this.statusText.setText('Click a highlighted tile to place ' + card.label);
  }

  handleTileClick(tile) {
    const sel = this.gameState.selectedCard;
    if (!sel) {
      this.statusText.setText('Select a card first');
      return;
    }

    // simple rule: allow placement on any empty tile. Example extension: only neighbors of occupied tiles etc.
    if (tile.occupied) {
      this.statusText.setText('Tile occupied');
      return;
    }

    // Place card
    const placed = tile.placeCard(sel);
    if (placed) {
      sel.deselect();
      this.gameState.selectedCard = null;
      this.clearHighlights();
      this.statusText.setText(sel.label + ' placed at ' + tile.row + ',' + tile.col);
    }
  }

  clearHighlights() {
    for (let r of this.tiles) for (let t of r) t.clearHighlight();
  }

  showValidTilesFor(card) {
    // Example rule: highlight all empty tiles. You can change to custom logic per card.
    for (let r=0; r<this.tiles.length; r++) {
      for (let c=0; c<this.tiles[r].length; c++) {
        const t = this.tiles[r][c];
        if (!t.occupied) t.highlight(true);
        else t.clearHighlight();
      }
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 700,
  backgroundColor: '#2b2b2b',
  parent: 'game-container',
  scene: [GameScene]
};

const game = new Phaser.Game(config);

