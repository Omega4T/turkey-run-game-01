// Boot and the one loop: input is read once per frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and over (caught or escaped).
//
// ?seed=N fixes the run's randomness. ?shot=title|run|kitchen|escaped|caught
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets document.title to 'shot-ready' for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_HIT,
  EVENT_NEAR_MISS,
  EVENT_OVER,
  EVENT_PICKUP,
  EVENT_PIE,
  EVENT_STAGE,
  EVENT_WARN,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else document.title = 'shot-ready';
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // The playtest handle: the state the headless checks read.
  window.__gobbler = {
    get screen() {
      return screen;
    },
    get state() {
      return world.state;
    },
  };

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.gobble();
    announce(`Playing. ${LIVES} lives. Outrun the farmer 1500 metres.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (world.state.over === 'escaped') audio.escaped();
    else audio.caught();
    announce(
      world.state.over === 'escaped'
        ? `Escaped! Score ${world.state.score}. Best ${best}.`
        : `Caught. Score ${world.state.score}. Best ${best}.`,
    );
  }

  function handleEvents(events) {
    if (events & EVENT_HIT) {
      audio.hit();
      announce(world.state.lives === 1 ? 'Hit! 1 life left.' : `Hit! ${world.state.lives} lives left.`);
    }
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_PIE) audio.pie();
    if (events & EVENT_NEAR_MISS) audio.pickup();
    if (events & EVENT_STAGE) {
      audio.stage();
      announce(`${world.state.stageName} — it gets harder from here.`);
    }
    if (events & EVENT_WARN) {
      audio.warn();
      announce('The farmer is right behind you!');
    }
    if (events & EVENT_OVER) endGame();
  }

  /** One fixed step. `actions` is this frame's one-shot presses; only the
   * first step of the frame may spend the jump, so a press fires once. */
  function step(actions, first) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dir: 0, jump: false, slide: false }, true);
      return;
    }
    const p = world.state.player;
    const wantJump = first && Boolean(actions & ACTION_JUMP) && (p.grounded || p.jumps < 2);
    if (wantJump) audio.jump();
    const events = world.step(STEP, {
      dir: input.direction(),
      jump: wantJump,
      slide: input.sliding(),
    });
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    let actions = input.takeActions();

    // Screen transitions take the presses first; a press that starts a game
    // must not also make the turkey jump on the first frame.
    let justStarted = false;
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      justStarted = true;
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (justStarted) actions &= ~ACTION_JUMP;

    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions, first);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the farmer
  // close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble Run. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
