// The screenshot scenes behind ?shot=title|run|kitchen|escaped|caught. Each
// one plays the real rules forward from a fresh world, steered by a simple
// autopilot (jump the ground obstacles, slide under the hanging ones, sidestep
// the falling knives, chase the corn), so the frame is what a real run looks
// like and the same seed always gives the same frame. The caught scene uses
// a turkey that never moves, so the farmer catches it, as a hurried player
// is caught.
import { FIELD, STEP, TURKEY } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const TITLE_SECONDS = 4;
const RUN_SECONDS = 24;
const LIMIT_SECONDS = 900;

/**
 * The jump is timed in seconds, not pixels: the turkey jumps when the
 * obstacle is 0.30 s away. That keeps the height at arrival (~168 px, clears
 * even the 118 px oven) and the landing (0.73 s airtime) after the obstacle
 * has fully passed — a fixed pixel distance lands the turkey on the
 * obstacle's trailing edge at low speed and clips the oven at high speed.
 */
function jumpAhead(state) { return state.speed * 0.3; }
const SLIDE_AHEAD = 220;

/** Seconds until the turkey's feet touch the ground again, from its current
 * height and vertical speed (solves y + vy·t + ½g·t² = ground). */
function timeToLand(p) {
  const drop = FIELD.groundY - TURKEY.height - p.y;
  if (drop <= 0) return 0;
  const g = TURKEY.gravity;
  return (-p.vy + Math.sqrt(p.vy * p.vy + 2 * g * drop)) / g;
}

/** Seconds for the turkey to climb above an obstacle's height from the
 * ground (solves jumpV·t − ½g·t² = height, plus one step of reaction).
 * A hay needs 0.07 s, a fence 0.09 s, an oven 0.16 s — the old flat 0.07 s
 * fired the air jump for a hay the turkey could have landed and re-jumped
 * for, stranding it for the next obstacle. */
function climbTime(h) {
  const v = TURKEY.jumpVelocity;
  const g = TURKEY.gravity;
  const disc = v * v - 2 * g * h.height;
  if (disc < 0) return 0.3;
  return (-v - Math.sqrt(disc)) / g + 0.02;
}

/** Would the turkey's current arc carry it over this obstacle? The arc must
 * keep the turkey above the obstacle's top until the obstacle has FULLY
 * passed (its right edge clear of the turkey's left edge) — checking only
 * the arrival instant called a clear when the turkey landed on the
 * obstacle's trailing edge mid-pass. The 12 px margin is deliberate: the
 * jump arc passes a 74 px fence with only a few px to spare when the fence
 * is a pair partner arriving late in the arc. */
function clearsOnArc(p, h, state) {
  const gap = h.x - (p.x + TURKEY.width);
  const pass = Math.max(0, (gap + h.width + TURKEY.width) / state.speed);
  const yAtPass = p.y + p.vy * pass + 0.5 * TURKEY.gravity * pass * pass;
  return yAtPass + TURKEY.height < h.y - 12;
}

/** All scrolling obstacles still ahead, nearest first. An obstacle already
 * 30 px past the turkey's right edge cannot be jumped any more, so it is
 * skipped — without this the autopilot kept staring at the first half of a
 * pair while the second half ran it over. (A hanging obstacle being slid
 * under is the exception: the slide must continue until it has fully
 * passed.) */
function groundObstacles(state) {
  const p = state.player;
  const out = [];
  for (const h of state.hazards) {
    if (!h.active) continue;
    if (h.kind === 'knife' && h.y < FIELD.groundY - h.height) continue;
    if (h.x + h.width < p.x - 20) continue;
    if (h.x > p.x + 520) continue;
    const gap = h.x - (p.x + TURKEY.width);
    const slidingUnder = (h.kind === 'pitchfork' || h.kind === 'pot') && gap >= -h.width - 4;
    if (gap < -30 && !slidingUnder) continue;
    out.push({ h, gap });
  }
  out.sort((a, b) => a.gap - b.gap);
  return out;
}

/** Nearest knife still falling whose landing spot is on the turkey (within
 * 24 px either side). A knife landing elsewhere is not a threat. */
function nearestThreateningKnife(state) {
  const p = state.player;
  let best = null;
  for (const h of state.hazards) {
    if (!h.active || h.kind !== 'knife') continue;
    if (h.y >= FIELD.groundY - h.height) continue;
    const cx = h.x + h.width / 2;
    if (cx < p.x - 24 || cx > p.x + TURKEY.width + 24) continue;
    if (best === null || h.y > best.y) best = h;
  }
  return best;
}

/** Jump / slide a ground obstacle that is in range. Returns true when it
 * set an action. The caller tries every obstacle in range, nearest first,
 * and takes the first one that needs an action — the nearest may already
 * be passing under the turkey while the next one needs the jump. */
