export default class Tile extends Phaser.GameObjects.Container {

    constructor(scene, gridOriginX, gridOriginY, xi, yi, gridwidth, gridheight) {

        super(scene, gridOriginX + xi*gridwidth, gridOriginY + yi*gridheight);


        this.screenx = gridOriginX + xi*gridwidth;
        this.screeny = gridOriginY + yi*gridheight;
        
        this.gridwidth = gridwidth;
        this.gridheight = gridheight;

        
        this.coordx = xi;
        this.coordy = yi;

        this.card = null; // initial card at location

        this.tile_type = 2;
        // 0 means its not a playable tile
        // 1 means its a regular tile
        // 2 means its a tile that ends the game

        this.drawTile();
        
    }

    drawTile() {
        
        this.tileImage = this.scene.add.image(this.screenx, this.screeny, "back_tile");
        this.tileImage.setDisplaySize(this.gridwidth*0.9, this.gridheight*0.9);

        this.scene.add.existing(this);



    }

    updateCardOnTile() {
        // moves card to right spot
        this.card.x = this.screenx;
        this.card.y = this.screeny;
    }


    // the possible move buttons. 

    // These buttons only display the image relative to this tile, but the actual rule calculations are done in MainScene. 
    showPlaceButton(moveCommand) {
        this.placeButton = this.scene.add.image(this.screenx, this.screeny, 'place_button')
            .setInteractive()          // makes it clickable
            .on('pointerdown', () => {
                moveCommand();
            });
        this.placeButton.setDisplaySize(50, 50);
    }
    showPushUpButton() {
        this.pushUpButton = this.scene.add.image(this.screenx, this.screeny + this.gridheight/2, 'push_up_button')
            .setInteractive()          // makes it clickable
            .on('pointerdown', () => {
                moveCommand();
            });
        this.pushUpButton.setDisplaySize(50, 50);
    }
    showPushRightButton () {
        this.pushRightButton = this.scene.add.image(this.screenx - this.gridwidth/2, this.screeny, 'push_right_button')
            .setInteractive()          // makes it clickable
            .on('pointerdown', () => {
                moveCommand();
            });
        this.pushRightButton.setDisplaySize(50, 50);
    }
    showPushDownButton() {
        this.pushDownButton = this.scene.add.image(this.screenx, this.screeny - this.gridheight/2, 'push_down_button')
            .setInteractive()          // makes it clickable
            .on('pointerdown', () => {
                moveCommand();
            });
        this.pushDownButton.setDisplaySize(50, 50);
    }
    showPushLeftButton () {
        this.pushLeftButton = this.scene.add.image(this.screenx + this.gridwidth/2, this.screeny, 'push_left_button')
            .setInteractive()          // makes it clickable
            .on('pointerdown', () => {
                moveCommand();
            });
        this.pushLeftButton.setDisplaySize(50, 50);
    }

    clearOptionButtons() {
        if (this.placeButton != null) {
            this.placeButton.destroy();
            this.placeButton = null;
        }
        


    }
    
    




}