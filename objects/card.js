// This is the bare bones card class
class Card {

  constructor() {
    this.name = "dvorak";
    this.cardtype = "0102";
  }

}



// class Card {
//   constructor(scene, x, y, color, data) {
//     this.scene = scene;
//     this.color = color;
//     this.name = data.name;
//     this.effect = data.effect;
//     this.arrows = data.arrows;
//     this.imageKey = data.image;

//     const cell = scene.grid.cells[y][x];
//     this.sprite = scene.add.image(cell.tile.x, cell.tile.y, this.imageKey).setScale(0.5);
//     this.sprite.setTint(color === 'red' ? 0xff4444 : 0x4444ff);

//     this.arrowSprites = [];
//     this.drawArrows(cell.tile.x, cell.tile.y);

//     // Optional: label for debugging
//     this.label = scene.add.text(cell.tile.x - 30, cell.tile.y + 40, this.name, { fontSize: 12, color: '#fff' });
//   }

// //   drawArrows(x, y) {
// //     for (const dir of this.arrows) {
// //       const arrow = this.scene.add.image(x, y, 'arrow').setScale(0.25);
// //       arrow.setAngle(
// //         dir === 'up' ? 0 :
// //         dir === 'right' ? 90 :
// //         dir === 'down' ? 180 :
// //         dir === 'left' ? 270 : 0
// //       );
// //       this.arrowSprites.push(arrow);
// //     }
// //   }

//   moveTo(x, y) {
//     const targets = [this.sprite, this.label, ...this.arrowSprites];
//     this.scene.tweens.add({
//       targets,
//       x, y,
//       duration: 200,
//       ease: 'Power2'
//     });
//   }

//   destroy() {
//     this.sprite.destroy();
//     this.label.destroy();
//     for (const a of this.arrowSprites) a.destroy();
//   }
// }