function handleGround(state, h, gap, input) {
  const p = state.player;
  if (h.kind === 'pitchfork' || h.kind === 'pot') {
    // Slide until the whole hanging obstacle has passed — standing up
    // while its trailing edge is still over the turkey is a hit.
    if (gap < SLIDE_AHEAD && gap > -h.width - 4 && p.grounded) {
      input.slide = true;
      return true;
    }
    return false;
  }
  // Ground obstacle: jump from the ground at the last safe moment. The air
  // jump is a scarce resource — spend it only when the current arc will
  // NOT clear this obstacle and landing first is too slow to re-jump.
  // Spending it on an obstacle the arc already clears strands the turkey
  // for the next one (the double jump's airtime outruns the spawn gap).
  // There is no distance gate on the air jump: it must fire as soon as the
  // arc is known to fail, while the turkey is still high — waiting for the
  // obstacle to get close leaves no height to gain. The timeToLand check
  // is what stops it firing for far obstacles the turkey will land and
  // re-jump for.
  if (p.grounded) {
    if (gap < jumpAhead(state) && gap > -30) {
      input.jump = true;
      return true;
    }
    return false;
  }
  // The air jump fires at the very top of the first jump's arc (vy above
  // -60, within a step of the peak), where the double jump gains the most
  // height and the longest airtime — firing it on the way up, fresh off
  // the ground, wastes it on a low arc that lands on the next obstacle.
  // (An earlier -200 threshold fired 0.05 s too soon and the turkey landed
  // a frame before the obstacle had passed.) The exception is an
  // emergency: an obstacle arriving in under 0.15 s is jumped at once,
  // low arc or not.
  if (p.jumps < 2 && gap > -30 && !clearsOnArc(p, h, state)) {
    const arrive = Math.max(0, gap / state.speed);
    const nearPeak = p.vy > -60;
    if ((nearPeak || arrive < 0.15) && timeToLand(p) + climbTime(h) >= arrive) {
      input.jump = true;
      return true;
    }
  }
  return false;
}

function nearestCorn(state) {
  const p = state.player;
  let best = null;
  for (const pk of state.pickups) {
    if (!pk.active) continue;
    if (pk.x < p.x - 20 || pk.x > p.x + 520) continue;
    if (best === null || pk.x < best.x) best = pk;
  }
  return best;
}

function autopilot(state) {
  const p = state.player;
  const input = { dir: 0, jump: false, slide: false };
  const grounds = groundObstacles(state);
  const k = nearestThreateningKnife(state);
  const gGap = grounds.length ? grounds[0].gap : Infinity;
  const kArrive = k ? (FIELD.groundY - k.height - k.y) / k.vy : Infinity;
  // Airborne, the turkey is committed to its arc: ANY sideways step changes
  // when the obstacle arrives and lands the turkey on its trailing edge.
  // Hold the line — no knife dodge, no corn, no drift — until it lands.
  // (The jump/slide for the obstacle below is still handled.)
  if (!p.grounded) {
    if (grounds.length && gGap < jumpAhead(state) + 60) {
      for (const { h, gap } of grounds) {
        if (handleGround(state, h, gap, input)) break;
      }
    }
    return input;
  }
  // A ground obstacle inside the jump window outranks a knife: dodging the
  // knife moves the turkey sideways and breaks the jump timing (moving left
  // delays the obstacle so the turkey lands on its tail; moving right
  // brings it in early). Hold the line and jump. But if a knife is about
  // to land on the turkey's head while it is still on the ground, steer
  // away while jumping — the jump timing has enough margin for the
  // sideways step, the knife does not.
  if (grounds.length && gGap < jumpAhead(state) + 60) {
    for (const { h, gap } of grounds) {
      if (handleGround(state, h, gap, input)) break;
    }
    if (k && kArrive < 0.5) {
      const centre = p.x + TURKEY.width / 2;
      input.dir = k.x + k.width / 2 > centre ? -1 : 1;
    }
    return input;
  }
  // A knife about to land on the turkey is dodged even while a ground
  // obstacle approaches — the jump window has not opened yet, so the dodge
  // does not disturb it. (The jump itself carries the turkey over a knife
  // that lands later, so only the imminent one is dodged here.)
  if (k && kArrive < 0.5) {
    const centre = p.x + TURKEY.width / 2;
    input.dir = k.x + k.width / 2 > centre ? -1 : 1;
    return input;
  }
  // A ground obstacle is approaching but not yet in the jump window: hold
  // position and let the jump timing stay valid. Knife-dodging here is
  // what pinned the turkey against the left wall and mistimed every jump
  // after it; the jump itself carries the turkey over a landing knife.
  if (grounds.length && gGap < 300) return input;
  if (k && kArrive < 1.0) {
    const centre = p.x + TURKEY.width / 2;
    input.dir = k.x + k.width / 2 > centre ? -1 : 1;
    return input;
  }
  // Idle: drift back to the base spot before chasing corn. A turkey far
  // from base has no room to dodge on one side, and the sideways drift is
  // what mistimes the next jump. Corn is chased only from near base.
  if (p.x < 180 || p.x > 260) {
    input.dir = p.x < 220 ? 1 : -1;
    return input;
  }
  const corn = nearestCorn(state);
  if (corn) {
    const centre = p.x + TURKEY.width / 2;
    if (corn.x > centre + 10) input.dir = 1;
    else if (corn.x < centre - 10) input.dir = -1;
  }
  return input;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Names other than the four below stage the title.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'run' && name !== 'kitchen' && name !== 'escaped' && name !== 'caught') {
    for (let i = 0; i < TITLE_SECONDS / STEP; i += 1) world.step(STEP, { dir: 0, jump: false, slide: false }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'caught') {
    // Never jump, never slide: the farmer catches up within seconds.
    for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
      if (world.step(STEP, { dir: 0, jump: false, slide: false }) & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  const targetM = name === 'kitchen' ? 1020 : name === 'escaped' ? 1500 : 0;
  const seconds = name === 'run' ? RUN_SECONDS : LIMIT_SECONDS;
  for (let i = 0; i < seconds / STEP; i += 1) {
    const events = world.step(STEP, autopilot(world.state));
    if (events & EVENT_OVER) break;
    if (targetM > 0 && world.state.distanceM >= targetM) break;
    if (name === 'run' && i >= RUN_SECONDS / STEP - 1) break;
  }
  const over = world.state.over !== null;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
