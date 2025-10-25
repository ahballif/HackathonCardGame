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
    const gridWidth = 600;
    const gridHeight = 600;
    const gridOriginX = width / 2 - gridWidth / 2;
    const gridOriginY = height / 2 - gridHeight / 2;
    this.createGrid(gridOriginX, gridOriginY, gridWidth / this.nx, gridHeight / this.ny);

    // --- PLAYERS ---
    this.p1deck = Phaser.Utils.Array.Shuffle(CARD_LIBRARY).splice(0, 16);
    this.p2deck = Phaser.Utils.Array.Shuffle(CARD_LIBRARY).splice(0, 16);
    const p1hand = this.p1deck.splice(0, 3);
    const p2hand = this.p2deck.splice(0, 3);

    const leftX = 150;
    const rightX = width - 150;
    const centerY = height / 2;

    // Player 1 (left)
    this.createHand(p1hand, leftX, centerY, "vertical", false);

    // Player 2 (right)
    this.createHand(p2hand, rightX, centerY, "vertical", false, false);
  }

  // --- HAND CREATION (supports vertical or horizontal) ---
  createHand(cards, x, centerY, layout = "horizontal", flipped = false, isPlayer1 = true) {
    const spacing = 150;
    const totalSpan = (cards.length - 1) * spacing;
    const startY = centerY - totalSpan / 2;

    cards.forEach((cardData, i) => {
      let card;
      if (layout === "horizontal") {
        const posX = x - totalSpan / 2 + i * spacing;
        card = new Card(this, posX, centerY, cardData, () => {
          // When this card is clicked
          if (isPlayer1 == this.turnIsP1) {
            this.displayTurnButtons(card);
          } else {
            console.log("It isn't your turn!")
          }
        });
      } else {
        const posY = startY + i * spacing;
        card = new Card(this, x, posY, cardData, () => {
          // When this card is clicked
          if (isPlayer1 == this.turnIsP1) {
            this.displayTurnButtons(card);
          } else {
            console.log("It isn't your turn!")
          }
        });
      }
      card.isPlayer1 = isPlayer1;

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

  drawNewCard(handx, handy, player1) {
    // Draws a new card and puts 
    let cardData = null
    if (player1) {
      cardData = this.p1deck.shift();
    } else {
      cardData = this.p2deck.shift();
    }
    let card = new Card(this, handx, handy, cardData, () => {
      // When this card is clicked
      if (player1 == this.turnIsP1) {
        this.displayTurnButtons(card);
      } else {
        console.log("It isn't your turn!")
      }
    });
    card.isPlayer1 = player1;
  }


  // --- MOVEMENT + RULE LOGIC ---
  // This does recursion to calculate the movement of all the cards when you push a card. 
  // This function is called by the buttons that are displayed by the tiles (see below. ) movecard(card, newx, newy, pushdirection) { 
  // push direction can be 0 for no push, 1 for up, 2 for right, 3 for down, 4 for left 
  // This function assumes the assigned movement is legal.
  movecard(card, newx, newy, pushdirection) {
    if (this.grid[newy][newx].card == null) {
        // This means there is no card at that location
      this.grid[newy][newx].card = card;
      card.x = this.grid[newy][newx].screenx;
      card.y = this.grid[newy][newx].screeny;
      card.clickFunction = () => {}; // remove the ability to click it again. 
    } else {
      let nextcard = this.grid[newy][newx].card;
      this.grid[newy][newx].card = card;
      card.x = this.grid[newy][newx].screenx;
      card.y = this.grid[newy][newx].screeny;
      card.clickFunction = () => {}; // remove the ability to click it again. 
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
    
    // push direction can be 0 for no push, 1 for up, 2 for right, 3 for down, 4 for left

    if (pushdirection == 0) return this.grid[y][x].card == null;
    if (pushdirection == 1) {
      for (let yi = y; yi >= -1; yi--) {
        if (yi == -1) return false; // This means it went offf the edge. 
        if (this.grid[yi][x].card == null) return true;
        if (Number(cardtype[0]) <= Number(this.grid[yi][x].card.cardtype[2])) {
          return false
        }
      }
      return true
    }
    if (pushdirection == 2) {
      for (let xi = x; xi <= this.nx; xi++) {
        if (xi == this.nx) return false; // This means it went offff the edge
        if (this.grid[y][xi].card == null) return true;
        if (Number(cardtype[1]) <= Number(this.grid[y][xi].card.cardtype[3])) {
          return false
        }
      }
      return true
    }
    if (pushdirection == 3) {
      for (let yi = y; yi <= this.ny; yi ++) {
        if (yi == this.ny) return false; // This means it went off the edge
        if (this.grid[yi][x].card == null) return true;
        if (Number(cardtype[2]) <= Number(this.grid[yi][x].card.cardtype[0])) {
          return false
        }
      }
      return true
    }
    if (pushdirection == 4) {
      for (let xi = x; xi >= -1; xi --) {
        if (xi == -1) return false; // This means it went off the edge
        if (this.grid[y][xi].card == null) return true;
        if (Number(cardtype[3]) <= Number(this.grid[y][xi].card.cardtype[1])) {
          return false
        }
      }
      return true
    }
    return false;
  }

  // This iterates through all the grid tiles and then if a legal move is available it tells the tile to display the button 
  // that triggers the move. If the button is clicked, it moves the card and switches to the other player's turn.

  displayTurnButtons(selectedCard) {
    for (let yi = 0; yi < this.ny; yi++) {
      for (let xi = 0; xi < this.nx; xi++) {
        let thisTile = this.grid[yi][xi];
        if (thisTile.tile_type != 0) {
            // checking each of the 5 possible moves and if it's legal, it displays the button.
          if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 0)) {
            thisTile.showPlaceButton(() => {
              this.drawNewCard(selectedCard.x, selectedCard.y, selectedCard.isPlayer1);
              this.movecard(selectedCard, xi, yi, 0); // This one doesn't need a try catch
              this.turnIsP1 = !this.turnIsP1;
              this.clearAllOptionButtons();
            });
          } else {
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 1))
              thisTile.showPushUpButton(() => {
                this.drawNewCard(selectedCard.x, selectedCard.y, selectedCard.isPlayer1);
                try {
                  this.movecard(selectedCard, xi, yi, 1);
                } catch (err) {
                  thisTile.pushUpButton.destroy();
                  thisTile.pushUpButton = null;
                }
                this.turnIsP1 = !this.turnIsP1;
                this.clearAllOptionButtons();
              });
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 2))
              thisTile.showPushRightButton(() => {
                this.drawNewCard(selectedCard.x, selectedCard.y, selectedCard.isPlayer1);
                try {
                  this.movecard(selectedCard, xi, yi, 2);
                } catch (err) {
                  thisTile.pushRightButton.destroy();
                  thisTile.pushRightButton = null;
                }
                this.turnIsP1 = !this.turnIsP1;
                this.clearAllOptionButtons();
              });
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 3))
              thisTile.showPushDownButton(() => {
                this.drawNewCard(selectedCard.x, selectedCard.y, selectedCard.isPlayer1);
                try {
                  this.movecard(selectedCard, xi, yi, 3);
                } catch (err) {
                  thisTile.pushDownButton.destroy();
                  thisTile.pushDownButton = null;
                }
                this.turnIsP1 = !this.turnIsP1;
                this.clearAllOptionButtons();
              });
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 4))
              this.drawNewCard(selectedCard.x, selectedCard.y, selectedCard.isPlayer1);
              thisTile.showPushLeftButton(() => {
                try {
                  this.movecard(selectedCard, xi, yi, 4);
                } catch (err) {
                  thisTile.pushLeftButton.destroy();
                  thisTile.pushLeftButton = null;
                }
                this.turnIsP1 = !this.turnIsP1;
                this.clearAllOptionButtons();
              });
          }
        }
      }
    }
  }


  clearAllOptionButtons() {
    for (let yi = 0; yi < this.ny; yi++) {
      for (let xi = 0; xi < this.nx; xi++) {
        let thisTile = this.grid[yi][xi];
        thisTile.clearOptionButtons();
      }
    }
  }

}
