class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    this.load.image('card', 'assets/card.png');
    this.load.image('arrow', 'assets/arrow.png');
  }

  create() {
    this.grid = new Grid(this, 3, 150);
    this.turn = 'red';
    this.turnText = this.add.text(50, 50, 'Turn: Red', { fontSize: 24, color: '#fff' });
  }

  handleTileClick(x, y) {
    if (!this.grid.canPlace(x, y)) return;
    const card = new Card(this, x, y, this.turn);
    this.grid.placeCard(x, y, card);
    this.grid.tryPush(x, y, card.direction);

    this.turn = this.turn === 'red' ? 'blue' : 'red';
    this.turnText.setText(`Turn: ${this.turn}`);
  }
}
