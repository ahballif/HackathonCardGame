class Grid {
  constructor(scene, size, tileSize) {
    this.scene = scene;
    this.size = size;
    this.tileSize = tileSize;
    this.cells = [];

    for (let y = 0; y < size; y++) {
      this.cells[y] = [];
      for (let x = 0; x < size; x++) {
        const tile = scene.add.rectangle(
          200 + x * tileSize,
          200 + y * tileSize,
          tileSize - 4,
          tileSize - 4,
          0x333333
        ).setStrokeStyle(2, 0xffffff)
         .setInteractive();

        tile.on('pointerdown', () => scene.handleTileClick(x, y));
        this.cells[y][x] = { tile, card: null };
      }
    }
  }

  canPlace(x, y) {
    return !this.cells[y][x].card;
  }

  placeCard(x, y, card) {
    this.cells[y][x].card = card;
  }

  tryPush(x, y, dir) {
    const offset = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }[dir];
    const nx = x + offset[0];
    const ny = y + offset[1];
    if (nx < 0 || ny < 0 || nx >= this.size || ny >= this.size) return;
    const target = this.cells[ny][nx];
    if (target.card) {
      const nnx = nx + offset[0];
      const nny = ny + offset[1];
      if (nnx < 0 || nny < 0 || nnx >= this.size || nny >= this.size) {
        target.card.destroy();
        target.card = null;
      } else if (!this.cells[nny][nnx].card) {
        const pushed = target.card;
        target.card = null;
        this.cells[nny][nnx].card = pushed;
        pushed.moveTo(this.cells[nny][nnx].tile.x, this.cells[nny][nnx].tile.y);
      }
    }
  }
}
