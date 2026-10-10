// Inspired by the compact, wide, and asymmetric Joustus boards in Superpseudo's guide:
// https://steamcommunity.com/sharedfiles/filedetails/?id=1948618923
// Our terrain and layouts are adaptations; no external art is used.
// # dirt, g grass/graveyard, p playable picnic.
function board(id, title, rows, gemCount) {
  const terrain = { "#": { type: "dirt", playable: 0 }, g: { type: "grass", playable: 1 }, p: { type: "picnic", playable: 2 } };
  return { id, title, gemCount, map: rows.map(row => [...row].map(cell => ({ ...terrain[cell] }))) };
}

// Nine playable squares, three gems. Rim changes determine which push lanes
// have a grass exit and which end at a dirt wall.
function arena(id, title, north, south, west, east) {
  return board(id, title, [north, ...[0, 1, 2].map(row => `${west[row]}ppp${east[row]}`), south], 3);
}

export const TILE_MAP = [
  board("classic", "Classic Picnic", ["#gg#", "gppg", "gppg", "#gg#"], 1),
  board("corner", "Corner Duel", ["#gg#", "gppg", "gpg#", "#gg#"], 1),
  board("courtyard", "Grand Courtyard", ["#ggg#", "gpppg", "gpppg", "gpppg", "#ggg#"], 3),
  board("gallery", "Long Gallery", ["#ggg#", "gpppg", "gpppg", "#ggg#"], 2),
  board("tower", "Tower Table", ["#gg#", "gppg", "gppg", "gppg", "#gg#"], 2),
  board("crossroads", "Crossroads", ["#ggg#", "ggpgg", "gpppg", "ggpgg", "#ggg#"], 2),
  board("alcove", "Hidden Alcove", ["#ggg#", "gpppg", "gpp#g", "gpppg", "#ggg#"], 3),
  board("staircase", "Staircase", ["#ggg#", "gppgg", "gpppg", "ggppg", "#ggg#"], 2),
  arena("east-gate", "East Gate", "#g#g#", "#g#g#", "###", "ggg"),
  arena("west-gate", "West Gate", "#g#g#", "#g#g#", "ggg", "###"),
  arena("north-wind", "North Wind", "#ggg#", "#####", "g#g", "g#g"),
  arena("south-wind", "South Wind", "#####", "#ggg#", "g#g", "g#g"),
  arena("riverbanks", "Riverbanks", "#####", "#####", "ggg", "ggg"),
  arena("longitudinal", "North–South Passage", "#ggg#", "#ggg#", "###", "###"),
  arena("corner-gates", "Corner Gates", "##gg#", "#gg##", "g##", "##g"),
  arena("four-gates", "Four Gates", "##g##", "##g##", "#g#", "#g#"),
  arena("eight-gates", "Eight Gates", "#g#g#", "#g#g#", "g#g", "g#g"),
  arena("northwest-keep", "Northwest Keep", "#####", "#ggg#", "###", "ggg"),
  arena("southeast-keep", "Southeast Keep", "#ggg#", "#####", "ggg", "###"),
  arena("side-doors", "Side Doors", "#ggg#", "#ggg#", "#g#", "#g#")
];
