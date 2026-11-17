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

export const COMBO_WINDOW = 3;
export const POOL = { enemies: 48, bullets: 96, enemyBullets: 64, embers: 48, particles: 256 };

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
];
