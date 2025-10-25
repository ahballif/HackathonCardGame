import MainScene from "./scenes/MainScene.js";

const config = {
  type: Phaser.AUTO,
  width: 1000,
  height: 800,
  backgroundColor: "#222222",
  parent: "game-container",
  scene: [MainScene]
};

new Phaser.Game(config);
