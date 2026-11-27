// The run itself: the turkey's physics, the farmer chasing from behind, the
// obstacles and pickups each stage throws at the run, and the score. The
// world advances in fixed STEP slices; the renderer only paints the state.
// The run ends two ways: the farmer closes the gap (caught) or the turkey
// covers ESCAPE_DISTANCE (escaped). Lives are the hits the turkey can take
// before the farmer grabs it.
import {
  ESCAPE_DISTANCE,
  FARMER,
  FIELD,
  LIVES,
  OBSTACLES,
  PICKUPS,
  POOL_SIZE,
  SCORE,
  STAGES,
  STEP,
  TURKEY,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_PIE = 4;
export const EVENT_NEAR_MISS = 8;
export const EVENT_OVER = 16;
export const EVENT_STAGE = 32;
export const EVENT_WARN = 64;
export const EVENT_ESCAPED = 128;

const KIND_GROUND = new Set(['hay', 'fence', 'crate', 'oven']);
const KIND_HANGING = new Set(['pitchfork', 'pot']);

/** Obstacle kinds each stage can throw, in spawn order of weight. */
const STAGE_HAZARDS = [
  ['hay', 'fence', 'hay', 'fence', 'corn', 'knife'],
  ['hay', 'fence', 'crate', 'pitchfork', 'hay', 'corn', 'knife'],
  ['oven', 'pot', 'crate', 'oven', 'knife', 'knife', 'corn'],
];

function makeHazard() {
  return { active: false, kind: '', x: 0, y: 0, width: 0, height: 0, vy: 0, passed: false, close: false, life: 0 };
}

function makePickup() {
  return { active: false, kind: 'corn', x: 0, y: 0, size: 0, points: 0, t: 0 };
}

function makeParticle() {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3, color: '#fff' };
}

