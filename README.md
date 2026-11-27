# Gobble Run — The Great Turkey Escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/Omega4T/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/Omega4T/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Thanksgiving is coming, and so is the farmer. **Gobble Run** is a 2D canvas
runner: a turkey sprints 1500 metres from the farmyard, through the barn, to
the kitchen — jumping hay bales and fences, sliding under pitchforks and
hanging pots, sidestepping falling carving knives, and grabbing corn, pie and
golden feathers on the way. Hit an obstacle and the farmer closes in; three
hits and dinner is served. Make it the whole way and the turkey escapes.

## How it plays

- **SPACE / ↑ / W** — jump (twice, mid-air). **↓ / S** — slide under the
  hanging dangers. **← / → / A / D** — dodge sideways. **P / Esc** — pause.
  Mouse click works too: click to jump, start and restart.
- **The farmer** chases from behind: the gap meter (bottom-left) shows how
  close he is. Clean running opens the gap back up; every hit costs a life
  and 90 px of gap. Gap hits zero and you are caught.
- **Three stages** — The Farmyard (hay, fences), The Barn (crates,
  pitchforks), The Kitchen (ovens, pots, knife rain). Speed and spawn rate
  grow with distance.
- **Score** — distance in metres, corn +10, pie +25, golden feather +50,
  close call +5. Best score is kept in the browser.
- **Sound** — synthesised in code (WebAudio, no audio files): gobbles,
  pickup chimes, hit thuds, a warning when the farmer closes in, a sting
  when caught and a fanfare when escaped.

## Run it

```sh
node serve.ts            # game/ on http://localhost:8080
# or open game/index.html through any static server
```

No build step, no network request: every file the game loads is under
`game/`. The screenshots under `screenshots/` are real renders of the
game's own code (`?shot=title|run|kitchen|escaped&seed=7`), taken with
`shot-runner.mjs`. `playtest.mjs` boots the live game headless and plays
it: start, jump, collect, get hit, get caught, restart.

## Layout

- `game/index.html` — the page, one canvas
- `game/src/config.js` — every tuning number, palette and stage
- `game/src/random.js` — seeded RNG (same seed, same run)
- `game/src/input.js` — keyboard + pointer, one-shot action flags
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/world.js` — physics, spawning, the farmer chase, scoring
- `game/src/render.js` — all the drawn art, HUD and screens
- `game/src/shots.js` — deterministic screenshot scenes + autopilot
- `game/src/main.js` — boot, the fixed-step loop, screens
- `main.ts` — the entry program: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## Links

- Competition: https://make.fun/bounty/turkey-run-game-01
- Referral: https://make.fun/r/xj0gsmms

## License

MIT — see [LICENSE](LICENSE).
