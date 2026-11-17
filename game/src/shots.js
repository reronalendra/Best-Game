// The screenshot scenes behind ?shot=start|play|boss|win. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (keep a little distance, aim at the nearest shadow,
// dash out of trouble, spend a full lantern), so the frame is what a real
// game looks like and the same seed always gives the same frame. The win
// scene stages the victory panel over a cleared final wave.

import { FIELD, STEP } from './config.js';
import { EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const PLAY_SECONDS = 6;
const BOSS_SECONDS = 14;

/** Nearest live foe, or null. */
function nearest(state) {
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    if (!e.active) continue;
    const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function autopilot(state) {
  const foe = nearest(state);
  const p = state.player;
  if (!foe) return { move: { x: 0, y: 0 }, aim: { x: p.x, y: p.y - 100 }, firing: false, dash: false, nova: false };
  const dx = foe.x - p.x;
  const dy = foe.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  // Too close: back away. Otherwise close to about 200 away.
  const want = d < 140 ? -1 : d > 260 ? 1 : 0;
  const move = { x: (dx / d) * want, y: (dy / d) * want };
  return {
    move,
    aim: { x: foe.x, y: foe.y },
    firing: true,
    dash: d < 90,
    nova: state.novaReady,
  };
}

function run(world, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const a = autopilot(world.state);
    const events = world.step(STEP, a.move, a.aim, a.firing, a.dash, a.nova);
    // The autopilot is allowed to be lucky, not dead: a staged shot keeps
    // the keeper alive so the scene shows a fight, not a game over.
    if (world.state.player.hp <= 0) break;
    if (events & EVENT_WIN) break;
    if (events & EVENT_WAVE_CLEAR) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Stage a mid-fight frame directly: the keeper centre-right, six
    // shadows closing in, bolts in the air and embers on the ground.
    // A short real run first earns the score and combo the HUD shows.
    world.startWave(3);
    run(world, PLAY_SECONDS);
    const s = world.state;
    const px = 820;
    const py = 380;
    s.player.x = px; s.player.y = py; s.player.aim = -Math.PI * 0.75;
    s.player.embers = 5;
    s.score = 560; s.combo = 7; s.comboTimer = 2; s.comboMult = 1.2;
    s.lightRadius = 260; s.lightTarget = 260;
    world.spawnAt('mote', px - 260, py - 150);
    world.spawnAt('mote', px + 240, py - 180);
    world.spawnAt('wisp', px - 300, py + 130);
    world.spawnAt('mote', px + 280, py + 160);
    world.spawnAt('brute', px - 60, py - 270);
    world.spawnAt('mote', px - 170, py + 250);
    const b1 = s.bullets[0]; b1.active = true; b1.x = px - 120; b1.y = py - 80; b1.vx = -440; b1.vy = -440; b1.damage = 1; b1.pierce = 0;
    const b2 = s.bullets[1]; b2.active = true; b2.x = px - 60; b2.y = py + 40; b2.vx = -620; b2.vy = 0; b2.damage = 1; b2.pierce = 0;
    for (let i = 0; i < 4; i += 1) {
      const em = s.embers[i];
      em.active = true; em.x = px - 200 + i * 60; em.y = py + 60; em.vx = 0; em.vy = 0;
    }
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  if (name === 'boss') {
    // Stage the boss fight directly: the Warden mid-arena with its health
    // bar, a few motes around it, the keeper below at 3 hearts, bolts and
    // embers in the air — the real renderer over a real world state.
    world.startWave(8);
    for (let i = 0; i < 60; i += 1) world.step(STEP, { x: 0, y: 0 }, { x: 640, y: 100 }, false, false, false);
    const s = world.state;
    s.score = 3200;
    s.player.x = 640; s.player.y = 520; s.player.hp = 3;
    s.player.embers = 7;
    let warden = null;
    let placed = 0;
    for (const e of s.enemies) {
      if (!e.active) continue;
      // Boss below half health, so the shot shows the enraged phase.
      if (e.kind === 'warden') { warden = e; e.x = 640; e.y = 210; e.hp = 28; e.enraged = true; s.bossEnraged = true; }
      else if (placed < 4) { e.x = 380 + placed * 170; e.y = 300 + (placed % 2) * 90; placed += 1; }
      else e.active = false;
    }
    if (!warden) {
      world.reset();
      world.startWave(8);
      return stageShot('boss', world);
    }
    // A few bolts flying and embers on the ground, as a real fight has.
    for (const b of s.bullets) b.active = false;
    const b1 = s.bullets[0]; b1.active = true; b1.x = 640; b1.y = 420; b1.vx = 0; b1.vy = -620; b1.damage = 1; b1.pierce = 0;
    const b2 = s.bullets[1]; b2.active = true; b2.x = 600; b2.y = 400; b2.vx = -60; b2.vy = -620; b2.damage = 1; b2.pierce = 0;
    for (let i = 0; i < 5; i += 1) {
      const em = s.embers[i];
      em.active = true; em.x = 480 + i * 70; em.y = 430; em.vx = 0; em.vy = 0;
    }
    return { screen: SCREEN_PLAY, best: 3400 };
  }
  if (name === 'win') {
    world.startWave(8);
    world.state.score = 4850;
    world.state.kills = 96;
    world.state.wave = 8;
    for (const e of world.state.enemies) e.active = false;
    world.state.spawnQueue = [];
    world.state.waveActive = false;
    return { screen: SCREEN_WIN, best: 4850 };
  }
  // start: a quiet field with a few shadows drifting in, under the title.
  // The keeper is untouchable here, so the shadows only drift, never end it.
  world.startWave(1);
  world.state.player.invulnerable = 999;
  for (let i = 0; i < 180; i += 1) {
    world.step(STEP, { x: 0, y: 0 }, { x: 640, y: 100 }, false, false, false);
    world.state.player.invulnerable = 999;
    world.state.player.hp = 5;
  }
  return { screen: SCREEN_TITLE, best: 1250 };
}