export function createWorld(random) {
  const hazards = Array.from({ length: POOL_SIZE }, makeHazard);
  const pickups = Array.from({ length: POOL_SIZE }, makePickup);
  const particles = Array.from({ length: POOL_SIZE }, makeParticle);

  const state = {
    time: 0,
    distancePx: 0,
    distanceM: 0,
    score: 0,
    bonus: 0,
    lives: LIVES,
    stageIndex: 0,
    stageName: STAGES[0].name,
    speed: TURKEY.runSpeed,
    farmerGap: FARMER.startGap,
    player: {
      x: TURKEY.x,
      y: FIELD.groundY - TURKEY.height,
      vy: 0,
      grounded: true,
      jumps: 0,
      sliding: false,
      invuln: 0,
    },
    hazards,
    pickups,
    particles,
    banner: null,
    shake: 0,
    over: null,
    caughtReason: '',
    warned: false,
  };

  let spawnTimer = 0.7;
  let cornTimer = 1.2;
  let knifeTimer = 0;
  let lastHitAt = -10;

  function reset() {
    state.time = 0;
    state.distancePx = 0;
    state.distanceM = 0;
    state.score = 0;
    state.bonus = 0;
    state.lives = LIVES;
    state.stageIndex = 0;
    state.stageName = STAGES[0].name;
    state.speed = TURKEY.runSpeed;
    state.farmerGap = FARMER.startGap;
    state.player.x = TURKEY.x;
    state.player.y = FIELD.groundY - TURKEY.height;
    state.player.vy = 0;
    state.player.grounded = true;
    state.player.jumps = 0;
    state.player.sliding = false;
    state.player.invuln = 0;
    for (const h of hazards) h.active = false;
    for (const p of pickups) p.active = false;
    for (const p of particles) p.active = false;
    state.banner = null;
    state.shake = 0;
    state.over = null;
    state.caughtReason = '';
    state.warned = false;
    spawnTimer = 0.7;
    cornTimer = 1.2;
    knifeTimer = 0;
    lastHitAt = -10;
  }

  function burst(x, y, color, n, spread) {
    let made = 0;
    for (const p of particles) {
      if (made >= n) break;
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = (random() - 0.5) * spread;
      p.vy = -random() * spread * 0.7;
      p.life = 0.5 + random() * 0.4;
      p.max = p.life;
      p.size = 2 + random() * 4;
      p.color = color;
      made += 1;
    }
  }

  function spawnHazard(kind, x) {
    for (const h of hazards) {
      if (h.active) continue;
      const spec = OBSTACLES[kind];
      h.active = true;
      h.kind = kind;
      h.x = x;
      h.passed = false;
      h.close = false;
      h.life = 0;
      if (kind === 'knife') {
        h.width = spec.width;
        h.height = spec.height;
        h.y = -spec.height - random() * 60;
        h.vy = spec.fallSpeed;
      } else if (KIND_HANGING.has(kind)) {
        h.width = spec.width;
        h.height = spec.height;
        h.y = FIELD.groundY - spec.hangY - spec.height;
        h.vy = 0;
      } else {
        h.width = spec.width;
        h.height = spec.height;
        h.y = FIELD.groundY - spec.height;
        h.vy = 0;
      }
      return h;
    }
    return null;
  }

  function spawnPickup(kind, x, y) {
    for (const p of pickups) {
      if (p.active) continue;
      const spec = PICKUPS[kind];
      p.active = true;
      p.kind = kind;
      p.x = x;
      p.y = y;
      p.size = spec.size;
      p.points = spec.points;
      p.t = random() * Math.PI * 2;
      return p;
    }
    return null;
  }

  function spawnCornArc(x) {
    const baseY = FIELD.groundY - 120;
    for (let i = 0; i < 5; i += 1) {
      const px = x + i * 34;
      const py = baseY - Math.sin((i / 4) * Math.PI) * 70;
      spawnPickup('corn', px, py);
    }
  }

  function spawnPattern() {
    const table = STAGE_HAZARDS[state.stageIndex];
    const pick = table[Math.floor(random() * table.length)];
    const x = FIELD.width + 40 + random() * 120;
    if (pick === 'corn') {
      spawnCornArc(x);
      return;
    }
    if (pick === 'knife') {
      const n = 2 + Math.floor(random() * 2);
      for (let i = 0; i < n; i += 1) {
        spawnHazard('knife', 150 + random() * 260 + i * 90);
      }
      knifeTimer = 1.4;
      return;
    }
    spawnHazard(pick, x);
    // The partner in a pair is always a low hay, never a copy of the first
    // obstacle: a tall partner (fence 74 px, oven 118 px) arriving 0.65 s
    // after the jump, when the arc is down to ~65 px, is uncleared by the
    // single jump and mistimes the double jump too. A hay (58 px) is
    // cleared by the same arc or by one well-timed air jump. The pair is
    // kept tight (110–140 px): a peak double jump lands at 1.00 s after
    // the first jump and the partner has fully passed by 0.98 s, so the
    // turkey never lands on its trailing edge.
    if (random() < 0.15) spawnHazard('hay', x + 110 + random() * 30);
    if (random() < 0.35) spawnCornArc(x + 40);
  }

  function playerRect() {
    const p = state.player;
    if (p.sliding) {
      // Sliding low: only the bottom 30 px of the turkey can be hit, so the
      // hanging pitchforks and pots pass overhead.
      return { x: p.x, y: FIELD.groundY - TURKEY.slideHeight, width: TURKEY.width, height: TURKEY.slideHeight };
    }
    // Standing or jumping: the box follows the turkey's real height — a jump
    // lifts it clear of the ground obstacles.
    return { x: p.x, y: p.y, width: TURKEY.width, height: TURKEY.height };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  /**
   * Advance the world one fixed step. `input` is { dir, jump, slide } where
   * jump is true only on the frame the button went down. `title` steps the
   * ambient world behind the title screen: it scrolls and spawns, but the
   * turkey cannot be hit and the farmer cannot catch it. Returns event flags.
   */
  function step(dt, input, title = false) {
    if (state.over) return 0;
    let events = 0;
    const p = state.player;
    state.time += dt;

    // Speed grows with distance; the score is distance plus pickups.
    state.speed = Math.min(TURKEY.maxSpeed, TURKEY.runSpeed + state.distanceM * TURKEY.speedPerMetre);
    state.distancePx += state.speed * dt;
    state.distanceM = state.distancePx / OBSTACLES.pxPerMetre;
    state.score = Math.floor(state.distanceM) + state.bonus;

    // The farmer recovers ground while the turkey runs clean, and closes in
    // after every hit. Close enough and he grabs the bird.
    if (state.time - lastHitAt > 2) {
      state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + FARMER.recoverPerSecond * dt);
    }
    if (state.farmerGap <= FARMER.closeWarn && !state.warned) {
      state.warned = true;
      events |= EVENT_WARN;
    }
    if (state.farmerGap > FARMER.closeWarn + 40) state.warned = false;
    if (!title && state.farmerGap <= 0) {
      state.over = 'caught';
      state.caughtReason = 'The farmer caught up with you!';
      return events | EVENT_OVER;
    }

    // Stages: the farmyard gives way to the barn, then the kitchen.
    if (state.stageIndex < STAGES.length - 1 && state.distanceM >= STAGES[state.stageIndex].until) {
      state.stageIndex += 1;
      state.stageName = STAGES[state.stageIndex].name;
      state.banner = { text: state.stageName, sub: state.stageIndex === 1 ? 'Dodge the pitchforks!' : 'Mind the oven — and the knives!', t: 2.2 };
      events |= EVENT_STAGE;
    }
    if (state.banner) {
      state.banner.t -= dt;
      if (state.banner.t <= 0) state.banner = null;
    }
    if (!title && state.distanceM >= ESCAPE_DISTANCE) {
      state.over = 'escaped';
      return events | EVENT_OVER | EVENT_ESCAPED;
    }

    // The turkey: steer, jump (twice), slide, land.
    p.x = Math.min(TURKEY.maxX, Math.max(TURKEY.minX, p.x + input.dir * TURKEY.moveSpeed * dt));
    p.sliding = input.slide && p.grounded;
    if (input.jump && (p.grounded || p.jumps < 2)) {
      p.vy = p.grounded ? TURKEY.jumpVelocity : TURKEY.doubleJumpVelocity;
      p.grounded = false;
      p.jumps += 1;
      p.sliding = false;
      burst(p.x + TURKEY.width / 2, FIELD.groundY, '#d8c9a8', 6, 160);
    }
    p.vy += TURKEY.gravity * dt;
    p.y += p.vy * dt;
    if (p.y >= FIELD.groundY - TURKEY.height) {
      if (!p.grounded && p.vy > 500) burst(p.x + TURKEY.width / 2, FIELD.groundY, '#d8c9a8', 5, 120);
      p.y = FIELD.groundY - TURKEY.height;
      p.vy = 0;
      p.grounded = true;
      p.jumps = 0;
    }
    if (p.invuln > 0) p.invuln -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);

    // Spawning.
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnPattern();
      const interval = Math.max(
        OBSTACLES.minInterval,
        OBSTACLES.baseInterval - (state.speed - TURKEY.runSpeed) * 0.0016,
      );
      spawnTimer = interval * (0.85 + random() * 0.3);
    }
    cornTimer -= dt;
    if (cornTimer <= 0) {
      const kind = random() < 0.12 ? 'feather' : random() < 0.3 ? 'pie' : 'corn';
      if (kind === 'corn') {
        for (let i = 0; i < 3; i += 1) spawnPickup('corn', FIELD.width + 40 + i * 34, FIELD.groundY - 60);
      } else {
        spawnPickup(kind, FIELD.width + 40, FIELD.groundY - 170);
      }
      cornTimer = PICKUPS.cornInterval * (0.8 + random() * 0.6);
    }
    if (knifeTimer > 0) knifeTimer -= dt;

    // Hazards move left with the world; knives fall, stick, then fade.
    const rect = playerRect();
    for (const h of hazards) {
      if (!h.active) continue;
      h.life += dt;
      h.x -= state.speed * dt;
      if (h.kind === 'knife') {
        if (h.y < FIELD.groundY - h.height) {
          h.y += h.vy * dt;
          if (h.y >= FIELD.groundY - h.height) {
            h.y = FIELD.groundY - h.height;
            burst(h.x + h.width / 2, FIELD.groundY, '#d7dce4', 5, 100);
          }
        } else if (h.life > 1.4) {
          h.active = false;
          continue;
        }
      }
      if (h.x + h.width < -80) {
        h.active = false;
        continue;
      }
      if (!h.passed && h.x + h.width < p.x) {
        h.passed = true;
        if (h.close && p.invuln <= 0) {
          state.bonus += SCORE.nearMiss;
          events |= EVENT_NEAR_MISS;
        }
      }
      if (!title && p.invuln <= 0 && overlaps(rect, h)) {
        state.lives -= 1;
        state.farmerGap -= FARMER.hitPenalty;
        lastHitAt = state.time;
        p.invuln = TURKEY.invulnerable;
        state.shake = 0.5;
        burst(p.x + TURKEY.width / 2, p.y + 20, '#e5534b', 12, 260);
        h.active = false;
        events |= EVENT_HIT;
        if (state.lives <= 0) {
          state.over = 'caught';
          state.caughtReason = 'Three hits — the farmer grabbed you!';
          return events | EVENT_OVER;
        }
      } else if (!h.passed) {
        const verticalGap = Math.min(
          Math.abs(h.y + h.height - rect.y),
          Math.abs(rect.y + rect.height - h.y),
        );
        if (verticalGap <= SCORE.nearMissPx && Math.abs(h.x - (rect.x + rect.width)) < 60) h.close = true;
      }
    }

    // Pickups drift left and bob; the turkey grabs them on touch.
    for (const pk of pickups) {
      if (!pk.active) continue;
      pk.t += dt * 4;
      pk.x -= state.speed * dt;
      if (pk.x < -60) {
        pk.active = false;
        continue;
      }
      const box = { x: pk.x - pk.size / 2, y: pk.y - pk.size / 2 + Math.sin(pk.t) * 4, width: pk.size, height: pk.size };
      if (overlaps(rect, box)) {
        pk.active = false;
        state.bonus += pk.points;
        burst(pk.x, pk.y, pk.kind === 'corn' ? '#f2c94c' : '#d96a3c', 8, 140);
        events |= pk.kind === 'corn' ? EVENT_PICKUP : EVENT_PIE;
      }
    }

    // Particles fade.
    for (const pt of particles) {
      if (!pt.active) continue;
      pt.life -= dt;
      pt.x += pt.vx * dt - state.speed * dt * 0.4;
      pt.y += pt.vy * dt;
      pt.vy += 600 * dt;
      if (pt.life <= 0 || pt.y > FIELD.groundY + 10) pt.active = false;
    }

    return events;
  }

  reset();
  return { state, reset, step, playerRect };
}
