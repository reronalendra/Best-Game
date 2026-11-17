// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Canvas shapes and text for the field, the keeper,
// the shadows, the HUD, the upgrade cards and the panels.

import { FIELD, FINAL_WAVE, FONT, LIGHT, NOVA, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };

const UPGRADE_ICONS = {
  rapid: 'iconRapid', twin: 'iconTwin', swift: 'iconSwift', wick: 'iconWick',
  magnet: 'iconMagnet', dash: 'iconDash', pierce: 'iconPierce', nova: 'iconNova',
  lumen: 'iconLumen', combo: 'iconCombo',
};

/** On-screen mute button (field coordinates): M key does the same. */
export const MUTE_BUTTON = { x: FIELD.width - 52, y: 96, w: 28, h: 28 };

export function createRenderer(canvas, particles, assets) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  // Offscreen light canvas: the darkness is painted here, then holes are
  // punched through it with destination-out, so the lantern lights the
  // field without a WebGL shader.
  const lightCanvas = document.createElement('canvas');
  lightCanvas.width = FIELD.width;
  lightCanvas.height = FIELD.height;
  const lightCtx = lightCanvas.getContext('2d');

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

  function drawLight(state) {
    const p = state.player;
    const radius = state.lightRadius || LIGHT.baseRadius;
    const darkness = state.darkness === undefined ? LIGHT.darkness : state.darkness;
    lightCtx.setTransform(1, 0, 0, 1, 0, 0);
    lightCtx.globalCompositeOperation = 'source-over';
    lightCtx.clearRect(0, 0, FIELD.width, FIELD.height);
    lightCtx.fillStyle = `rgba(5, 7, 18, ${darkness})`;
    lightCtx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Punch light holes through the darkness: the keeper's lantern first.
    lightCtx.globalCompositeOperation = 'destination-out';
    const glow = lightCtx.createRadialGradient(p.x, p.y, 10, p.x, p.y, radius);
    glow.addColorStop(0, 'rgba(0,0,0,1)');
    glow.addColorStop(0.7, 'rgba(0,0,0,0.85)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    lightCtx.fillStyle = glow;
    lightCtx.beginPath();
    lightCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    lightCtx.fill();
    // Small holes where bolts glow.
    for (const b of state.bullets) {
      if (!b.active) continue;
      lightCtx.beginPath(); lightCtx.arc(b.x, b.y, 26, 0, Math.PI * 2); lightCtx.fill();
    }
    // Every foe glows a little in the dark, so shadows outside the lantern
    // are silhouettes you can read, not invisible threats. A partial
    // gradient (never full strength) keeps the lantern the brightest thing.
    for (const e of state.enemies) {
      if (!e.active) continue;
      const r = e.radius + 34;
      const g = lightCtx.createRadialGradient(e.x, e.y, 4, e.x, e.y, r);
      g.addColorStop(0, 'rgba(0,0,0,0.65)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lightCtx.fillStyle = g;
      lightCtx.beginPath(); lightCtx.arc(e.x, e.y, r, 0, Math.PI * 2); lightCtx.fill();
    }
    lightCtx.globalCompositeOperation = 'source-over';
    context.drawImage(lightCanvas, 0, 0);
  }

  function drawField(state, time) {
    context.fillStyle = PALETTE.field;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Stone floor tiles (transparent-PNG asset), with a grid fallback.
    const tile = assets ? assets.get('tile') : null;
    if (tile) {
      for (let x = 0; x < FIELD.width; x += 128) {
        for (let y = 0; y < FIELD.height; y += 128) context.drawImage(tile, x, y, 128, 128);
      }
    } else {
      context.strokeStyle = PALETTE.grid;
      context.lineWidth = 1;
      for (let x = 80; x < FIELD.width; x += 80) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, FIELD.height); context.stroke(); }
      for (let y = 80; y < FIELD.height; y += 80) { context.beginPath(); context.moveTo(0, y); context.lineTo(FIELD.width, y); context.stroke(); }
    }
    const p = state.player;
    context.strokeStyle = PALETTE.fieldEdge;
    context.lineWidth = 4;
    context.strokeRect(2, 2, FIELD.width - 4, FIELD.height - 4);

    for (const em of state.embers) {
      if (!em.active) continue;
      const bob = Math.sin(time * 4 + em.x) * 2;
      if (!assets || !assets.draw(context, 'ember', em.x, em.y + bob, 28)) {
        circle(em.x, em.y + bob, 7, PALETTE.ember);
        circle(em.x, em.y + bob, 3, '#ffd166');
      }
    }
    for (const e of state.enemies) {
      if (!e.active) continue;
      const color = e.kind === 'mote' ? PALETTE.mote : e.kind === 'wisp' ? PALETTE.wisp : e.kind === 'brute' ? PALETTE.brute : PALETTE.warden;
      const pulse = 1 + Math.sin(time * 5 + e.x) * 0.08;
      const size = e.radius * 2 * pulse;
      const drawn = assets && assets.draw(context, e.kind, e.x, e.y, size);
      if (!drawn) {
        circle(e.x, e.y, e.radius * pulse, color);
        circle(e.x, e.y, e.radius * 0.55, 'rgba(0,0,0,0.35)');
        const a = Math.atan2(state.player.y - e.y, state.player.x - e.x);
        circle(e.x + Math.cos(a - 0.4) * e.radius * 0.45, e.y + Math.sin(a - 0.4) * e.radius * 0.45, 2.5, '#fff');
        circle(e.x + Math.cos(a + 0.4) * e.radius * 0.45, e.y + Math.sin(a + 0.4) * e.radius * 0.45, 2.5, '#fff');
      }
      // Hit-flash: a brief white flash on a foe that just took a bolt.
      if (e.flash > 0) {
        context.globalAlpha = Math.min(0.7, (e.flash / 0.06) * 0.7);
        circle(e.x, e.y, e.radius * 0.9, '#ffffff');
        context.globalAlpha = 1;
      }
      // Enraged Warden: a red ring, so the phase change reads at a glance.
      if (e.kind === 'warden' && e.enraged) {
        context.strokeStyle = 'rgba(248, 113, 113, 0.8)';
        context.lineWidth = 3;
        context.beginPath(); context.arc(e.x, e.y, e.radius + 8, 0, Math.PI * 2); context.stroke();
        text('ENRAGED', e.x, e.y - e.radius - 22, 16, '#f87171', 'center');
      }
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
    // The keeper: sprite first, drawn shapes as fallback. Blinks while
    // invulnerable; a dash leaves afterimages (drawn by the trail dots).
    if (p.invulnerable <= 0 || Math.floor(p.invulnerable * 10) % 2 === 1) {
      const drawn = assets && assets.draw(context, 'keeper', p.x, p.y, 56);
      if (!drawn) {
        circle(p.x, p.y, PLAYER.radius + 4, 'rgba(255, 209, 102, 0.35)');
        circle(p.x, p.y, PLAYER.radius, PALETTE.player);
        circle(p.x, p.y, 8, PALETTE.playerCore);
      }
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
    drawLight(state);
    for (const d of particles.dots) {
      if (!d.active) continue;
      context.globalAlpha = Math.max(0, d.life / d.max);
      circle(d.x, d.y, d.size, d.color);
    }
    for (const s of particles.seeks) {
      if (!s.active) continue;
      context.globalAlpha = Math.max(0, s.life / s.max);
      circle(s.x, s.y, s.size, s.color);
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
    if (state.combo > 1) text(`Combo x${state.combo} · ${(state.comboMult || 1).toFixed(1)}x light`, FIELD.width / 2, 48, 20, PALETTE.ember, 'center', 'top');
    // Hearts (transparent PNG), top right; empty hearts are dimmed.
    for (let i = 0; i < p.maxHp; i += 1) {
      const x = FIELD.width - 24 - (p.maxHp - i) * 30;
      context.globalAlpha = i < p.hp ? 1 : 0.22;
      if (!assets || !assets.draw(context, 'heart', x, 32, 26)) {
        circle(x, 32, 11, i < p.hp ? PALETTE.hp : '#2a3040');
      }
      context.globalAlpha = 1;
    }
    // Mute button, top right under the lantern meter: click it or press M.
    context.fillStyle = PALETTE.panel;
    context.fillRect(MUTE_BUTTON.x, MUTE_BUTTON.y, MUTE_BUTTON.w, MUTE_BUTTON.h);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(MUTE_BUTTON.x, MUTE_BUTTON.y, MUTE_BUTTON.w, MUTE_BUTTON.h);
    text(muted ? '✕' : '♪', MUTE_BUTTON.x + MUTE_BUTTON.w / 2, MUTE_BUTTON.y + 20, 18, muted ? PALETTE.danger : PALETTE.ember, 'center', 'top');
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
    text('WASD move · Mouse aim · Click/Space shoot · E nova · P pause · M music' + (muted ? ' · Muted' : ''), FIELD.width - 24, FIELD.height - 30, 16, '#5b6480', 'right', 'top');
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

  function drawUpgrade(state, muted) {
    drawField(state, 0);
    drawHud(state, state.best, muted);
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
      const icon = UPGRADE_ICONS[cards[i].id];
      if (icon && assets) assets.draw(context, icon, x + cw / 2, y + 44, 44);
      else text(`${i + 1}`, x + cw / 2, y + 52, 30, PALETTE.ember, 'center');
      text(cards[i].name, x + cw / 2, y + 96, 24, PALETTE.text, 'center');
      text(cards[i].desc, x + cw / 2, y + 132, 18, PALETTE.muted, 'center');
      text(`Press ${i + 1}`, x + cw / 2, y + 164, 16, PALETTE.muted, 'center');
    }
    return { startX, y, cw, ch, gap };
  }

  function draw(state, screen, best, time, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    // Tiered shake: the magnitude comes from shakeMag (shoot < hit < Nova /
    // boss death), decaying in the world; shake is the legacy 0/1 hit flag.
    const mag = Math.max(state.shakeMag || 0, (state.shake || 0) * 0.5);
    const shake = mag > 0 ? (Math.random() - 0.5) * 16 * mag : 0;
    const shakeY = mag > 0 ? (Math.random() - 0.5) * 16 * mag : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shake * view.scale, view.y + shakeY * view.scale);
    if (screen === SCREEN_UPGRADE) { drawUpgrade(state, muted); return; }
    drawField(state, time);
    if (screen === SCREEN_TITLE) {
      drawPanel('LUMENKEEPER', [
        'Keep the lantern lit. The Gloom is coming.',
        'WASD / arrows to move · Mouse to aim · Click or Space to shoot',
        'Shift to dash · E for a Nova when the lantern is full · P to pause',
        'M or the ♪ button mutes the music & effects',
        `Survive all ${FINAL_WAVE} waves and defeat the Gloom Warden.`,
        `Best score ${best}`,
        'A Lumenkeeper Team game · art, code & sound by the team',
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
