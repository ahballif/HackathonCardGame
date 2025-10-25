class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    // Load all your card art
    // this.load.image('arrow', 'assets/arrow.png');
    // this.load.image('card_cross', 'assets/card_cross.png');
    // this.load.image('card_corner', 'assets/card_corner.png');
    // this.load.image('card_bomb', 'assets/card_bomb.png');
    // this.load.image('card_switch', 'assets/card_switch.png');
    this.load.image('up', 'assets/up.png');

  }

  create() {
    this.grid = new Grid(this, 3, 300);
    this.turn = 'red';
    this.turnText = this.add.text(50, 50, 'Turn: Red', { fontSize: 24, color: '#fff' });
  }

  handleTileClick(x, y) {
    if (!this.grid.canPlace(x, y)) return;

    // pick a random card type for now
    const cardData = Phaser.Utils.Array.GetRandom(CARD_LIBRARY);
    const card = new Card(this, x, y, this.turn, cardData);

    this.grid.placeCard(x, y, card);
    this.grid.tryPush(x, y, card.arrows);

    // Run special effect
    this.runEffect(x, y, card.effect);

    // next player's turn
    this.turn = this.turn === 'red' ? 'blue' : 'red';
    this.turnText.setText(`Turn: ${this.turn}`);
  }

  runEffect(x, y, effect) {
    if (!effect) return;
    if (effect === 'bomb') {
      this.grid.explode(x, y);
    } else if (effect === 'switch') {
      this.grid.switchColorsAround(x, y);
    }
  }
}
