// Keyboard and pointer input. Held keys steer the turkey; one-shot presses
// (jump, slide, start, restart, pause) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_JUMP = 4;
export const ACTION_SLIDE = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const SLIDE = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let slideHeld = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (JUMP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_JUMP | ACTION_CONFIRM;
    } else if (SLIDE.has(event.code)) {
      slideHeld = true;
      if (!event.repeat) actions |= ACTION_SLIDE;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (SLIDE.has(event.code)) slideHeld = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    slideHeld = false;
  });
  // Mouse: click jumps (and starts / restarts); holding the button slides.
  target.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    actions |= ACTION_JUMP | ACTION_CONFIRM;
  });
  target.addEventListener('pointerup', () => {
    slideHeld = false;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    sliding() {
      return slideHeld;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
