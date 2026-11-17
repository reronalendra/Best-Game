// Lumenkeeper: every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** How many waves a run lasts; wave 8 is the Gloom Warden boss. */
export const FINAL_WAVE = 8;

export const PLAYER = {
  radius: 16,
  speed: 300,
  maxHp: 5,
  fireInterval: 0.2,
  bulletSpeed: 620,
  bulletDamage: 1,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 1.6,
  invulnerable: 1.0,
  pickupRadius: 26,
};

/**
 * The eight waves, in order. Each row is the spawn mix for that wave and how
 * fast its queue feeds in; wave 8 is the Gloom Warden boss. Tuning chosen
 * here, in this session, after brainstorming the pacing with the team:
 * early waves teach one foe at a time, the middle waves mix them, and the
 * last two waves are dense on purpose.
 */
export const WAVE_CONFIG = [
  { mote: 12, wisp: 0, brute: 0, boss: 0, spawnInterval: 1.2 },
  { mote: 18, wisp: 4, brute: 0, boss: 0, spawnInterval: 1.0 },
  { mote: 22, wisp: 8, brute: 1, boss: 0, spawnInterval: 0.9 },
  { mote: 28, wisp: 10, brute: 3, boss: 0, spawnInterval: 0.8 },
  { mote: 35, wisp: 14, brute: 4, boss: 0, spawnInterval: 0.7 },
  { mote: 40, wisp: 18, brute: 6, boss: 0, spawnInterval: 0.6 },
  { mote: 50, wisp: 22, brute: 8, boss: 0, spawnInterval: 0.5 },
  { mote: 15, wisp: 8, brute: 2, boss: 1, spawnInterval: 1.1 },
];

/** Combo-driven lantern light: radius grows with the combo, smoothly. */
export const LIGHT = {
  baseRadius: 220,
  maxBonus: 120,
  // Darkness is a mood, not a blindfold: foes outside the lantern must
  // stay readable. Tuned down after a visual check of the screenshots.
  darkness: 0.55,
  enrageDarkness: 0.68,
  comboWindow: 3.5,
  maxMultiplier: 3.0,
};

/** Game feel: tiered shake magnitudes and freeze-frame lengths. */
export const JUICE = {
  shakeShoot: 0.12,
  shakeHit: 0.45,
  shakeNova: 1.0,
  shakeBossDeath: 1.0,
  freezeSmall: 0.05,
  freezeBig: 0.1,
};

export const NOVA = {
  embersNeeded: 12,
  radius: 260,
  damage: 3,
};

export const ENEMY = {
  mote: { radius: 14, hp: 1, speed: 95, damage: 1, score: 50, embers: 1 },
  wisp: { radius: 13, hp: 2, speed: 70, damage: 1, score: 100, embers: 2, shootInterval: 2.6, bulletSpeed: 190 },
  brute: { radius: 24, hp: 6, speed: 48, damage: 2, score: 200, embers: 3 },
  warden: { radius: 46, hp: 60, speed: 42, damage: 2, score: 2000, embers: 12, shootInterval: 1.8, bulletSpeed: 220 },
};

export const COMBO_WINDOW = 3.5;
export const POOL = { enemies: 64, bullets: 128, enemyBullets: 96, embers: 64, particles: 512 };

/** Spatial hash cell size for collision queries (see world.js). */
export const HASH_CELL = 120;

export const PALETTE = {
  backdrop: '#0b0e1a',
  field: '#12162b',
  fieldEdge: '#1d2340',
  grid: '#1a2038',
  player: '#ffd166',
  playerCore: '#fff3c4',
  bullet: '#ffe08a',
  ember: '#ff9f43',
  mote: '#b388ff',
  wisp: '#7dd3fc',
  brute: '#f472b6',
  warden: '#c084fc',
  enemyBullet: '#e879f9',
  nova: '#fde68a',
  panel: '#171c33',
  panelEdge: '#2e3760',
  text: '#f1f5ff',
  muted: '#9aa3c0',
  hp: '#fb7185',
  danger: '#f87171',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumenkeeper.best';

/** The eight upgrades offered between waves, each with its own id, name and effect. */
export const UPGRADES = [
  { id: 'rapid', name: 'Rapid Lantern', desc: 'Shoot 25% faster', apply: (p) => { p.fireInterval *= 0.75; } },
  { id: 'twin', name: 'Twin Flame', desc: '+1 bolt per shot', apply: (p) => { p.shots += 1; } },
  { id: 'swift', name: 'Swift Boots', desc: 'Move 18% faster', apply: (p) => { p.speed *= 1.18; } },
  { id: 'wick', name: 'Thick Wick', desc: '+1 max heart, heal 2', apply: (p) => { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 2); } },
  { id: 'magnet', name: 'Ember Magnet', desc: 'Embers fly to you from farther', apply: (p) => { p.pickupRadius *= 1.8; } },
  { id: 'dash', name: 'Glimmer Dash', desc: 'Dash recharges 40% faster', apply: (p) => { p.dashCooldown *= 0.6; } },
  { id: 'pierce', name: 'Piercing Light', desc: 'Bolts pass through +1 foe', apply: (p) => { p.pierce += 1; } },
  { id: 'nova', name: 'Bright Nova', desc: 'Nova needs 4 fewer embers', apply: (p) => { p.novaNeeded = Math.max(4, p.novaNeeded - 4); } },
  { id: 'lumen', name: 'Lumen Intensity', desc: '+25% damage, +45 light radius', apply: (p) => { p.damageBonus += 0.25; p.lightBonus += 45; } },
  { id: 'combo', name: 'Combo Keeper', desc: 'Combo lasts +1.5s, cap +1.0x', apply: (p) => { p.comboWindow += 1.5; p.maxMultiplier += 1.0; } },
];

/** Transparent PNG sprite files under game/assets/, drawn by the renderer. */
export const SPRITES = {
  keeper: 'assets/keeper.png',
  mote: 'assets/mote.png',
  wisp: 'assets/wisp.png',
  brute: 'assets/brute.png',
  warden: 'assets/warden.png',
  ember: 'assets/ember.png',
  tile: 'assets/tile.png',
  iconLumen: 'assets/icon-lumen.png',
  iconDash: 'assets/icon-dash.png',
  iconNova: 'assets/icon-nova.png',
  iconCombo: 'assets/icon-combo.png',
};
