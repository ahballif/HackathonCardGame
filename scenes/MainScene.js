import Card from "../objects/card.js";
import Tile from "../objects/tile.js";
import { TILE_MAP } from "../data/maps.js";


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
    this.load.image("back_tile", "assets/Big Back Tile.png");
    this.load.image("no_play", "assets/Non-Playable.png");
    this.load.image("picnic_tile", "assets/Picnic Playable.png");
    this.load.image("wood1", "assets/Wood playable 1.png");
    this.load.image("wood2", "assets/Wood Playable 2.png");
    this.load.audio("bg", "assets/audio/Background audio.wav");
    this.load.audio("win", "assets/audio/Win audio.wav");
    this.load.audio("credits","assets/audio/pausebetter.mp3")



    // Optional: double-arrow versions
    this.load.image("arrow_up_double", "assets/arrow_up_double_new.png");
    this.load.image("arrow_down_double", "assets/arrow_down_double_new.png");
    this.load.image("arrow_left_double", "assets/arrow_left_double_new.png");
    this.load.image("arrow_right_double", "assets/arrow_right_double_new.png");


    this.load.audio("ld", "assets/audio/LDS audio.wav");
    this.load.audio("ci", "assets/audio/Civil Rights audio.wav");
    this.load.audio("ff", "assets/audio/Founding Fathers audio.wav");
    this.load.audio("co", "assets/audio/Composers audio.wav");
    this.load.audio("ph", "assets/audio/Physicist audio.wav");
    



    // Load card images from folder
    CARD_LIBRARY.forEach((card) => {
      this.load.image(card.name, `Cards/${card.image}`);
    });

    this.load.image("gem", "assets/Gem.png")

  }

  create() {
    // --- BASIC SETUP ---
    this.music = this.sound.add("bg", { loop: true, volume: 0.5 });
    this.music.play();
    this.turnIsP1 = true;
    this.nx = 4;
    this.ny = 4;

    const { width, height } = this.scale;

    // Title
    this.add.text(width / 2, 40, "History Hero's Picnic Wrestle!", {
      color: "#fff",
      fontSize: "20px",
    }).setOrigin(0.5);

    this.messages = [];

    // --- GRID (centered) ---
    const gridWidth = 600;
    const gridHeight = 600;
    const gridOriginX = width / 2 - gridWidth / 2 + gridWidth / this.nx / 2;
    const gridOriginY = height / 2 - gridHeight / 2 + gridHeight / this.ny / 2;
    this.createGrid(gridOriginX, gridOriginY, gridWidth / this.nx, gridHeight / this.ny, 0);


    // --- PLAYERS ---
    this.p1deck = Phaser.Utils.Array.Shuffle(CARD_LIBRARY).splice(0, 16);
    this.p2deck = Phaser.Utils.Array.Shuffle(CARD_LIBRARY).splice(0, 16);
    const p1hand = this.p1deck.splice(0, 3);
    const p2hand = this.p2deck.splice(0, 3);

    const leftX = 150;
    const rightX = width - 150;
    const centerY = height / 2;

    // Player 1 (left)
    this.createHand(p1hand, leftX, centerY, "vertical", false, true);

    // Player 2 (right)
    this.createHand(p2hand, rightX, centerY, "vertical", false, false);


    // Create the Gem
    // Pick a random X between 0 and nx-1
    this.gemLocationX = Math.round(Math.random()) + 1;
    this.gemLocationY = Math.round(Math.random()) + 1;

    // this.gemLocationX = Math.floor(Math.random() * this.nx);

    // // Pick a random Y between 0 and ny-1
    // this.gemLocationY = Math.floor(Math.random() * this.ny);

    // // Re-roll if it’s a corner
    // while (
    //     (this.gemLocationX === 0 && this.gemLocationY === 0) ||                         // top-left
    //     (this.gemLocationX === this.nx - 1 && this.gemLocationY === 0) ||               // top-right
    //     (this.gemLocationX === 0 && this.gemLocationY === this.ny - 1) ||               // bottom-left
    //     (this.gemLocationX === this.nx - 1 && this.gemLocationY === this.ny - 1)       // bottom-right
    // ) {
    //     this.gemLocationX = Math.floor(Math.random() * this.nx);
    //     this.gemLocationY = Math.floor(Math.random() * this.ny);
    // }

    console.log(this.gemLocationX, this.gemLocationY);

    
    this.gemImage = this.add.image(this.grid[this.gemLocationY][this.gemLocationX].screenx,
                                   this.grid[this.gemLocationY][this.gemLocationX].screeny, "gem");
    this.gemImage.setDisplaySize(100, 100);
    this.gemImage.setDepth(5);


  }



  // --- HAND CREATION (supports vertical or horizontal) ---
  createHand(cards, x, centerY, layout = "horizontal", flipped = false, isPlayer1) {
    const spacing = 150;
    const totalSpan = (cards.length - 1) * spacing;
    const startY = centerY - totalSpan / 2;

    cards.forEach((cardData, i) => {
      let card;
      
      const posY = startY + i * spacing;
      card = new Card(this, x, posY, cardData, () => {
        // When this card is clicked
        if (isPlayer1 == this.turnIsP1) {
        
        //play sound
        this.sound.play(card.effect);
          this.displayTurnButtons(card);
        } else {
          this.messages = this.messages || [];
          const text = this.add.text(100, 100, "It's not your turn!", {
              fontSize: "24px",
              color: "#ff2828ff"
          });
          this.messages.push(text);
        }
      }, isPlayer1);
      
      
      if (flipped) card.setScale(-1, -1);
    });
  }
  fadeMusicForEffect(sfxKey, duration = 1000) {
  const sfx = this.sound.add(sfxKey);
  const fadeTime = 300; // fade in/out speed (ms)
  const originalVolume = this.bgMusic.volume;

  // Fade down the background music
  this.tweens.add({
    targets: this.bgMusic,
    volume: originalVolume * 0.3, // reduce to 30%
    duration: fadeTime,
    onComplete: () => {
      // Play the sound effect
      sfx.play();

      // When the SFX finishes, fade the music back up
      sfx.once("complete", () => {
        this.tweens.add({
          targets: this.bgMusic,
          volume: originalVolume,
          duration: fadeTime,
        });
      });
    },
  });
}



  // --- GRID CREATION ---

  createGrid(gridOriginX, gridOriginY, tileWidth, tileHeight, mapIndex = 0) {
    const mapData = TILE_MAP[mapIndex].map;
    const rows = mapData.length;
    const cols = mapData[0].length;

    const grid = [];

    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
        const tileInfo = mapData[r][c];

        const tile = new Tile(this, gridOriginX, gridOriginY, c, r, tileWidth, tileHeight);
        tile.type = tileInfo.type;
        tile.tile_type = tileInfo.playable;
        tile.occupied = tileInfo.occupied || false;
        tile.card = tileInfo.card || null;

        switch (tileInfo.type) {
            case "dirt":
            tile.tileImage.setTexture("no_play");
            break;
            case "grass":
            tile.tileImage.setTexture("back_tile");
            break;
            case "picnic":
            tile.tileImage.setTexture("picnic_tile");
            break;
        }

        row.push(tile);
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
        this.messages = this.messages || [];
        const text = this.add.text(100, 100, "It's not your turn!", {
            fontSize: "24px",
            color: "#ff2828ff"
        });
        this.messages.push(text);
      }
    }, player1);
  }


  // --- MOVEMENT + RULE LOGIC ---
  // This does recursion to calculate the movement of all the cards when you push a card.
  // This function is called by the buttons that are displayed by the tiles (see below. ) movecard(card, newx, newy, pushdirection) {
  // push direction can be 0 for no push, 1 for up, 2 for right, 3 for down, 4 for left
  // This does recursion to calculate the movement of all the cards when you push a card.
  // This function is called by the buttons that are displayed by the tiles (see below. ) movecard(card, newx, newy, pushdirection) {
  // push direction can be 0 for no push, 1 for up, 2 for right, 3 for down, 4 for left
  // This function assumes the assigned movement is legal.
  movecard(card, newx, newy, pushdirection) {
    if (this.grid[newy][newx].card == null) {
      // This means there is no card at that location
      // This means there is no card at that location
      this.grid[newy][newx].card = card;
      card.x = this.grid[newy][newx].screenx;
      card.y = this.grid[newy][newx].screeny;
      card.clickFunction = () => {}; // remove the ability to click it again.
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
  if (this.grid[y][x].tile_type == 2) {
  if (pushdirection == 0) {
    if (y == this.gemLocationY && x == this.gemLocationX) {
      return false
    }
    
    if (this.grid[y][x].card != null) {
      return false
    }
    return true
  } else if (this.grid[y][x].card != null) {
  
  if (pushdirection == 1) {
    for (let yi = y; yi >= -1; yi--) {
      if (yi == -1) return false;
      if (this.grid[yi][x].card == null) return true;
      if (Number(cardtype[0]) <= Number(this.grid[yi][x].card.cardtype[2])) {
        return false;
      }
    }
    return true;
  }

  if (pushdirection == 2) {
    for (let xi = x; xi <= this.nx; xi++) {
      if (xi == this.nx) return false;
      if (this.grid[y][xi].card == null) return true;
      if (Number(cardtype[1]) <= Number(this.grid[y][xi].card.cardtype[3])) {
        return false;
      }
    }
    return true;
  }

  if (pushdirection == 3) {
    for (let yi = y; yi <= this.ny; yi++) {
      if (yi == this.ny) return false;
      if (this.grid[yi][x].card == null) return true;
      if (Number(cardtype[2]) <= Number(this.grid[yi][x].card.cardtype[0])) {
        return false;
      }
    }
    return true;
  }

  if (pushdirection == 4) {
    for (let xi = x; xi >= -1; xi--) {
      if (xi == -1) return false;
      if (this.grid[y][xi].card == null) return true;
      if (Number(cardtype[3]) <= Number(this.grid[y][xi].card.cardtype[1])) {
        return false;
      }
    }
    return true;
  }

  }
}

  return false;
}


  // This iterates through all the grid tiles and then if a legal move is available it tells the tile to display the button
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
              this.drawNewCard(
                selectedCard.x,
                selectedCard.y,
                selectedCard.isPlayer1
              );
              this.drawNewCard(
                selectedCard.x,
                selectedCard.y,
                selectedCard.isPlayer1
              );
              this.movecard(selectedCard, xi, yi, 0); // This one doesn't need a try catch
              this.turnIsP1 = !this.turnIsP1;
              this.clearAllOptionButtons();
              this.calculateWinCondition();
            });
          } else {
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 1))
              thisTile.showPushUpButton(() => {
                this.drawNewCard(
                  selectedCard.x,
                  selectedCard.y,
                  selectedCard.isPlayer1
                );
                this.drawNewCard(
                  selectedCard.x,
                  selectedCard.y,
                  selectedCard.isPlayer1
                );
                try {
                  this.movecard(selectedCard, xi, yi, 1);
                } catch (err) {
                  thisTile.pushUpButton.destroy();
                  thisTile.pushUpButton = null;
                }
                this.turnIsP1 = !this.turnIsP1;
                this.clearAllOptionButtons();
                this.calculateWinCondition();
              });
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 2))
              thisTile.showPushRightButton(() => {
                this.drawNewCard(
                  selectedCard.x,
                  selectedCard.y,
                  selectedCard.isPlayer1
                );
                this.drawNewCard(
                  selectedCard.x,
                  selectedCard.y,
                  selectedCard.isPlayer1
                );
                try {
                  this.movecard(selectedCard, xi, yi, 2);
                } catch (err) {
                  thisTile.pushRightButton.destroy();
                  thisTile.pushRightButton = null;
                }
                this.turnIsP1 = !this.turnIsP1;
                this.clearAllOptionButtons();
                this.calculateWinCondition();
              });
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 3))
              thisTile.showPushDownButton(() => {
                this.drawNewCard(
                  selectedCard.x,
                  selectedCard.y,
                  selectedCard.isPlayer1
                );
                this.drawNewCard(
                  selectedCard.x,
                  selectedCard.y,
                  selectedCard.isPlayer1
                );
                try {
                  this.movecard(selectedCard, xi, yi, 3);
                } catch (err) {
                  thisTile.pushDownButton.destroy();
                  thisTile.pushDownButton = null;
                }
                this.turnIsP1 = !this.turnIsP1;
                this.clearAllOptionButtons();
                this.calculateWinCondition();
              });
            if (this.isMoveLegal(selectedCard.cardtype, xi, yi, 4))
              thisTile.showPushLeftButton(() => {
                this.drawNewCard(selectedCard.x, selectedCard.y, selectedCard.isPlayer1);
                try {
                  this.movecard(selectedCard, xi, yi, 4);
                } catch (err) {
                  thisTile.pushLeftButton.destroy();
                  thisTile.pushLeftButton = null;
                }
                this.turnIsP1 = !this.turnIsP1;
                this.clearAllOptionButtons();
                this.calculateWinCondition();
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
    
    this.clearAllMessages();
  }

  clearAllMessages() {
    for (const txt of this.messages) {
        txt.destroy();
    }
    this.messages = [];
  }

  calculateWinCondition() {
    console.log('calculating')
    for (let yi = 0; yi < this.ny; yi++) {
      for (let xi = 0; xi < this.nx; xi++) {
        if (this.grid[yi][xi].card == null && this.grid[yi][xi].tile_type == 2) return false
      }
    }
    console.log('The game should be over')
    // We made it through all the key tiles, so now calculate the winner
    console.log(this.grid[this.gemLocationY][this.gemLocationX].card)
    if (this.grid[this.gemLocationY][this.gemLocationX].card == null) {
      this.endGame('Its a Tie!')
    } else if (this.grid[this.gemLocationY][this.gemLocationX].card.isPlayer1) {
      this.endGame('Player 1 Wins!')
    } else {
      this.endGame('Player 2 Wins!')
    }
    
    return true
  }


  endGame(message) {
    this.sound.stopAll();
    this.sound.play("win");
    // Show the big message
    const endText = this.add.text(400, 250, message, {
        fontSize: '70px',
        fontStyle: 'bold',
        color: '#ffeb3b',
        stroke: '#000',
        strokeThickness: 8
    }).setOrigin(0.5);

    // Add a restart button under it
    const restartButton = this.add.text(400, 400, "Restart", {
        fontSize: '50px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#0000ff',
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    // Make it clickable
    restartButton.on('pointerdown', () => {
        window.location.reload();  // Reloads the page
    });

    // Optional: hover effect
    restartButton.on('pointerover', () => restartButton.setStyle({ fill: '#ff0' }));
    restartButton.on('pointerout', () => restartButton.setStyle({ fill: '#fff' }));
    this.music = this.sound.add("credits", { loop: true, volume: 0.5 });
    this.music.play({ delay: 2 });
}




}
