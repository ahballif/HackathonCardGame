# Online two-player implementation

`server/server.js` serves the app and runs authoritative rooms using Node's built-in HTTP server. Clients post moves over HTTP and receive accepted states over Server-Sent Events. No third-party server dependencies are required.

Each room has a six-character invitation code and two independently generated seat credentials. The creator occupies Blue and the joiner Red. Credentials stay in each tab's sessionStorage so refreshing reconnects to the same seat. The server derives player identity from that credential and resolves chosen names against canonical card definitions.

The host calls `createGameMatch` once per match with the selected map, player decks, a fresh seed, and a server-issued match ID. It owns the complete state and calls `applyPlayerAction` for permitted move fields. JavaScript processes each rule commit synchronously; revision and match ID checks reject duplicate, stale, or previous-match requests.

Both hands are deliberately public in this game's online mode. Draw piles, their order, and the setup seed remain private on the server; snapshots contain null placeholders for remaining draw counts. Cards shared by both decks have separate instance IDs. All clients animate the same committed action; animation completion never grants authority to change the turn.

Clients receive a fresh snapshot on connection. A one-revision update animates; reconnect or skipped revisions render the latest state directly. Input is disabled while a move is pending, an animation resolves, the opponent is disconnected, or it is the other player's turn. The room remembers both seats across transient disconnects. Finishing occurs when the picnic fills or either player has no legal moves; gem totals determine the winner and equal totals draw.

Rematches require a vote from both seats after the match ends. A new match gets a fresh match ID and seed; the room's debug map and chosen decks remain in effect. Explicitly leaving closes the room for both participants. In-memory rooms disappear on server restart, and rooms with no connections expire after two hours.

Run one process per room's lifetime. For public hosting, use a reachable HTTPS URL and a proxy that supports unbuffered SSE; the server sends heartbeats and disables buffering. Multiple processes require a shared queue, profile store, and room routing. Account identity, durable room storage, and a hidden-hand variant are not implemented.

## Matchmaking and results

`server/matchmaking.js` contains pure deck estimates, pair selection, and rating updates. Each queued entry captures a validated canonical 16-card deck and its strength. Rating and deck strength must each be within both players' waiting windows; neither can cancel an extreme gap in the other. Predicted outcomes additionally include an eight-rating-point adjustment per deck-strength point. Initial limits are 100 rating points, eight strength points, and 35–65% estimated outcomes; they expand with waiting, capped at 350, 22, and 25–75%. These tunable heuristics need real match data before being treated as calibrated probabilities.

Pair selection considers the oldest eligible player first, then the closest eligible opponent, with a preference for players with similar early experience. A player cannot match themselves or an opponent played in the past ten minutes. Seats are random and ranked maps come from the 3×3, three-gem pool. Decks are immutable for the match. Private room codes remain a separate, unrated path.

`POST /api/profile` creates or authenticates a guest profile. Only the server owns rating, results, and opponent history. `server/profiles.js` serializes profile writes atomically to `.data/profiles.json` in the normal server entry point; tests can inject an in-memory store. Guest tokens persist in browser localStorage and are separate from room-seat credentials. Clearing browser storage resets identity, so accounts are required for stronger abuse prevention.

Authenticated `POST /api/matchmaking/join`, `/status`, and `/cancel` operate on one queue entry per profile. Clients poll every two seconds; a 30-second lease removes abandoned searches. Assignments survive polling and are removed when a seat connects. Refresh restores either the search or the seat. Unstarted assignments expire after one minute without a result. Queue and room capacity are each capped at 500.

After both seats connect, a ranked leave is a forfeit; a connection loss allows 90 seconds to return. Only an opponent still connected receives a timeout win. Game completion records once per match ID, including draws. Elo uses K=40 for the first ten games and K=24 thereafter, accounting for estimated deck advantage. A mutually agreed rematch switches the room to practice and cannot add ranked results. Results persist across server restarts, while queues and active rooms do not.
