# PERIHELION — Orbit Dodger

A one-button orbit dodger built with three.js for [start.ng](https://start.ng). Tap, click or press Space to switch between the inner and outer orbit. Skim past debris to build a multiplier (up to ×8), grab lime core shards, and survive as long as you can.

Play: https://perihelion.start.ng

## Develop

```sh
npm install
npm run dev
```

In dev builds the game is on `window.__game` for poking at from the console.

## Build

start.ng serves the committed `dist/` folder and never runs a build, so rebuild and commit `dist/` before pushing:

```sh
npm run build
```

## Layout

- `src/config.js`: every tunable number (speeds, radii, spawn timing, juice, audio, post-processing)
- `src/Game.js`: state machine (`READY → PLAYING → DYING → GAMEOVER`), score, difficulty
- `src/systems/Spawner.js`: hand-authored patterns. Rock timing is planned in ship-travel angle, and blocks on opposite lanes always leave room for a switch, so one lane is always open
- `src/entities/`: ship, planet, debris (instanced rocks and comets), pickups
- `src/render/`: post-processing, ribbon trail, particles, starfield, orbit rings, shaders
- `src/systems/`: collision, juice (shake, hit-stop, slow-mo), synthesized audio
- `src/startng.js`, `public/startng.json`: start.ng player, profile card and leaderboard

## start.ng

- The player's start.ng card shows bottom-left, and the ship carries a small marking in their character's primary colour.
- Signed-in players' runs go to the leaderboard: score, best multiplier and time survived.
- `public/cover.png` is the game's card picture (16:10).
