# Architecture and wiring rules

The folder layout is in the README. This file covers **how the pieces connect**, and the rules that keep leftovers from one screen, game or mode out of the next. Each rule exists because breaking it caused a real bug. The tests named here enforce them.

## Client

### 1. One scene owns the screen (`js/core/screen.js`)
`claimScreen(name, release)` returns a **scene**. The scene owns what the screen runs:

```js
var scene = claimScreen('online-match');
onlineInputInterval = scene.interval(sendInput, 20);   // not setInterval
scene.listen(document, 'keydown', onKey);              // not addEventListener
scene.onExit(function() { hidePregameOverlay(); });    // overlays you created
```

Claiming the screen again disposes the previous scene. Its timers and listeners are cancelled and its `onExit` cleanup runs, even if the new scene has the same name. So:
- A mode never runs on top of another mode. This used to happen with the Slimeverse and a tournament match.
- Callbacks from a finished scene are no-ops. The old bug: game 1's replay "press any key" overlay covered game 2's rock-paper-scissors buttons, and its callback ended game 2.

An `onExit` or `release` only stops that scene's own work. It never navigates or changes shared page chrome, because the new scene is already setting that up.

*Tests:* `tests/scene-lifecycle.test.js`.

### 2. Server messages go through the router (`js/online/message-router.js`)
Each section registers handlers for the messages it owns, in its own folder:

```js
onServerMessage('tournament_match_ready', function(msg) { showTournamentAccept(msg); });
```

- **Lobby:** `js/online/server-messages.js`
- **Match:** `js/online/match-messages.js`
- **Ranked:** `js/online/ranked-queue.js`
- **Tournament:** `js/tournament/messages.js`

The router works like this:
- It dispatches each message to exactly one handler and ignores unknown types.
- A handler that throws is logged, and the other handlers keep working.
- It drops messages stamped with a different `gameId` than the game on screen. For example, a late message from game 1 of a series can't reach game 2.

*Tests:* `tests/message-contract.test.js` checks that every message type the server sends has one client handler, and every type the client sends has a server handler.

### 3. Settle results immediately, show them later
When a game ends, `recordOnlineGameResult()` updates stats and flags at once. The replay and the result screen only display. If the next tournament game starts during the replay, nothing from the previous game is left half-finished.

## Server

### 4. Every game is its own object (`server/rooms/game-lifetime.js`)
Rooms are reused, games are not. `startRoomGame` creates a game with an id, and everything the game schedules goes through it:

```js
game.every(TICK_MS, tick);                         // the tick loop
game.later(700, startNextPoint);                   // point pause, RPS, countdown, reconnect grace
game.listen(ws, 'close', () => handleDisconnect(side));
```

- `game.dispose()` runs when the game ends, is abandoned, or a player leaves. It cancels every timer and removes every socket listener.
- Callbacks check `game.isCurrent()`, so nothing from an old game can touch the next game in the same room.
- Every message a game broadcasts carries its `gameId`.

*Tests:* `tests/tournament-series.test.js` plays a full best-of-3. It checks that no timers or listeners are left after each game and that an old game's input handler is inert.

### 5. Server message table and no silent errors (`server/core/connection.js`)
- **One table:** client messages dispatch through `HANDLERS`, one entry per type.
- **Game input:** while a game is running, input goes to the game. Leaving and pings (`OUT_OF_GAME_MESSAGES`) always reach the table, so leaving mid-match is honored.
- **No silent catch:** handler errors are logged with context (type, user, state, room), and the client gets a `server_error` message. `unhandledRejection` is logged too.
- **Room-scoped leave:** a `leave_room` that names a room only applies to that room. A late "stop spectating" can't pull a player out of the match they were just moved into.

### 6. Tournament status only moves along allowed paths (`server/tournament/match-status.js`)
```
waiting → upcoming → awaiting ⇄ live → final        upcoming → bot_live → final
```
`setMatchStatus()` is the only way to change a match's status. It blocks and logs illegal moves: a final series can't reopen, and a game can't skip its accept check.

Series state (wins, status, accepts) lives on the bracket match. Per-game state lives on the room's game object and is thrown away after each game.

### 7. One activity per player
- The Slimeverse has its own socket and identity (`server/slimeverse/`). It never appears in rooms, queues or tournaments.
- Joining a room or starting a tournament match removes the player from the ranked queue.
- The ranked queue refuses players who are mid-match and never matches a player against themselves.

Matches are recorded with their mode (`quickplay`, `ranked`, `tournament`). Only ranked matches move ranked rating.

*Tests:* `tests/match-modes.test.js`.

### 8. Friends and private messages (`server/social/`, `js/social/`)
- **Rules live in one place.** `server/social/service.js` decides everything:
  - only friends can message each other;
  - blocking ends the friendship and stops both requests and messages;
  - asking someone who already asked you accepts straight away;
  - messages are capped at 500 characters, and a conversation keeps its newest 200.
- **Storage has no rules.** The storage files are `stores/file-social.js` and `stores/postgres-social.js`, and their tables are `social_edges` and `direct_messages`.
- **Actions use REST** under `/api/social`. Players must be signed in, requests are rate limited, and rule errors come back as readable messages.
- **Live updates** go to every socket the player has open, as `dm` and `social_update`.
- **The inbox is an overlay**, not a scene, so it never interrupts a match.

*Tests:* `tests/social.test.js`. The same flows were also run against real Postgres (PGlite) before shipping.

### 9. Security basics
- **Public files are listed explicitly.** Railway serves only the page, `js/`, `css/`, the config scripts and images. `.vercelignore` keeps server code, tests and docs off Vercel.
- **Cookie-only authentication** is refused for cross-site requests that change data (request-forgery protection). The client sends its session token in the request body.
- **Rate limits** apply to login failures, sign-ups, customize and messages. WebSocket messages are capped at 256 KB, and malformed messages are ignored. *Tests:* `tests/server-wiring.test.js`.
- **Player text** is always inserted with `escHtml()`, and values inside `onclick` attributes are built with `jsStr()`.

### 10. Install order is checked (`server/index.js`)
A module may only destructure `ctx` names that an earlier module in `MODULES` defined. Anything defined later must be read as `ctx.name` at call time.

*Tests:* `tests/server-wiring.test.js` fails on any violation.

## Adding something new, in short
- **New screen or mode:** `claimScreen()`, then register everything it runs on the scene.
- **New server message:** add it to `HANDLERS` (client → server) or register it with `onServerMessage` (server → client). The contract test tells you if you forgot one side.
- **New per-game timer:** `game.later` or `game.every`, never a bare `setTimeout`.
- **New tournament state:** add it to `TRANSITIONS` first.

## Sources
The patterns follow these references:
- Scene enter/exit with owned resources: [Phaser scene shutdown](https://newdocs.phaser.io/docs/3.55.2/Phaser.Scenes.Events.SHUTDOWN)
- Per-match rooms disposed with their timers: [Colyseus room lifecycle](https://docs.colyseus.io/room/lifecycle), [Nakama authoritative matches](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/)
- Explicit state transitions: [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html)
- Server-authoritative client as a "privileged spectator": [Gambetta, client-server architecture](https://www.gabrielgambetta.com/client-server-game-architecture.html)
