// Sprite loading: the transparent PNGs under game/assets/, drawn by the
// renderer. Loading is local files only. A sprite that has not loaded yet
// (or failed) simply reports as missing, and the renderer falls back to
// its drawn shapes, so the game never waits on art to be playable.

import { SPRITES } from './config.js';

export function createAssets() {
  const images = new Map();
  let loaded = 0;
  let total = 0;
  let ready = false;
  const waiters = [];

  function loadAll() {
    const entries = Object.entries(SPRITES);
    total = entries.length;
    if (total === 0) { ready = true; return Promise.resolve(); }
    return new Promise((resolve) => {
      waiters.push(resolve);
      for (const [key, path] of entries) {
        const img = new Image();
        img.onload = () => { loaded += 1; check(); };
        img.onerror = () => { loaded += 1; check(); };
        img.src = path;
        images.set(key, img);
      }
    });
    function check() {
      if (loaded >= total && !ready) {
        ready = true;
        for (const w of waiters) w();
      }
    }
  }

  function get(key) {
    const img = images.get(key);
    return img && img.complete && img.naturalWidth > 0 ? img : null;
  }

  function draw(context, key, x, y, size, angle) {
    const img = get(key);
    if (!img) return false;
    const half = size / 2;
    if (angle) {
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.drawImage(img, -half, -half, size, size);
      context.restore();
    } else {
      context.drawImage(img, x - half, y - half, size, size);
    }
    return true;
  }

  return { loadAll, get, draw, get ready() { return ready; } };
}
