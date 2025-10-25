import Card from "../objects/card.js";
import Tile from "../objects/tile.js"

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

    // set up the board 

    

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


    this.createGrid(100, 100, 50, 50, 5, 5);
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

  // draw the grid
  createGrid(gridOriginX, gridOriginY, tilewidth, tileheight, nx, ny) {

    const grid = [];
      for (let r = 0; r < ny; r++) {
        const row = [];
        for (let c = 0; c < nx; c++) {
          row.push(new Tile(this, gridOriginX, gridOriginY, c, r, tilewidth, tileheight)); // or whatever initial value you want
        }
        grid.push(row);
      }


  }



  movecard(card, newx, newy, pushdirection) {
    // push direction can be 0 for no push, 1 for up, 2 for right, 3 for down, 4 for left

    // This function assumes the assigned movement is legal. 

    if (grid[newy][newx].card == null) {
      // This means there is no card at that location
      grid[newy][newx].card = card;

    } else {
      // This means there is a card at that location, so we must use the push

      let nextcard = grid[newy][newx].card; // we are going to call move card on this later
      grid[newy][newx].card = card;
      let next_newx = newx;
      let next_newy = newy;

      if (pushdirection == 0) {
        console.log("An illegal card placement occured ")
      } else if (pushdirection == 1) {
        next_newy = next_newy - 1;
      } else if (pushdirection == 2) {
        next_newx = next_newx + 1;
      } else if (pushdirection == 3) {
        next_newy = next_newy + 1;
      } else if (pushdirection == 4) {
        next_newx = next_newx - 1;
      }

      // now if its not a bomb, then push the next card over
      if (card.cardtype[pushdirection - 1] != "3") {
        this.movecard(nextcard, next_newx, next_newy, pushdirection);
      }

      // if its a color switch
      if (card.cardtype[4] == "1") {
        nextcard.color = card.color;
      }

    }
  }

  isMoveLegal(cardtype, x, y, pushdirection) {

    // push direction can be 0 for no push, 1 for up, 2 for right, 3 for down, 4 for left

    gridcard = grid[y][x].card;

    if (pushdirection == 0) {
      return gridcard == null;
    } else if (pushdirection == 1) {
      return (Number(cardtype[0]) > Number(gridcard.cardtype[2]));
    } else if (pushdirection == 2) {
      return (Number(cardtype[1]) > Number(gridcard.cardtype[3]));
    } else if (pushdirection == 3) {
      return (Number(cardtype[2]) > Number(gridcard.cardtype[0]));
    } else if (pushdirection == 4) {
      return (NUmber(cardtype[3]) > Number(gridcard.cardtype[1]));
    }
    return false
  }

}
