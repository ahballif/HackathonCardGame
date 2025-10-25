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


    let gridHeight = 5
    let gridWidth = 5

    
    // set up the board 

    const grid = [];
    for (let r = 0; r < gridHeight; r++) {
      const row = [];
      for (let c = 0; c < gridWidth; c++) {
        row.push(0); // or whatever initial value you want
      }
      grid.push(row);
    }

    // set up the players

    const p1deck = [] // deck of all unflipped cards
    const p1hand = []
    const p2deck = []
    const p2hand = []

    this.turnIsP1 = true;
    
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
