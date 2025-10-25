import Card from "../objects/card.js";
import Tile from "../objects/tile.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // Load arrows
    this.load.image("arrow_up", "assets/arrow_up_new.png");
    this.load.image("arrow_down", "assets/arrow_down_new.png");
    this.load.image("arrow_left", "assets/arrow_left_new.png");
    this.load.image("arrow_right", "assets/arrow_right_new.png");
    this.load.image("back_tile", "assets/Back Tile.png");
    this.load.image("no_play", "assets/Non-Playable.png");
    this.load.image("picnic_tile", "assets/Picnic Playable.png");

    // Optional: double-arrow versions
    this.load.image("arrow_up_double", "assets/arrow_up_double_new.png");
    this.load.image("arrow_down_double", "assets/arrow_down_double_new.png");
    this.load.image("arrow_left_double", "assets/arrow_left_double_new.png");
    this.load.image("arrow_right_double", "assets/arrow_right_double_new.png");

    // Load card images from folder
    CARD_LIBRARY.forEach(card => {
      this.load.image(card.name, `Cards/${card.image}`);
    });
  }

  create() {
    // --- BASIC SETUP ---
    this.turnIsP1 = true;
    this.nx = 5;
    this.ny = 5;

    const { width, height } = this.scale;

    // Title
    this.add.text(width / 2, 40, "Card Game View", {
      color: "#fff",
      fontSize: "20px",
    }).setOrigin(0.5);

    // --- GRID (centered) ---
    const gridWidth = 300;
    const gridHeight = 300;
    const gridOriginX = width / 2 - gridWidth / 2;
    const gridOriginY = height / 2 - gridHeight / 2;
    this.createGrid(gridOriginX, gridOriginY, gridWidth / this.nx, gridHeight / this.ny);

    // --- PLAYERS ---
    const p1hand = Phaser.Utils.Array.Shuffle(CARD_LIBRARY).slice(0, 3);
    const p2hand = Phaser.Utils.Array.Shuffle(CARD_LIBRARY).slice(3, 6);

    const leftX = 150;
    const rightX = width - 150;
    const centerY = height / 2;

    // Player 1 (left)
    this.createHand(p1hand, leftX, centerY, "vertical", false);

    // Player 2 (right)
    this.createHand(p2hand, rightX, centerY, "vertical", false);
  }

  // --- HAND CREATION (supports vertical or horizontal) ---
  createHand(cards, x, centerY, layout = "horizontal", flipped = false) {
    const spacing = 150;
    const totalSpan = (cards.length - 1) * spacing;
    const startY = centerY - totalSpan / 2;

    cards.forEach((cardData, i) => {
      let card;
      if (layout === "horizontal") {
        const posX = x - totalSpan / 2 + i * spacing;
        card = new Card(this, posX, centerY, cardData).setInteractive();
      } else {
        const posY = startY + i * spacing;
        card = new Card(this, x, posY, cardData);
      }

      if (flipped) card.setScale(-1, -1);
    });
  }

  // --- GRID CREATION ---
  createGrid(gridOriginX, gridOriginY, tilewidth, tileheight) {
    const grid = [];
    for (let r = 0; r < this.ny; r++) {
      const row = [];
      for (let c = 0; c < this.nx; c++) {
        row.push(new Tile(this, gridOriginX, gridOriginY, c, r, tilewidth, tileheight));
      }
      grid.push(row);
    }
    this.grid = grid;
  }

  // --- MOVEMENT + RULE LOGIC ---
  // This does recursion to calculate the movement of all the cards when you push a card. 
  // This function is called by the buttons that are displayed by the tiles (see below. ) movecard(card, newx, newy, pushdirection) { 
  // push direction can be 0 for no push, 1 for up, 2 for right, 3 for down, 4 for left 
  // This function assumes the assigned movement is legal.
  movecard(card, newx, newy, pushdirection) {
    if (grid[newy][newx].card == null) {
        // This means there is no card at that location
      grid[newy][newx].card = card;
      card.x = grid[newy][newx].screenx;
      card.y = grid[newy][newx].screeny;
    } else {
      let nextcard = grid[newy][newx].card;
      grid[newy][newx].card = card;
      card.x = grid[newy][newx].screenx;
      card.y = grid[newy][newx].screeny;

      let next_newx = newx;
      let next_newy = newy;

      if (pushdirection == 0) {
        console.log("An illegal card placement occurred");
      } else if (pushdirection == 1) {
        next_newy--;
      } else if (pushdirection == 2) {
        next_newx++;
      } else if (pushdirection == 3) {
        next_newy++;
      } else if (pushdirection == 4) {
        next_newx--;
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
  // This calculates if a certain move is legal based on the arrows of the card and the one it is trying to push
  isMoveLegal(cardtype, x, y, pushdirection) {
    const gridcard = grid[y][x].card;

    // push direction can be 0 for no push, 1 for up, 2 for right, 3 for down, 4 for left

    if (pushdirection == 0) return gridcard == null;
    if (pushdirection == 1) return Number(cardtype[0]) > Number(gridcard.cardtype[2]);
    if (pushdirection == 2) return Number(cardtype[1]) > Number(gridcard.cardtype[3]);
    if (pushdirection == 3) return Number(cardtype[2]) > Number(gridcard.cardtype[0]);
    if (pushdirection == 4) return Number(cardtype[3]) > Number(gridcard.cardtype[1]);
    return false;
  }

  // This iterates through all the grid tiles and then if a legal move is available it tells the tile to display the button 
  // that triggers the move. If the button is clicked, it moves the card and switches to the other player's turn.

  displayTurnButtons(selectedCard) {
    for (let yi = 0; yi < this.ny; yi++) {
      for (let xi = 0; xi < this.nx; xi++) {
        let thisTile = grid[yi][xi];
        if (thisTile.tile_type != 0) {
            // checking each of the 5 possible moves and if it's legal, it displays the button.
          if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 0)) {
            thisTile.showPlaceButton(() => {
              this.movecard(selectedCard, xi, yi, 0);
              this.turnIsP1 = !this.turnIsP1;
            });
          } else {
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 1))
              thisTile.showPushUpButton(() => {
                this.movecard(selectedCard, xi, yi, 1);
                this.turnIsP1 = !this.turnIsP1;
              });
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 2))
              thisTile.showPushRightButton(() => {
                this.movecard(selectedCard, xi, yi, 2);
                this.turnIsP1 = !this.turnIsP1;
              });
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 3))
              thisTile.showPushDownButton(() => {
                this.movecard(selectedCard, xi, yi, 3);
                this.turnIsP1 = !this.turnIsP1;
              });
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 4))
              thisTile.showPushLeftButton(() => {
                this.movecard(selectedCard, xi, yi, 4);
                this.turnIsP1 = !this.turnIsP1;
              });
          }
        }
      }
    }
  }
}
