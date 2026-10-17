# PERIHELION — Orbit Dodger

A one-button orbit dodger built with three.js for [start.ng](https://start.ng). Tap to switch between the inner and outer orbit, graze debris to build your multiplier, survive.

## Develop

```sh
npm install
npm run dev
```

## Build

start.ng serves the committed `dist/` folder and never runs a build, so rebuild and commit `dist/` before pushing:

```sh
npm run build
```

All tunable numbers live in `src/config.js`.
