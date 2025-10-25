class Tile {

    constructor(xi, yi) {
        this.card = null
        this.coordx = xi
        this.coordy = yi

        this.title_type = 0
        // 0 means its not a playable tile
        // 1 means its a regular tile
        // 2 means its a tile that ends the game
    }

    drawTile() {
        if (this.card != null) {
            // Draw the card image
            this.card
        }
    }

    




}