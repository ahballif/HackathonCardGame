export default class Tile {
  constructor(scene, x, y, size, data) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.size = size;
    this.buttons = [];
    const texture = { dirt: "no_play", grass: "back_tile", picnic: "picnic_tile" }[data.type];
    scene.add.image(x, y, texture).setDisplaySize(size - 6, size - 6);
    this.highlight = scene.add.rectangle(x, y, size - 8, size - 8).setStrokeStyle(3, 0xffdc83).setVisible(false).setDepth(8);
  }

  showOption(direction, callback) {
    // Push from the entry side, across the defender, toward the indicated direction.
    const edge = Math.min(55, this.size * 0.393);
    const offsets = [[0, 0], [0, edge], [-edge, 0], [0, -edge], [edge, 0]];
    const vectors = [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]];
    const [dx, dy] = offsets[direction];
    const [vx, vy] = vectors[direction];
    const label = ["+", "↑", "→", "↓", "←"][direction];
    const button = this.scene.add.text(this.x + dx, this.y + dy, label, {
      fontFamily: "Arial", fontSize: "26px", fontStyle: "bold", color: "#122a30", backgroundColor: "#ffdc83",
      fixedWidth: 36, fixedHeight: 36, align: "center", padding: { top: 2 }
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
    button.direction = direction;
    const trail = this.scene.add.graphics().setDepth(9).setVisible(false);
    if (direction) {
      trail.lineStyle(3, 0xffdc83, 0.75);
      trail.lineBetween(this.x - vx * 30, this.y - vy * 30, this.x + vx * 40, this.y + vy * 40);
      trail.lineBetween(this.x + vx * 40, this.y + vy * 40, this.x + vx * 26 - vy * 9, this.y + vy * 26 + vx * 9);
      trail.lineBetween(this.x + vx * 40, this.y + vy * 40, this.x + vx * 26 + vy * 9, this.y + vy * 26 - vx * 9);
    }
    button.trail = trail;
    this.scene.tweens.add({
      targets: button, scaleX: 1.14, scaleY: 1.14, alpha: 0.78,
      x: button.x + vx * 4, y: button.y + vy * 4,
      duration: 560, ease: "Sine.InOut", yoyo: true, repeat: -1
    });
    button.on("pointerdown", callback);
    button.on("pointerover", () => { button.setStyle({ backgroundColor: "#ffffff" }); trail.setVisible(true); });
    button.on("pointerout", () => { button.setStyle({ backgroundColor: "#ffdc83" }); trail.setVisible(false); });
    if (!this.buttons.length) this.scene.tweens.add({ targets: this.highlight, alpha: 0.4, duration: 700, ease: "Sine.InOut", yoyo: true, repeat: -1 });
    this.buttons.push(button);
    this.highlight.setVisible(true);
  }

  clearOptions() {
    this.buttons.forEach(button => {
      this.scene.tweens.killTweensOf(button);
      button.trail.destroy();
      button.destroy();
    });
    this.buttons = [];
    this.highlight.setVisible(false);
    this.scene.tweens.killTweensOf(this.highlight);
    this.highlight.setAlpha(1);
  }
}
