import Card from "../objects/card.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // Load arrows
    this.load.image("arrow_up", "assets/arrow_up.png");
    this.load.image("arrow_down", "assets/arrow_down.png");
    this.load.image("arrow_left", "assets/arrow_left.png");
    this.load.image("arrow_right", "assets/arrow_right.png");

    // Optional: if you have double-arrow versions
    this.load.image("arrow_up_double", "assets/arrow_up_double.png");
    this.load.image("arrow_down_double", "assets/arrow_down_double.png");
    this.load.image("arrow_left_double", "assets/arrow_left_double.png");
    this.load.image("arrow_right_double", "assets/arrow_right_double.png");

    // Load card images from folder
    CARD_LIBRARY.forEach(card => {
      this.load.image(card.name, `Cards/${card.image}`);
    });
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

    // For testing: pick random cards
const p1hand = Phaser.Utils.Array.Shuffle(CARD_LIBRARY).slice(0, 5);
const p2hand = Phaser.Utils.Array.Shuffle(CARD_LIBRARY).slice(5, 10);

// Create both hands
this.createHand(p1hand, 400, 700, false); // bottom hand
this.createHand(p2hand, 400, 100, false);  // top hand


    this.turnIsP1 = true;
    
  

    // Pick a card to visualize
    const example = CARD_LIBRARY[5]; // or random one
    this.add.text(20, 20, "Card Visual Test", { color: "#fff" });

   


    // Create and show card in center
    const card = new Card(this, 400, 400, example);
  }
  createHand(cards, centerX, y, flipped) {
  const spacing = 120; // horizontal distance between cards
  const totalWidth = (cards.length - 1) * spacing;
  const startX = centerX - totalWidth / 2;

  cards.forEach((cardData, i) => {
    const x = startX + i * spacing;
    const card = new Card(this, x, y, cardData);

    if (flipped) {
      // Flip vertically (for top player)
      card.setScale(-1, -1);
    }
  });
}

}
