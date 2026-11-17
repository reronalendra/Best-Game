// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, upgrade (between waves), paused, game over and victory.
//
// ?seed=N fixes the run. ?shot=start|play|boss|win (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, FIELD, FINAL_WAVE, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_KILL, EVENT_NOVA, EVENT_OVER, EVENT_PICKUP, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_NOVA, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createAssets } from './assets.js';
import { createParticles } from './particles.js';
import { MUTE_BUTTON, createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
/** Upgrade card geometry, kept in step with render.js's drawUpgrade. */
const CARD = { width: 300, height: 190, gap: 28, y: 240 };

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const particles = createParticles();
const assets = createAssets();
const renderer = createRenderer(canvas, particles, assets);
const audio = createAudio();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}

function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); }
  catch { /* Storage can be off: the best score then lasts this visit only. */ }
}

async function runShot(name) {
  const scene = stageShot(name, world);
  // Screenshots must show the real sprites, so wait for the PNG assets
  // (local files) before painting the frame.
  try { await assets.loadAll(); } catch { /* renderer falls back to shapes */ }
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, 1.2, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  assets.loadAll();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let time = 0;
  let pendingDash = false;
  let pendingNova = false;
  // Freeze frames (hitstop): a short real-time pause after big hits.
  let freezeLeft = 0;

  function announce(message) { status.textContent = message; }

  function startGame() {
    audio.unlock();
    audio.startMusic();
    world.reset();
    world.startWave(1);
    screen = SCREEN_PLAY;
    announce('Playing. Wave 1.');
    audio.wave();
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) { best = world.state.score; saveBest(best); }
    announce(won ? `Victory. Score ${world.state.score}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
    if (won) audio.win(); else audio.lose();
  }

  function upgradeCardAt(x, y) {
    const cards = world.state.upgrades;
    if (cards.length === 0) return -1;
    const total = cards.length * CARD.width + (cards.length - 1) * CARD.gap;
    const startX = (FIELD.width - total) / 2;
    for (let i = 0; i < cards.length; i += 1) {
      const cx = startX + i * (CARD.width + CARD.gap);
      if (x >= cx && x <= cx + CARD.width && y >= CARD.y && y <= CARD.y + CARD.height) return i;
    }
    return -1;
  }

  function pickUpgrade(index) {
    const cards = world.state.upgrades;
    if (index < 0 || index >= cards.length) return;
    const chosen = cards[index];
    world.applyUpgrade(chosen.id);
    audio.upgrade();
    const next = world.state.wave + 1;
    world.startWave(next);
    screen = SCREEN_PLAY;
    announce(`Wave ${next}.`);
    audio.wave();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.toggleMute();
    // On-screen mute button (HUD, every screen but the title): a click on
    // it toggles the music/effects and must not also start or shoot.
    if ((actions & ACTION_CONFIRM) && screen !== SCREEN_TITLE) {
      const a = input.aim;
      if (a.x >= MUTE_BUTTON.x && a.x <= MUTE_BUTTON.x + MUTE_BUTTON.w
        && a.y >= MUTE_BUTTON.y && a.y <= MUTE_BUTTON.y + MUTE_BUTTON.h) {
        audio.toggleMute();
        input.clearFiring();
        return;
      }
    }
    // Dash and nova are one-shot requests for the next simulation step.
    if (actions & ACTION_DASH) pendingDash = true;
    if (actions & ACTION_NOVA) pendingNova = true;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      const picked = input.takePick();
      if (picked >= 1 && picked <= 3) pickUpgrade(picked - 1);
      else if (actions & ACTION_CONFIRM) {
        const card = upgradeCardAt(input.aim.x, input.aim.y);
        if (card >= 0) pickUpgrade(card);
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
    }
  }

  function stepPlay() {
    const hpBefore = world.state.player.hp;
    const killsBefore = world.state.kills;
    const embersBefore = world.state.player.embers;
    const dash = pendingDash;
    const nova = pendingNova;
    pendingDash = false;
    pendingNova = false;
    const events = world.step(STEP, input.move(), input.aim, input.firing, dash, nova);
    // Dash trail: a fading afterimage while the dash is active.
    if (world.state.player.dashLeft > 0) {
      particles.trail(world.state.player.x, world.state.player.y, '#ffd166');
    }
    if (world.state.player.hp < hpBefore) audio.hurt();
    if (world.state.kills > killsBefore) {
      audio.kill();
      const kill = world.state.lastKill;
      if (kill) {
        particles.burst(kill.x, kill.y, kill.kind === 'warden' ? '#c084fc' : '#b388ff', 14, 180);
        // Light sparks fly home to the keeper on every kill.
        particles.seekBurst(kill.x, kill.y, world.state.player.x, world.state.player.y, '#ffe08a', 6);
        particles.popup(kill.x, kill.y, `+${world.state.combo > 1 ? 'combo ' : ''}${50}`);
        // Freeze frame on the big kills only: Brute and the Warden.
        if (kill.kind === 'brute' || kill.kind === 'warden') freezeLeft = 0.1;
      }
    }
    if (world.state.player.embers > embersBefore) audio.pickup();
    if (events & EVENT_NOVA) {
      audio.nova();
      freezeLeft = Math.max(freezeLeft, 0.05);
      particles.burst(world.state.player.x, world.state.player.y, '#fde68a', 40, 320);
    }
    if (events & EVENT_HIT && world.state.player.hp === hpBefore) { /* bolt hit a foe */ }
    if (events & EVENT_WAVE_CLEAR) {
      world.offerUpgrades();
      screen = SCREEN_UPGRADE;
      announce(`Wave ${world.state.wave} cleared. Choose an upgrade.`);
    } else if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const realDt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // During a freeze frame the world does not advance, but the frame is
    // still drawn, so the hit lands visually before time resumes.
    if (freezeLeft > 0) {
      freezeLeft -= realDt;
      particles.step(STEP);
      renderer.draw(world.state, screen, best, time, audio.muted);
      return;
    }
    accumulator += realDt;
    time += STEP;
    handleActions();
    if (screen === SCREEN_TITLE) {
      // The title's backdrop: shadows drift in, but the keeper cannot be
      // hurt and the lantern never goes out before the game starts.
      world.state.player.invulnerable = 1;
      world.step(STEP, { x: 0, y: 0 }, { x: 640, y: 100 }, false, false, false);
      world.state.player.hp = world.state.player.maxHp;
      world.state.player.invulnerable = 1;
      if (!world.state.waveActive && world.state.spawnQueue.length === 0) world.startWave(1);
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        stepPlay();
        accumulator -= STEP;
      }
      if (screen !== SCREEN_PLAY) accumulator = 0;
    } else {
      accumulator = 0;
    }
    particles.step(STEP);
    renderer.draw(world.state, screen, best, time, audio.muted);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Lumenkeeper. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
