# History Heroes: Picnic Wrestle

A local two-player card game made for the BYUI Hackathon 2025. Players place historical heroes on a picnic table and push opponents to claim gems. The player holding the most gems wins when the picnic fills or either player has no legal moves; equal scores draw.

## Run

With Node 18+ installed, run `npm start` from this folder and open http://localhost:8080. The Node server serves both the game and online rooms; no dependencies need installing. `PORT` changes the port and `HOST` changes the listen address (default: all interfaces). Phaser 3.90.0 loads from jsDelivr, so an internet connection is needed on first load. A plain static server supports local play only.

## Play

- Click a hero in the active player's hand. Gold + buttons place; gold arrows push.
- Move arrows sit on the entry edge: a right move arrow on the left pushes across the card to the right. Printed card arrows stay on the edge matching their direction. Controls pulse, and hovering reveals the push path.
- Player 1 is blue and Player 2 is red. Push animations approach from the entry edge and drive along the push direction; placements hover above their target and drop down with a shadow.
- Change cards freely before committing a move. Click the same card again or press Esc to cancel.
- Place only on an empty picnic tile; gems must be reached by pushing.
- A push must beat the opposite arrow on every defender in its chain. Equal arrows block; double arrows beat single arrows.
- Cards can be pushed onto grass, but never onto dirt or off the board. Grass cards become grey, immovable blockers and still occupy their squares.
- Each move consumes one hand card, draws one replacement if available, and switches turns once.
- A match ends immediately when all picnic tiles fill or either player's entire hand has no legal moves. There is no passing. The most gems wins; an equal count draws. Being blocked does not automatically mean losing.
- New match and Play again reset the match without reloading assets. Sound can be muted independently.
- Twenty maps have one to three gems. Thirteen have a 3×3 playable picnic area with three gems; their grass exits and dirt walls create different push lanes. The remaining maps offer compact, wide, and asymmetric layouts inspired by [Superpseudo's Joustus guide](https://steamcommunity.com/sharedfiles/filedetails/?id=1948618923). Each new match, first visit, or refresh chooses a map; stored preferences avoid repeating the previous map. Claimed gems remain visible above their holders.
- Debug map lets you choose a specific board or return to Random map. The choice persists on refresh and is also used when creating an online room. It cannot change an ongoing online match.
- Build decks opens a searchable picker for each player's 16 unique heroes. Both players may choose the same hero. Save decks & play stores both lists locally and starts a new match; saved choices persist across reloads. Unsaved edits are discarded on cancellation.

## Verification

`npm test` (Node 18+) runs the rule regression tests, including 100 seeded matches on each of the twenty maps (2,000 total). No npm dependencies are needed for the game or rule tests.

For browser regression checks, install Playwright separately and run `node tests/browser-check.mjs` while the server is running. `PLAYWRIGHT_MODULE_PATH` can point to an existing Playwright installation; `BROWSER_CHANNEL=msedge` or `chrome` uses an installed browser. `GAME_URL` overrides the server URL, and `GAME_SCREENSHOT` saves an optional screenshot.

The browser check covers changing selections before moving, discarded callbacks, repeated clicks, input locked through animations, arrow placement and pulse cleanup, wrong-player input, cancellation, a complete match, replay, and input after resizing.

`game/rules.js` owns match state and validates actions before applying them. Each action carries a revision so old or duplicate actions are rejected. The scene separately invalidates callbacks when selection changes and locks input during move animations. Rendering never determines turns or card ownership.

The current library contains regular arrow cards. Reserved bomb (direction strength 3) and capture (fifth push digit 1) behavior is covered by rule tests but is not added to the deck.

## Online two-player mode

1. Both players open the game at the same server URL. Use the server machine's LAN address for another device on your network, or host the Node server at a reachable HTTPS URL for internet players. A localhost invite works only on the same computer.
2. Player 1 selects a debug map or Random map, then clicks Create online room. Share the six-character code or invite link.
3. Player 2 enters the code and clicks Join room. The creator is Blue; the joiner is Red. Saved Blue and Red decks respectively are submitted from each player's browser; without a saved deck the server generates one.
4. Each player controls only their own hand. Both hands are public; future draws stay on the server. Moves and animations synchronize from accepted server actions. Play pauses while either player is disconnected; refresh restores that tab's seat.
5. At the end, both players must request a rematch to start another. Leave room closes the room for both players and returns to local play.

Rooms are held in server memory and disappear when the server restarts. Idle rooms with no connections expire after two hours. Deployments need to support streaming HTTP/SSE and keep requests for a room on the same server process. See [online design](docs/online-design.md).

## Balanced matchmaking

Choose My Blue deck or My Red deck and click **Find balanced match**. The server locks that saved deck for the search, or generates a random deck if none is saved. Both players must use the same server. Cancel search exits the queue; refreshing resumes an active search or match.

The queue compares player rating and estimated deck strength separately. Deck strength uses arrow force, directional coverage, and balance. Older eligible searches get priority, with the closest available opponent chosen. Waiting gradually widens the acceptable gaps, but hard limits remain: at most 350 rating points, 22 deck-strength points, and an estimated win probability between 25% and 75%. These estimates are a starting heuristic, not a calibrated prediction. A small player population may require waiting; the queue never fills a seat with a bot.

New players start at 1000 with a provisional rating for ten games and receive faster rating adjustments. The queue prefers similarly experienced players. Wins, draws, and losses adjust the server-owned rating, accounting for estimated deck advantage. Ranked opponents cannot be matched again for ten minutes; private-room matches and mutually requested rematches are practice and do not affect ratings. Ranked seats are randomized and maps always have nine playable squares and three gems.

Once both players connect, leaving a ranked match forfeits it. A disconnected player gets 90 seconds to reconnect before the connected opponent wins. Matches where both players never arrive expire after one minute without affecting ratings. Queue entries expire after 30 seconds without a heartbeat.

Guest credentials stay in browser localStorage; ratings and results persist on the server in `.data/profiles.json`, excluded from Git and public file serving. This is guest identity, not account authentication: clearing browser storage can create a fresh profile. Server restarts preserve profiles but end active rooms and queues. Back up `.data` when deploying; use one server process for this MVP.

Run `node tests/online-browser.mjs` with Playwright against the running server to test two independent browser sessions, reconnect, synchronized play, full matches, rematches, and room exit. `npm test` also runs native HTTP tests of room authorization, stale/duplicate moves, disconnection, hidden draw piles, and replay protection.

Run `node tests/matchmaking-browser.mjs` to verify immediate cancellation, queue refresh, matched seats, locked decks, synchronized play, reconnect, forfeit, and persistent results. `npm test` also covers match fairness limits, waiting windows, repeat opponents, rating calculations, durable profiles, and ranked result recording.
