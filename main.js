import MainScene from "./scenes/MainScene.js";
import { installDeckBuilder } from "./game/deck-builder.js";
import { TILE_MAP } from "./data/maps.js";
import { OnlineController } from "./game/online.js";

const mapPicker = document.getElementById('debug-map');
for (const map of TILE_MAP) {
  const option = document.createElement('option');
  option.value = map.id; option.textContent = `${map.title} · ${map.gemCount} gems`;
  mapPicker.append(option);
}
try { mapPicker.value = localStorage.getItem('history-heroes-debug-map') || ''; } catch { /* Random by default. */ }

const config = {
  type: Phaser.AUTO,
  width: 1100,
  height: 820,
  backgroundColor: "#12262b",
  parent: "game-container",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MainScene]
};

window.game = new Phaser.Game(config);
installDeckBuilder(CARD_LIBRARY, () => window.game.scene.getScene('MainScene').scene.restart());
window.online = new OnlineController(window.game, CARD_LIBRARY);
mapPicker.onchange = () => {
  try { localStorage.setItem('history-heroes-debug-map', mapPicker.value); } catch { /* Optional debug preference. */ }
  window.game.scene.getScene('MainScene').scene.restart({ mapId: mapPicker.value || undefined });
};
