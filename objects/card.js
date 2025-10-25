class Card {
  constructor(scene, x, y, color) {
    this.scene = scene;
    this.color = color;

    const cell = scene.grid.cells[y][x];
    this.sprite = scene.add.image(cell.tile.x, cell.tile.y, 'card').setScale(0.5);
    this.sprite.setTint(color === 'red' ? 0xff4444 : 0x4444ff);

    const dirs = ['up', 'down', 'left', 'right'];
    this.direction = Phaser.Utils.Array.GetRandom(dirs);

    this.arrow = scene.add.image(cell.tile.x, cell.tile.y, 'arrow').setScale(0.3);
    this.arrow.setAngle(
      this.direction === 'up' ? 0 :
      this.direction === 'right' ? 90 :
      this.direction === 'down' ? 180 :
      270
    );
  }

  moveTo(x, y) {
    this.scene.tweens.add({
      targets: [this.sprite, this.arrow],
      x, y,
      duration: 200,
      ease: 'Power2'
    });
  }

  destroy() {
    this.sprite.destroy();
    this.arrow.destroy();
  }
}
