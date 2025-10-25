export default class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, cardData, clickFunction) {
    super(scene, x, y);
    this.scene = scene;
    this.cardData = cardData;

    this.drawCard(200, 200);

    this.clickFunction = clickFunction; // This is the function that gets called when you click on the card
    
  }


  // this function is called by the drawCard function
  addArrows(push) {
  const cardW = this.cardImage.displayWidth;
  const cardH = this.cardImage.displayHeight;

  const directions = ["up", "right", "down", "left"];
  const offsets = {
    up: [0, -cardH * 0.45],
    right: [cardW * 0.38, 0],
    down: [0, cardH * 0.45],
    left: [-cardW * 0.38, 0]
  };

  for (let i = 0; i < 4; i++) {
    const val = Number(push[i]);
    if (val > 0) {
      const dir = directions[i];
      const key = `arrow_${dir}${val === 2 ? "_double" : ""}`;
      const arrow = this.scene.add.image(offsets[dir][0], offsets[dir][1], key);
      arrow.setDisplaySize(25, 25);
      this.add(arrow);
    }
  }
}




  drawCard(screenwidth, screenheight) {
    // Add card image
    this.cardImage = this.scene.add.image(0, 0, this.cardData.name);
    this.cardImage.setDisplaySize(screenwidth, screenheight);
    this.cardImage.setInteractive();          // makes it clickable
    this.cardImage.on('pointerdown', () => {
      this.clickFunction();
    });
    this.add(this.cardImage);

    // Add arrows on top
    this.addArrows(this.cardData.push);

    // Optional: name text below
    // const text = scene.add.text(0, 90, this.cardData.name, {
    //   fontSize: "12px",
    //   color: "#fff",
    //   align: "center"
    // }).setOrigin(0.5);
    // this.add(text);

    this.scene.add.existing(this);
  }

}
