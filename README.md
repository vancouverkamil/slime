# Slime Volleyball

A browser-based slime volleyball game playable in one or two player mode.

## How to Play

Open `slime_volleyball.html` in a browser, or visit the hosted version via GitHub Pages.

### Controls

**Player 1 (left slime)**
- Move: `A` / `D`
- Jump: `W`

**Player 2 (right slime)**
- Move: `←` / `→`
- Jump: `↑`

**Space** — advance through menus / rematch

## Game Modes

- **One Player** — face three AI opponents (Pathetic White Slime, Angry Red Slime, Slime Master)
- **Two Player** — local multiplayer on the same keyboard

## Deployment

The recommended production setup is Vercel for the static frontend, Supabase `slimetime` Postgres for durable account/game data, and a persistent Node WebSocket host for online matches. See `DEPLOYMENT.md`.

## Mobile App

The game ships as a native iOS/Android app via [Capacitor](https://capacitorjs.com), wrapping the same frontend files (no rewrite) with touch controls swapped in for the keyboard.

- **Controls**: MapleStory M–style overlay — left/right pad + a JUMP button, bottom corners of the screen. It only appears on touch devices, only while a canvas-rendered mode (match/tournament/replay/slimeverse) is showing, and always drives player 1's keys (`A`/`D`/`W`), which is what "my slime" reads in CPU/online/tournament modes.
- **Backend**: the packaged app bundles static assets only (see `scripts/build-mobile-www.js`) and talks to the same production WebSocket/API host as the web build (`slime-config.js`). It needs a network connection; there's no offline mode.
- **Build**:
  ```powershell
  npm run mobile:sync      # rebuild www/ and copy into the native project
  npx cap open android     # opens Android Studio to run/build
  ```
  iOS (`npx cap add ios`) requires a Mac with Xcode; it hasn't been added on this Windows machine.
- Before publishing, change the placeholder `appId` in `capacitor.config.json` (`com.slimevolleyball.app`) to match your Apple/Google developer account's bundle ID.

## Local Development

```powershell
npm start
npm test
npm run check
```

The local Express server hosts the frontend, account API, and realtime WebSocket rooms at `http://localhost:3000`.

`npm run check` enforces the project architecture: every first-party HTML, CSS, and JavaScript source file must remain at or below 200 lines, and every JavaScript component is syntax-checked.

Run `npm run supabase:bundle` after frontend changes when preparing the ignored Supabase Edge Function asset bundle.

## Files

| File | Purpose |
|---|---|
| `slime_volleyball.html` | Main game (HTML + embedded JS) |
| `Input.js` | Keyboard input handling |
| `SlimeAI.js` | AI opponent logic |
| `js/tournament-mode.js` | Solo and online tournament bracket flow |
| `js/inventory-ui.js` | Inventory modal rendering and keyboard behavior |
| `js/slimeverse.js` | Slimeverse world and hat-shop interior |
| `css/slime.css` | Shared game, modal, and responsive layout styling |
| `vball.png` | Volleyball sprite |
| `slime175green.png` / `slime175red.png` | Slime sprites |
| `sky2.jpg` / `cave.jpg` / `sunset.jpg` | Background images |

## Credits

Originally written by Quin Pendragon and Daniel Wedge (oneslime.net). Rewritten by Jonathan Marler.
