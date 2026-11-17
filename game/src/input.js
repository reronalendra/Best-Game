// Keyboard and mouse input. Held keys give a move direction; the mouse gives an
// aim point in field coordinates; one-shot presses (start, restart, pause, dash,
// nova, upgrade picks) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_NOVA = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const NOVA = new Set(['KeyE']);
const MUTE = new Set(['KeyM']);
const PICK = new Set(['Digit1', 'Digit2', 'Digit3']);

export function createInput(canvas) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let firing = false;
  let spaceHeld = false;
  let actions = 0;
  let pick = 0;
  const aim = { x: 640, y: 360 };

  function aimFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    aim.x = (event.clientX - rect.left - (rect.width - 1280 * scale) / 2) / scale;
    aim.y = (event.clientY - rect.top - (rect.height - 720 * scale) / 2) / scale;
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) { if (event.code === 'Space') spaceHeld = true; if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (DASH.has(event.code)) { if (!event.repeat) actions |= ACTION_DASH; }
    else if (NOVA.has(event.code)) { if (!event.repeat) actions |= ACTION_NOVA; }
    else if (MUTE.has(event.code)) { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (PICK.has(event.code)) { if (!event.repeat) pick = Number(event.code.slice(-1)); }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (CONFIRM.has(event.code) && event.code === 'Space') { firing = false; spaceHeld = false; }
  });
  window.addEventListener('blur', () => { up = down = left = right = firing = false; });
  canvas.addEventListener('pointermove', aimFromEvent);
  canvas.addEventListener('pointerdown', (event) => {
    aimFromEvent(event);
    if (event.button === 0) firing = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', (event) => { if (event.button === 0) firing = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    aim,
    /** Normalised move direction, {x, y}. */
    move() {
      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (down ? 1 : 0) - (up ? 1 : 0);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    /** Holding the mouse button or Space fires. */
    get firing() { return firing || spaceHeld; },
    takeActions() { const taken = actions; actions = 0; return taken; },
    takePick() { const taken = pick; pick = 0; return taken; },
    /** Drop a held shot (used when a click lands on the mute button). */
    clearFiring() { firing = false; spaceHeld = false; },
  };
}
