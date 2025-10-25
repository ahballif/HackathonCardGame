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

        this.title_type = 0;
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

    




}