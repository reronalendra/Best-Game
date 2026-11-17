// Particles and floating score popups: purely visual, no rules. One fixed pool,
// allocated once, so a busy fight allocates nothing.
import { POOL } from './config.js';

export function createParticles() {
  const dots = [];
  const pops = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    dots.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3, color: '#fff' });
  }
  for (let i = 0; i < 24; i += 1) {
    pops.push({ active: false, x: 0, y: 0, life: 0, text: '' });
  }

  function burst(x, y, color, count, speed) {
    let made = 0;
    for (const d of dots) {
      if (made >= count) break;
      if (d.active) continue;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      d.active = true; d.x = x; d.y = y;
      d.vx = Math.cos(a) * s; d.vy = Math.sin(a) * s;
      d.max = d.life = 0.35 + Math.random() * 0.4;
      d.size = 2 + Math.random() * 3; d.color = color;
      made += 1;
    }
  }

  function popup(x, y, text) {
    for (const p of pops) {
      if (p.active) continue;
      p.active = true; p.x = x; p.y = y; p.life = 0.9; p.text = text;
      return;
    }
  }

  function step(dt) {
    for (const d of dots) {
      if (!d.active) continue;
      d.life -= dt;
      if (d.life <= 0) { d.active = false; continue; }
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.vx *= 0.96; d.vy *= 0.96;
    }
    for (const p of pops) {
      if (!p.active) continue;
      p.life -= dt; p.y -= 34 * dt;
      if (p.life <= 0) p.active = false;
    }
  }

  return { dots, pops, burst, popup, step };
}
