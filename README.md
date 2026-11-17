# Lumenkeeper — Best Game (make.fun best-game-01)

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/reronalendra/Best-Game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/reronalendra/Best-Game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Lumenkeeper is an original arena shooter for the make.fun Best Game bounty: you are the keeper of the last lantern in the Glimmerdeep, holding back the Gloom across 8 waves.

## Run it

Play it live at https://reronalendra.github.io/Best-Game/game/ — or open `game/index.html` in a desktop browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=2s61jrxf&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## How to play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and
open http://localhost:8080). No build step, no network requests.

- **WASD / arrows** — move
- **Mouse** — aim · **Click / Space** — shoot light bolts
- **Shift** — dash (briefly invulnerable)
- **E** — Nova, when the lantern meter is full (12 embers)
- **P** — pause · **M** — mute

Between waves you pick 1 of 3 upgrades (click a card or press 1–3):
Rapid Lantern, Twin Flame, Swift Boots, Thick Wick, Ember Magnet,
Glimmer Dash, Piercing Light, Bright Nova, Lumen Intensity, Combo Keeper.

Four kinds of shadow hunt you: **Motes** chase, **Wisps** shoot from a
distance, **Brutes** hit hard, and the **Gloom Warden** (wave 8) fights
in phases — chase, spiral radial barrage, summon darkness — and **enrages
below half health**: faster, denser rings, more summons, and the arena
darkens. Kills chain a combo multiplier; embers dropped by shadows fill
your lantern.

## Polish (what makes it feel professional)

- **Combo-linked Light Level** — the higher the combo, the wider the
  lantern's light radius and the harder your bolts hit; taking a hit
  halves the combo and the arena dims. The radius lerps smoothly.
- **Game feel** — tiered screen shake (shoot < hit < Nova / boss death),
  freeze frames on Brute and boss kills, hit-flash on damaged foes,
  dash afterimage trail, and light sparks that fly home to the keeper
  on every kill.
- **Code** — waves from a `WAVE_CONFIG` table, a combo system, a
  pick-1-of-3 upgrade shop, dash I-frames, a boss state machine, an
  object pool for particles and bullets, a spatial-hash grid for
  collisions (squared distances, no `sqrt` in the hot loop), and
  offscreen-canvas lighting (`destination-out`) with no WebGL shader.
- **Art** — real transparent PNG sprites under `game/assets/`
  (keeper, mote, wisp, brute, warden, ember, floor tile, heart for
  lives, and one icon per upgrade/skill), generated in this repo by
  `tools/generate_assets.py` in one shared dark-bioluminescent palette.
  Transparency is verified from the PNG alpha channel; the renderer
  falls back to drawn shapes if a sprite has not loaded yet.
- **Sound** — synthesised WebAudio effects plus a procedural dark
  ambient music loop (slow pad + soft arpeggio, no audio files, no
  network). Music starts when the game starts, loops seamlessly, and
  is muted with **M** or the ♪ button in the HUD; if WebAudio is
  unavailable the game plays on silently.

## Credits

Lumenkeeper — a Lumenkeeper Team game. Design, code, art and sound by
the team; game-feel and systems brainstormed with Gemini (Argon model)
and implemented in our own code in this session.

## Layout

- `game/` — the playable game, plain static files (`index.html` + ES modules in `src/` + transparent PNGs in `assets/`)
- `screenshots/` — 4 real renders: play (cover), title, boss fight, victory
- `main.ts` — the make.fun entry program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `shots.json` — how each screenshot was staged (`?shot=…&seed=1`)

## License

MIT — see `LICENSE`.
