// Lumenkeeper's rules and state, with no drawing and no browser in it: the
// keeper, light bolts, four kinds of shadow (mote, wisp, brute and the Gloom
// Warden), embers, the nova, dash, waves and upgrades. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react
// (sounds, screens) without the world knowing about them. Nothing here
// allocates after createWorld returns, except the small wave queue.

import { COMBO_WINDOW, ENEMY, FIELD, FINAL_WAVE, HASH_CELL, LIGHT, NOVA, PLAYER, POOL, UPGRADES, WAVE_CONFIG } from './config.js';
import { pickDistinct } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_KILL = 2;
export const EVENT_PICKUP = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;
export const EVENT_NOVA = 64;
export const EVENT_DASH = 128;

const KIND_MOTE = 'mote';
const KIND_WISP = 'wisp';
const KIND_BRUTE = 'brute';
const KIND_WARDEN = 'warden';

function dist2(ax, ay, bx, by) { const dx = ax - bx; const dy = ay - by; return dx * dx + dy * dy; }

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2, y: FIELD.height / 2, hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
    speed: PLAYER.speed, fireInterval: PLAYER.fireInterval, shots: 1, pierce: 0,
    dashCooldownMax: PLAYER.dashCooldown, dashCooldown: 0, dashLeft: 0, dashDir: { x: 1, y: 0 },
    invulnerable: 0, fireTimer: 0, aim: 0, novaNeeded: NOVA.embersNeeded, embers: 0,
    pickupRadius: PLAYER.pickupRadius,
    damageBonus: 0, lightBonus: 0, comboWindow: COMBO_WINDOW, maxMultiplier: LIGHT.maxMultiplier,
  };
  const enemies = [];
  for (let i = 0; i < POOL.enemies; i += 1) enemies.push({ active: false, kind: KIND_MOTE, x: 0, y: 0, hp: 1, maxHp: 1, radius: 14, speed: 90, damage: 1, score: 50, embers: 1, shootTimer: 0, summonTimer: 0, flash: 0, fsm: 'chase', fsmTimer: 0, spiral: 0, enraged: false });
  const bullets = [];
  for (let i = 0; i < POOL.bullets; i += 1) bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 1, pierce: 0 });
  const enemyBullets = [];
  for (let i = 0; i < POOL.enemyBullets; i += 1) enemyBullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 1 });
  const embers = [];
  for (let i = 0; i < POOL.embers; i += 1) embers.push({ active: false, x: 0, y: 0, vx: 0, vy: 0 });

  const state = {
    player, enemies, bullets, enemyBullets, embers,
    score: 0, best: 0, kills: 0, wave: 1, combo: 0, comboTimer: 0,
    comboMult: 1, lightRadius: LIGHT.baseRadius, lightTarget: LIGHT.baseRadius,
    darkness: LIGHT.darkness, bossEnraged: false,
    waveActive: false, spawnQueue: [], spawnTimer: 0, spawnInterval: 1, elapsed: 0,
    upgrades: [], bossSpawned: false, novaReady: false, shake: 0, shakeMag: 0, lastKill: null,
  };

  /** Combo multiplier from the current chain, capped by upgrades. */
  function comboMultiplier() {
    return Math.min(player.maxMultiplier, 1 + Math.floor(state.combo / 5) * 0.2);
  }

  function free(list) { for (const it of list) if (!it.active) return it; return null; }
  function activeEnemies() { let n = 0; for (const e of enemies) if (e.active) n += 1; return n; }

  function spawnEnemy(kind, atX, atY) {
    const e = free(enemies);
    if (!e) return null;
    const spec = ENEMY[kind];
    if (atX === undefined) {
      // Spawn on a ring around the keeper, just outside the lantern light,
      // so shadows emerge from the dark instead of popping in at an edge.
      const a = random() * Math.PI * 2;
      const r = 600;
      e.x = Math.min(FIELD.width - 30, Math.max(30, player.x + Math.cos(a) * r));
      e.y = Math.min(FIELD.height - 30, Math.max(30, player.y + Math.sin(a) * r));
    } else {
      e.x = atX; e.y = atY;
    }
    e.active = true; e.kind = kind;
    e.hp = e.maxHp = spec.hp; e.radius = spec.radius; e.speed = spec.speed;
    e.damage = spec.damage; e.score = spec.score; e.embers = spec.embers;
    e.shootTimer = spec.shootInterval ? spec.shootInterval * (0.7 + random() * 0.6) : 0;
    e.summonTimer = 6; e.flash = 0; e.fsm = 'chase'; e.fsmTimer = 2 + random() * 1.5;
    e.spiral = 0; e.enraged = false;
    return e;
  }

  function buildWave(n) {
    const cfg = WAVE_CONFIG[n - 1];
    const q = [];
    for (let i = 0; i < cfg.boss; i += 1) q.push(KIND_WARDEN);
    for (let i = 0; i < cfg.mote; i += 1) q.push(KIND_MOTE);
    for (let i = 0; i < cfg.wisp; i += 1) q.push(KIND_WISP);
    for (let i = 0; i < cfg.brute; i += 1) q.push(KIND_BRUTE);
    // The boss always leads wave 8; the rest arrive shuffled, not in blocks.
    const rest = q.slice(cfg.boss);
    for (let i = rest.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const t = rest[i]; rest[i] = rest[j]; rest[j] = t;
    }
    return q.slice(0, cfg.boss).concat(rest);
  }

  function startWave(n) {
    state.wave = n;
    state.spawnQueue = buildWave(n);
    state.spawnInterval = WAVE_CONFIG[n - 1].spawnInterval;
    state.spawnTimer = 0.6;
    state.waveActive = true;
    state.bossSpawned = n === FINAL_WAVE;
    state.bossEnraged = false;
  }

  function offerUpgrades() {
    state.upgrades = pickDistinct(random, UPGRADES, 3);
    return state.upgrades;
  }

  function applyUpgrade(id) {
    const u = UPGRADES.find((x) => x.id === id);
    if (u) u.apply(player);
    state.upgrades = [];
  }

  function dropEmbers(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const em = free(embers);
      if (!em) return;
      const a = random() * Math.PI * 2;
      em.active = true; em.x = x; em.y = y;
      em.vx = Math.cos(a) * 60; em.vy = Math.sin(a) * 60;
    }
  }

  function killEnemy(e, events) {
    e.active = false;
    state.lastKill = { x: e.x, y: e.y, kind: e.kind };
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = player.comboWindow;
    state.comboMult = comboMultiplier();
    state.score += Math.round(e.score * state.comboMult);
    if (e.kind === KIND_WARDEN) { state.shakeMag = 1; state.bossEnraged = false; }
    else if (e.kind === KIND_BRUTE) state.shakeMag = Math.max(state.shakeMag, 0.6);
    dropEmbers(e.x, e.y, e.embers);
    return events | EVENT_KILL;
  }

  function fireBolt() {
    const spread = 0.14;
    const n = player.shots;
    for (let i = 0; i < n; i += 1) {
      const b = free(bullets);
      if (!b) return;
      const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
      const a = player.aim + off;
      b.active = true;
      b.x = player.x + Math.cos(player.aim) * (PLAYER.radius + 6);
      b.y = player.y + Math.sin(player.aim) * (PLAYER.radius + 6);
      b.vx = Math.cos(a) * PLAYER.bulletSpeed;
      b.vy = Math.sin(a) * PLAYER.bulletSpeed;
      // Bolts hit harder while the combo burns bright.
      b.damage = PLAYER.bulletDamage * (1 + player.damageBonus) * state.comboMult;
      b.pierce = player.pierce;
    }
  }

  function fireEnemyBullet(e, tx, ty, speed) {
    const b = free(enemyBullets);
    if (!b) return;
    const a = Math.atan2(ty - e.y, tx - e.x);
    b.active = true; b.x = e.x; b.y = e.y;
    b.vx = Math.cos(a) * speed; b.vy = Math.sin(a) * speed;
    b.damage = e.damage;
  }

  function reset() {
    player.x = FIELD.width / 2; player.y = FIELD.height / 2;
    player.hp = player.maxHp = PLAYER.maxHp;
    player.speed = PLAYER.speed; player.fireInterval = PLAYER.fireInterval;
    player.shots = 1; player.pierce = 0;
    player.dashCooldownMax = PLAYER.dashCooldown; player.dashCooldown = 0; player.dashLeft = 0;
    player.invulnerable = 0; player.fireTimer = 0; player.aim = -Math.PI / 2;
    player.novaNeeded = NOVA.embersNeeded; player.embers = 0;
    player.pickupRadius = PLAYER.pickupRadius;
    player.damageBonus = 0; player.lightBonus = 0;
    player.comboWindow = COMBO_WINDOW; player.maxMultiplier = LIGHT.maxMultiplier;
    for (const e of enemies) e.active = false;
    for (const b of bullets) b.active = false;
    for (const b of enemyBullets) b.active = false;
    for (const em of embers) em.active = false;
    state.score = 0; state.kills = 0; state.wave = 1; state.combo = 0; state.comboTimer = 0;
    state.comboMult = 1; state.lightRadius = LIGHT.baseRadius; state.lightTarget = LIGHT.baseRadius;
    state.darkness = LIGHT.darkness; state.bossEnraged = false;
    state.waveActive = false; state.spawnQueue = []; state.elapsed = 0; state.shake = 0; state.shakeMag = 0;
    state.upgrades = []; state.bossSpawned = false; state.novaReady = false;
  }

  /**
   * One fixed step. `move` is a normalised {x,y}, `aim` a field point, `firing`
   * whether the trigger is held, `dash`/`nova` one-shot requests. Returns flags.
   */
  function step(dt, move, aim, firing, dash, nova) {
    let events = 0;
    state.elapsed += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
    if (state.shakeMag > 0) state.shakeMag = Math.max(0, state.shakeMag - dt * 2.5);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) { state.combo = 0; state.comboMult = 1; }
    }
    // Combo-linked Light Level: the lantern burns wider and brighter as the
    // chain grows, and dims again when it fades. The radius lerps smoothly,
    // it never jumps.
    state.lightTarget = (LIGHT.baseRadius + player.lightBonus)
      * (1 + (state.comboMult - 1) * 0.35);
    state.lightRadius += (state.lightTarget - state.lightRadius) * Math.min(1, 8 * dt);
    state.darkness += ((state.bossEnraged ? LIGHT.enrageDarkness : LIGHT.darkness) - state.darkness) * Math.min(1, 2 * dt);
    for (const e of enemies) if (e.active && e.flash > 0) e.flash -= dt;
    player.aim = Math.atan2(aim.y - player.y, aim.x - player.x);

    // Dash: a short burst in the move direction (or the aim if standing still).
    if (dash && player.dashCooldown <= 0 && player.dashLeft <= 0) {
      const dir = (move.x !== 0 || move.y !== 0) ? move : { x: Math.cos(player.aim), y: Math.sin(player.aim) };
      player.dashDir = dir;
      player.dashLeft = PLAYER.dashTime;
      player.dashCooldown = player.dashCooldownMax;
      player.invulnerable = Math.max(player.invulnerable, PLAYER.dashTime + 0.1);
      events |= EVENT_DASH;
    }
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.invulnerable > 0) player.invulnerable -= dt;

    if (player.dashLeft > 0) {
      player.dashLeft -= dt;
      player.x += player.dashDir.x * PLAYER.dashSpeed * dt;
      player.y += player.dashDir.y * PLAYER.dashSpeed * dt;
    } else {
      player.x += move.x * player.speed * dt;
      player.y += move.y * player.speed * dt;
    }
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y));

    // Nova: spend a full lantern to blast everything nearby.
    state.novaReady = player.embers >= player.novaNeeded;
    if (nova && state.novaReady) {
      player.embers = 0;
      state.novaReady = false;
      state.shakeMag = 1;
      events |= EVENT_NOVA;
      for (const e of enemies) {
        if (!e.active) continue;
        if (dist2(e.x, e.y, player.x, player.y) <= NOVA.radius * NOVA.radius) {
          e.hp -= NOVA.damage * state.comboMult;
          e.flash = 0.08;
          if (e.hp <= 0) events = killEnemy(e, events);
        }
      }
      // Clear enemy bolts caught in the blast.
      for (const b of enemyBullets) {
        if (b.active && dist2(b.x, b.y, player.x, player.y) <= NOVA.radius * NOVA.radius) b.active = false;
      }
    }

    // Firing: a small shake on every shot, the lowest tier of the shake.
    player.fireTimer -= dt;
    if (firing && player.fireTimer <= 0) {
      fireBolt();
      player.fireTimer = player.fireInterval;
      state.shakeMag = Math.max(state.shakeMag, 0.12);
    }

    // Spawning, paced by this wave's interval from WAVE_CONFIG.
    if (state.waveActive && state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy(state.spawnQueue.shift());
        state.spawnTimer = state.spawnInterval;
      }
    }

    // Enemies: chase, keep distance and shoot, or lumber.
    for (const e of enemies) {
      if (!e.active) continue;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (e.kind === KIND_WISP) {
        const want = 230;
        const dir = d > want + 20 ? 1 : d < want - 20 ? -1 : 0;
        e.x += (dx / d) * e.speed * dir * dt;
        e.y += (dy / d) * e.speed * dir * dt;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && d < 520) {
          fireEnemyBullet(e, player.x, player.y, ENEMY.wisp.bulletSpeed);
          e.shootTimer = ENEMY.wisp.shootInterval;
        }
      } else if (e.kind === KIND_WARDEN) {
        // Enrage: below half health the Warden moves faster, fires denser
        // spirals, summons more shadows, and the arena darkens.
        if (!e.enraged && e.hp <= e.maxHp / 2) {
          e.enraged = true; state.bossEnraged = true; state.shakeMag = 1;
        }
        const chaseSpeed = e.enraged ? e.speed * 2.4 : e.speed;
        const ringCount = e.enraged ? 14 : 10;
        const ringInterval = e.enraged ? 0.18 : 0.28;
        e.fsmTimer -= dt;
        if (e.fsm === 'chase') {
          e.x += (dx / d) * chaseSpeed * dt;
          e.y += (dy / d) * chaseSpeed * dt;
          if (e.fsmTimer <= 0) { e.fsm = 'radial'; e.fsmTimer = 1.4; e.shootTimer = 0; }
        } else if (e.fsm === 'radial') {
          // Spiral radial barrage: a ring of bolts, each ring rotated a step.
          e.shootTimer -= dt;
          if (e.shootTimer <= 0) {
            e.spiral += 0.25;
            for (let k = 0; k < ringCount; k += 1) {
              const a = (k / ringCount) * Math.PI * 2 + e.spiral;
              const b = free(enemyBullets);
              if (!b) break;
              b.active = true; b.x = e.x; b.y = e.y;
              b.vx = Math.cos(a) * ENEMY.warden.bulletSpeed; b.vy = Math.sin(a) * ENEMY.warden.bulletSpeed;
              b.damage = 1;
            }
            e.shootTimer = ringInterval;
          }
          if (e.fsmTimer <= 0) { e.fsm = 'summon'; e.fsmTimer = 0.9; }
        } else {
          // Summon darkness: shadows appear in a ring around the Warden.
          if (e.fsmTimer <= 0) {
            const count = e.enraged ? 6 : 4;
            for (let k = 0; k < count; k += 1) {
              const a = (k / count) * Math.PI * 2;
              spawnEnemy(k % 2 === 0 ? KIND_MOTE : KIND_WISP,
                e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90);
            }
            e.fsm = 'chase'; e.fsmTimer = e.enraged ? 2 : 3;
          }
        }
      } else {
        e.x += (dx / d) * e.speed * dt;
        e.y += (dy / d) * e.speed * dt;
      }
      // Touching the keeper hurts: a hit halves the combo and dims the
      // lantern, it does not erase the whole chain.
      if (player.invulnerable <= 0 && dist2(e.x, e.y, player.x, player.y) < (e.radius + PLAYER.radius) * (e.radius + PLAYER.radius)) {
        player.hp -= e.damage;
        player.invulnerable = PLAYER.invulnerable;
        state.shake = 1; state.shakeMag = Math.max(state.shakeMag, 0.45);
        state.combo = Math.floor(state.combo / 2);
        state.comboMult = comboMultiplier();
        events |= EVENT_HIT;
        if (e.kind !== KIND_WARDEN && e.kind !== KIND_BRUTE) e.active = false;
        if (player.hp <= 0) { player.hp = 0; return events | EVENT_OVER; }
      }
    }

    // Player bolts, colliding through a spatial hash grid: each bolt only
    // checks the foes in its own cell and the eight around it, using squared
    // distances (no square root in the hot loop).
    const grid = new Map();
    for (const e of enemies) {
      if (!e.active) continue;
      const key = Math.floor(e.x / HASH_CELL) + Math.floor(e.y / HASH_CELL) * 100;
      let cell = grid.get(key);
      if (!cell) { cell = []; grid.set(key, cell); }
      cell.push(e);
    }
    for (const b of bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) { b.active = false; continue; }
      const cx = Math.floor(b.x / HASH_CELL);
      const cy = Math.floor(b.y / HASH_CELL);
      let hit = false;
      for (let ox = -1; ox <= 1 && !hit; ox += 1) {
        for (let oy = -1; oy <= 1 && !hit; oy += 1) {
          const cell = grid.get((cx + ox) + (cy + oy) * 100);
          if (!cell) continue;
          for (const e of cell) {
            if (!e.active) continue;
            if (dist2(b.x, b.y, e.x, e.y) > (e.radius + 6) * (e.radius + 6)) continue;
            e.hp -= b.damage;
            e.flash = 0.06;
            if (e.hp <= 0) events = killEnemy(e, events);
            else events |= EVENT_HIT;
            if (b.pierce > 0) { b.pierce -= 1; }
            else { b.active = false; hit = true; }
            break;
          }
        }
      }
    }

    // Enemy bolts.
    for (const b of enemyBullets) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) { b.active = false; continue; }
      if (player.invulnerable <= 0 && dist2(b.x, b.y, player.x, player.y) < (PLAYER.radius + 6) * (PLAYER.radius + 6)) {
        b.active = false;
        player.hp -= b.damage;
        player.invulnerable = PLAYER.invulnerable;
        state.shake = 1; state.shakeMag = Math.max(state.shakeMag, 0.45);
        state.combo = Math.floor(state.combo / 2);
        state.comboMult = comboMultiplier();
        events |= EVENT_HIT;
        if (player.hp <= 0) { player.hp = 0; return events | EVENT_OVER; }
      }
    }

    // Embers drift, magnetise, and are collected.
    for (const em of embers) {
      if (!em.active) continue;
      em.x += em.vx * dt; em.y += em.vy * dt;
      em.vx *= 0.94; em.vy *= 0.94;
      const d2 = dist2(em.x, em.y, player.x, player.y);
      const magnet = player.pickupRadius * 3;
      if (d2 < magnet * magnet) {
        const d = Math.sqrt(d2) || 1;
        em.x += ((player.x - em.x) / d) * 260 * dt;
        em.y += ((player.y - em.y) / d) * 260 * dt;
      }
      if (d2 < player.pickupRadius * player.pickupRadius) {
        em.active = false;
        player.embers += 1;
        events |= EVENT_PICKUP;
      }
    }
    state.novaReady = player.embers >= player.novaNeeded;

    // Wave cleared: no queue left and no foe standing.
    if (state.waveActive && state.spawnQueue.length === 0 && activeEnemies() === 0) {
      state.waveActive = false;
      if (state.wave >= FINAL_WAVE) return events | EVENT_WIN;
      return events | EVENT_WAVE_CLEAR;
    }
    return events;
  }

  reset();
  return { state, reset, step, startWave, offerUpgrades, applyUpgrade, spawnAt: spawnEnemy };
}
