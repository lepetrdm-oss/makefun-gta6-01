// Keyboard and mouse input: held keys, one-shot actions, and mouse drag to look.

export const ACTION_PAUSE = 1;
export const ACTION_ENTER = 2;
export const ACTION_MELEE = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  const actions = { bits: 0 };
  let dragX = 0;
  let mouseDown = false;
  let shootQueued = false;
  let shootHeld = false;

  function keyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyP' || event.code === 'Escape') actions.bits |= ACTION_PAUSE;
    if (event.code === 'KeyE') actions.bits |= ACTION_ENTER;
    if (event.code === 'KeyV') actions.bits |= ACTION_MELEE;
    if (event.code === 'KeyM') actions.bits |= ACTION_MUTE;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  }
  function keyUp(event) { keys.delete(event.code); }
  function pointerDown(event) {
    mouseDown = true;
    shootQueued = true;
    shootHeld = true;
    canvas.setPointerCapture?.(event.pointerId);
  }
  function pointerUp() { mouseDown = false; shootHeld = false; }
  function pointerMove(event) {
    if (mouseDown) dragX += event.movementX || 0;
  }
  function blur() { keys.clear(); shootHeld = false; mouseDown = false; }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointermove', pointerMove);

  return {
    // Forward/back/turn in -1..1, from WASD or arrows.
    move() {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const t = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
      return { forward: f, turn: t, run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
    },
    takeActions() {
      const bits = actions.bits;
      actions.bits = 0;
      return bits;
    },
    takeDrag() {
      const d = dragX;
      dragX = 0;
      return d;
    },
    takeShoot() {
      const s = shootQueued;
      shootQueued = false;
      return s;
    },
    get shootHeld() { return shootHeld; },
    get anyKey() { return keys.size > 0; },
  };
}
