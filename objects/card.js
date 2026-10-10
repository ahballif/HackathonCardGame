export default class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, cardData, onClick, size = 100) {
    super(scene, x, y);
    this.cardData = cardData;
    this.owner = cardData.owner;
    this.arrows = [];
    this.frame = scene.add.rectangle(0, 0, size + 8, size + 8, 0x152a30).setStrokeStyle(3, this.owner === 0 ? 0x7abfff : 0xff9979);
    this.add(this.frame);
    this.cardImage = scene.add.image(0, 0, cardData.name).setDisplaySize(size - 6, size - 6);
    this.add(this.cardImage);
    const positions = [[0, -size / 2 + 4], [size / 2 - 4, 0], [0, size / 2 - 4], [-size / 2 + 4, 0]];
    ["up", "right", "down", "left"].forEach((direction, i) => {
      const force = Number(cardData.push[i]);
      if (!force) return;
      const [ax, ay] = positions[i];
      this.add(scene.add.circle(ax, ay, 13, 0x102229, 0.95));
      const arrow = scene.add.image(ax, ay, `arrow_${direction}${force === 2 ? "_double" : ""}`).setDisplaySize(22, 22);
      arrow.direction = direction;
      arrow.baseScale = { x: arrow.scaleX, y: arrow.scaleY };
      this.arrows.push(arrow);
      this.add(arrow);
    });
    if (onClick) {
      this.cardImage.setInteractive({ useHandCursor: true }).on("pointerdown", onClick);
      this.cardImage.on("pointerover", () => { if (!scene.resolving && !this.selected) this.animateLift(1.04, -2); });
      this.cardImage.on("pointerout", () => { if (!scene.resolving) this.animateLift(this.selected ? 1.08 : 1, 0); });
    }
    scene.add.existing(this);
  }

  setSelected(selected) {
    this.selected = selected;
    this.frame.setStrokeStyle(selected ? 4 : 3, selected ? 0xffdc83 : this.owner === 0 ? 0x7abfff : 0xff9979);
    this.animateLift(selected ? 1.08 : 1, 0);
    return this;
  }

  animateLift(scale, angle) {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scaleX: scale, scaleY: scale, angle, duration: 170, ease: "Back.Out" });
  }

  setOutOfPlay(inactive) {
    this.outOfPlay = inactive;
    if (inactive) this.cardImage.setTint(0x969b9e);
    else this.cardImage.clearTint();
    this.frame.setStrokeStyle(3, inactive ? 0x929b9e : this.owner === 0 ? 0x7abfff : 0xff9979);
    this.arrows.forEach(arrow => inactive ? arrow.setTint(0x969b9e) : arrow.clearTint());
    this.setAlpha(inactive ? 0.68 : 1);
    return this;
  }

  setArrowsActive(active) {
    this.arrows.forEach(arrow => {
      this.scene.tweens.killTweensOf(arrow);
      arrow.setScale(arrow.baseScale.x, arrow.baseScale.y).setAlpha(1);
      if (active) this.scene.tweens.add({ targets: arrow, scaleX: arrow.baseScale.x * 1.16,
        scaleY: arrow.baseScale.y * 1.16, alpha: 0.7, duration: 620, ease: "Sine.InOut", yoyo: true, repeat: -1 });
    });
    return this;
  }

  destroy(fromScene) {
    if (this.scene) {
      this.scene.tweens.killTweensOf(this);
      this.arrows.forEach(arrow => this.scene.tweens.killTweensOf(arrow));
    }
    super.destroy(fromScene);
  }
}
