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

## Local Development

```powershell
npm start
npm test
npm run check
```

The local Express server hosts the frontend, account API, and realtime WebSocket rooms at `http://localhost:3000`.

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
