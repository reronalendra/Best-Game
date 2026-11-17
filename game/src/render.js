// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Canvas shapes and text for the field, the keeper,
// the shadows, the HUD, the upgrade cards and the panels.

import { FIELD, FINAL_WAVE, FONT, NOVA, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };

export function createRenderer(canvas, particles) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function circle(x, y, r, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }

  function drawField(state, time) {
    context.fillStyle = PALETTE.field;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Faint grid and a soft lantern glow around the keeper.
    context.strokeStyle = PALETTE.grid;
    context.lineWidth = 1;
    for (let x = 80; x < FIELD.width; x += 80) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, FIELD.height); context.stroke(); }
    for (let y = 80; y < FIELD.height; y += 80) { context.beginPath(); context.moveTo(0, y); context.lineTo(FIELD.width, y); context.stroke(); }
    const p = state.player;
    const glow = context.createRadialGradient(p.x, p.y, 10, p.x, p.y, 240);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.16)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    context.fillStyle = glow;
    context.fillRect(p.x - 240, p.y - 240, 480, 480);
    context.strokeStyle = PALETTE.fieldEdge;
    context.lineWidth = 4;
    context.strokeRect(2, 2, FIELD.width - 4, FIELD.height - 4);

    for (const em of state.embers) {
      if (!em.active) continue;
      const bob = Math.sin(time * 4 + em.x) * 2;
      circle(em.x, em.y + bob, 7, PALETTE.ember);
      circle(em.x, em.y + bob, 3, '#ffd166');
    }
    for (const e of state.enemies) {
      if (!e.active) continue;
      const color = e.kind === 'mote' ? PALETTE.mote : e.kind === 'wisp' ? PALETTE.wisp : e.kind === 'brute' ? PALETTE.brute : PALETTE.warden;
      const pulse = 1 + Math.sin(time * 5 + e.x) * 0.08;
      circle(e.x, e.y, e.radius * pulse, color);
      circle(e.x, e.y, e.radius * 0.55, 'rgba(0,0,0,0.35)');
      // Eyes: two dots facing the keeper.
      const a = Math.atan2(state.player.y - e.y, state.player.x - e.x);
      circle(e.x + Math.cos(a - 0.4) * e.radius * 0.45, e.y + Math.sin(a - 0.4) * e.radius * 0.45, 2.5, '#fff');
      circle(e.x + Math.cos(a + 0.4) * e.radius * 0.45, e.y + Math.sin(a + 0.4) * e.radius * 0.45, 2.5, '#fff');
      if (e.maxHp > 2) {
        context.fillStyle = 'rgba(255,255,255,0.25)';
        context.fillRect(e.x - e.radius, e.y - e.radius - 12, e.radius * 2, 5);
        context.fillStyle = PALETTE.hp;
        context.fillRect(e.x - e.radius, e.y - e.radius - 12, (e.radius * 2 * e.hp) / e.maxHp, 5);
      }
    }
    for (const b of state.bullets) {
      if (!b.active) continue;
      circle(b.x, b.y, 5, PALETTE.bullet);
      circle(b.x, b.y, 2.5, '#fff');
    }
    for (const b of state.enemyBullets) {
      if (!b.active) continue;
      circle(b.x, b.y, 6, PALETTE.enemyBullet);
    }
    // The keeper: a lantern with a warm core, blinking while invulnerable.
    if (p.invulnerable <= 0 || Math.floor(p.invulnerable * 10) % 2 === 1) {
      circle(p.x, p.y, PLAYER.radius + 4, 'rgba(255, 209, 102, 0.35)');
      circle(p.x, p.y, PLAYER.radius, PALETTE.player);
      circle(p.x, p.y, 8, PALETTE.playerCore);
      // Aim tick.
      context.strokeStyle = PALETTE.playerCore;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(p.x + Math.cos(p.aim) * (PLAYER.radius + 2), p.y + Math.sin(p.aim) * (PLAYER.radius + 2));
      context.lineTo(p.x + Math.cos(p.aim) * (PLAYER.radius + 14), p.y + Math.sin(p.aim) * (PLAYER.radius + 14));
      context.stroke();
    }
    // Nova ring while it is ready.
    if (state.novaReady) {
      context.strokeStyle = 'rgba(253, 230, 138, 0.5)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(p.x, p.y, NOVA.radius, 0, Math.PI * 2);
      context.stroke();
    }
    for (const d of particles.dots) {
      if (!d.active) continue;
      context.globalAlpha = Math.max(0, d.life / d.max);
      circle(d.x, d.y, d.size, d.color);
    }
    context.globalAlpha = 1;
    for (const pop of particles.pops) {
      if (!pop.active) continue;
      context.globalAlpha = Math.min(1, pop.life);
      text(pop.text, pop.x, pop.y, 20, '#ffe08a', 'center');
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, best, muted) {
    const p = state.player;
    context.textBaseline = 'top';
    text(`Score ${state.score}`, 24, 18, 26, PALETTE.text, 'left', 'top');
    text(`Best ${Math.max(best, state.score)}`, 24, 48, 18, PALETTE.muted, 'left', 'top');
    text(`Wave ${state.wave} / ${FINAL_WAVE}`, FIELD.width / 2, 18, 26, PALETTE.text, 'center', 'top');
    if (state.combo > 1) text(`Combo x${state.combo}`, FIELD.width / 2, 48, 20, PALETTE.ember, 'center', 'top');
    // Hearts, top right.
    for (let i = 0; i < p.maxHp; i += 1) {
      const x = FIELD.width - 24 - (p.maxHp - i) * 30;
      circle(x, 32, 11, i < p.hp ? PALETTE.hp : '#2a3040');
    }
    // Ember lantern meter.
    const mw = 180;
    const mx = FIELD.width - 24 - mw;
    context.fillStyle = '#2a3040';
    context.fillRect(mx, 56, mw, 12);
    context.fillStyle = PALETTE.ember;
    context.fillRect(mx, 56, mw * Math.min(1, p.embers / p.novaNeeded), 12);
    text(state.novaReady ? 'NOVA READY — press E' : `Embers ${p.embers}/${p.novaNeeded}`, mx + mw, 76, 16, state.novaReady ? PALETTE.nova : PALETTE.muted, 'right', 'top');
    // Dash cooldown.
    const dc = p.dashCooldown <= 0 ? 'Dash ready — Shift' : `Dash ${p.dashCooldown.toFixed(1)}s`;
    text(dc, 24, FIELD.height - 30, 16, p.dashCooldown <= 0 ? PALETTE.muted : '#5b6480', 'left', 'top');
    text('WASD move · Mouse aim · Click/Space shoot · E nova · P pause' + (muted ? ' · Muted' : ''), FIELD.width - 24, FIELD.height - 30, 16, '#5b6480', 'right', 'top');
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + PANEL.top + i * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.ember, 'center');
  }

  function drawUpgrade(state) {
    drawField(state, 0);
    drawHud(state, state.best, false);
    context.fillStyle = 'rgba(11, 14, 26, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text(`Wave ${state.wave} cleared!`, FIELD.width / 2, 110, 40, PALETTE.text, 'center');
    text('Choose an upgrade — click a card or press 1, 2 or 3', FIELD.width / 2, 160, 22, PALETTE.muted, 'center');
    const cards = state.upgrades;
    const cw = 300; const ch = 190; const gap = 28;
    const total = cards.length * cw + (cards.length - 1) * gap;
    const startX = (FIELD.width - total) / 2;
    const y = 240;
    for (let i = 0; i < cards.length; i += 1) {
      const x = startX + i * (cw + gap);
      context.fillStyle = PALETTE.panel;
      context.fillRect(x, y, cw, ch);
      context.strokeStyle = PALETTE.ember;
      context.lineWidth = 2;
      context.strokeRect(x, y, cw, ch);
      text(`${i + 1}`, x + cw / 2, y + 52, 30, PALETTE.ember, 'center');
      text(cards[i].name, x + cw / 2, y + 96, 24, PALETTE.text, 'center');
      text(cards[i].desc, x + cw / 2, y + 132, 18, PALETTE.muted, 'center');
    }
    return { startX, y, cw, ch, gap };
  }

  function draw(state, screen, best, time, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shake = state.shake > 0 ? (Math.random() - 0.5) * 10 * state.shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shake * view.scale, view.y + shake * view.scale);
    if (screen === SCREEN_UPGRADE) { drawUpgrade(state); return; }
    drawField(state, time);
    if (screen === SCREEN_TITLE) {
      drawPanel('LUMENKEEPER', [
        'Keep the lantern lit. The Gloom is coming.',
        'WASD / arrows to move · Mouse to aim · Click or Space to shoot',
        'Shift to dash · E for a Nova when the lantern is full · P to pause',
        `Survive all ${FINAL_WAVE} waves and defeat the Gloom Warden.`,
        `Best score ${best}`,
      ], 'Press Space or click to start');
      return;
    }
    drawHud(state, best, muted);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The Gloom waits for no one. Except now.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('The Light Fades', [
        `Score ${state.score} · Best ${Math.max(best, state.score)}`,
        `You reached Wave ${state.wave} · ${state.kills} shadows banished`,
      ], 'Press Space or click to play again');
    } else if (screen === SCREEN_WIN) {
      drawPanel('The Gloom Warden Falls!', [
        `Score ${state.score} · Best ${Math.max(best, state.score)}`,
        `All ${FINAL_WAVE} waves cleared · ${state.kills} shadows banished`,
        'The lantern burns bright again. You win!',
      ], 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, drawUpgrade };
}
