// Every pixel: the farmyard, the barn and the kitchen, the turkey, the
// farmer on its heels, the obstacles, the pickups and the HUD, plus the
// title, pause and end screens. All art is drawn vectors — no image files —
// in a fixed 1280x720 logical field the canvas scales to the window.
import { FIELD, PALETTE, FONT, STAGES, TURKEY } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const W = FIELD.width;
const H = FIELD.height;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 700) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;

  function frame(state) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (state.shake > 0) {
      const s = state.shake * 8;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
  }

  function drawSky(state) {
    const stage = STAGES[state.stageIndex];
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    grad.addColorStop(0, stage.sky);
    grad.addColorStop(1, stage.far);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, FIELD.groundY);
    if (state.stageIndex < 2) {
      // Sun and drifting clouds over the farm.
      ellipse(ctx, 1080, 90, 46, 46, PALETTE.sun);
      ctx.fillStyle = PALETTE.cloud;
      const cx = (state.distancePx * 0.05) % 1400;
      for (const [ox, oy, s] of [[-140, 70, 1], [420, 110, 0.8], [900, 60, 1.2]]) {
        const x = (((ox - cx) % 1400) + 1400) % 1400 - 60;
        ellipse(ctx, x, oy, 52 * s, 20 * s, PALETTE.cloud);
        ellipse(ctx, x + 34 * s, oy + 6, 40 * s, 16 * s, PALETTE.cloud);
      }
    } else {
      // Kitchen: a hanging lamp and a shelf of pots.
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(620, 0, 6, 90);
      ellipse(ctx, 623, 108, 54, 26, '#ffdf8a');
      ellipse(ctx, 623, 108, 34, 16, '#fff3c4');
      ctx.fillStyle = '#4a3220';
      for (let i = 0; i < 4; i += 1) {
        const x = 120 + i * 300;
        ctx.fillRect(x, 150, 90, 10);
        ellipse(ctx, x + 45, 175, 26, 18, '#6b4a35');
      }
    }
  }

  function drawFar(state) {
    const stage = STAGES[state.stageIndex];
    const off = (state.distancePx * 0.15) % 640;
    ctx.fillStyle = stage.far;
    for (let i = -1; i < 3; i += 1) {
      const x = i * 640 - off;
      ctx.beginPath();
      ctx.moveTo(x, FIELD.groundY);
      ctx.quadraticCurveTo(x + 160, FIELD.groundY - 130, x + 320, FIELD.groundY);
      ctx.quadraticCurveTo(x + 480, FIELD.groundY - 90, x + 640, FIELD.groundY);
      ctx.closePath();
      ctx.fill();
    }
    if (state.stageIndex === 1) {
      // The barn itself, standing in the middle distance.
      const bx = 760 - ((state.distancePx * 0.15) % 2560);
      ctx.fillStyle = '#a83c2e';
      ctx.fillRect(bx, FIELD.groundY - 190, 220, 190);
      ctx.beginPath();
      ctx.moveTo(bx - 14, FIELD.groundY - 190);
      ctx.lineTo(bx + 110, FIELD.groundY - 260);
      ctx.lineTo(bx + 234, FIELD.groundY - 190);
      ctx.closePath();
      ctx.fillStyle = '#7a2a20';
      ctx.fill();
      ctx.fillStyle = '#5a2018';
      ctx.fillRect(bx + 80, FIELD.groundY - 110, 60, 110);
      ctx.strokeStyle = '#e8d5a8';
      ctx.lineWidth = 4;
      ctx.strokeRect(bx + 80, FIELD.groundY - 110, 60, 110);
    }
  }

  function drawMid(state) {
    const off = (state.distancePx * 0.4) % 320;
    if (state.stageIndex < 2) {
      // Fence posts and trees scrolling past.
      ctx.fillStyle = PALETTE.fence;
      for (let i = -1; i < 6; i += 1) {
        const x = i * 320 - off;
        ctx.fillRect(x, FIELD.groundY - 64, 10, 64);
        ctx.fillRect(x + 10, FIELD.groundY - 56, 300, 8);
        ctx.fillRect(x + 10, FIELD.groundY - 36, 300, 8);
      }
      for (let i = -1; i < 4; i += 1) {
        const x = i * 460 - ((state.distancePx * 0.3) % 460) + 200;
        ctx.fillStyle = PALETTE.treeTrunk;
        ctx.fillRect(x - 8, FIELD.groundY - 90, 16, 90);
        ellipse(ctx, x, FIELD.groundY - 120, 52, 44, PALETTE.tree);
        ellipse(ctx, x - 30, FIELD.groundY - 96, 30, 24, PALETTE.tree);
        ellipse(ctx, x + 30, FIELD.groundY - 96, 30, 24, PALETTE.tree);
      }
    } else {
      // Kitchen: tiled wall band and a long counter.
      ctx.fillStyle = '#e8dcc8';
      ctx.fillRect(0, FIELD.groundY - 150, W, 150);
      ctx.strokeStyle = '#c9b896';
      ctx.lineWidth = 2;
      for (let x = 0; x < W; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, FIELD.groundY - 150);
        ctx.lineTo(x, FIELD.groundY);
        ctx.stroke();
      }
      for (let y = FIELD.groundY - 150; y < FIELD.groundY; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }
  }

  function drawGround(state) {
    const stage = STAGES[state.stageIndex];
    ctx.fillStyle = stage.ground;
    ctx.fillRect(0, FIELD.groundY, W, H - FIELD.groundY);
    ctx.fillStyle = stage.grass;
    ctx.fillRect(0, FIELD.groundY, W, 14);
    // Dirt patches / floorboards scrolling with the world.
    const off = state.distancePx % 180;
    ctx.fillStyle = stage === STAGES[2] ? '#5a3a26' : PALETTE.dirt;
    for (let i = -1; i < 9; i += 1) {
      const x = i * 180 - off;
      if (state.stageIndex === 2) ctx.fillRect(x, FIELD.groundY + 30, 4, H - FIELD.groundY - 30);
      else ellipse(ctx, x + 60, FIELD.groundY + 52, 34, 10, PALETTE.dirt);
    }
  }

  function drawTurkey(state, x, y, opts = {}) {
    const { sliding = false, airborne = false, blink = false, big = false } = opts;
    const s = big ? 1.6 : 1;
    if (blink && Math.floor(state.time * 14) % 2 === 0) return;
    const runPhase = state.time * 14;
    const bob = state.player.grounded && !sliding ? Math.sin(runPhase) * 3 : 0;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(s, s);
    // Fanned tail.
    const tailColors = PALETTE.tail;
    for (let i = 0; i < 5; i += 1) {
      const angle = -Math.PI / 2 + (i - 2) * 0.36;
      ctx.save();
      ctx.translate(-26, -26);
      ctx.rotate(angle);
      ellipse(ctx, 0, -26, 9, 26, tailColors[i % tailColors.length]);
      ctx.restore();
    }
    // Body.
    ellipse(ctx, 0, -26, 34, 26, PALETTE.turkeyBody);
    ellipse(ctx, 6, -20, 24, 18, PALETTE.turkeyDark);
    // Wing, flapping while running.
    const flap = airborne ? -0.9 : Math.sin(runPhase) * 0.35 - 0.2;
    ctx.save();
    ctx.translate(-4, -26);
    ctx.rotate(flap);
    ellipse(ctx, -6, 0, 20, 11, PALETTE.turkeyDark);
    ctx.restore();
    // Legs.
    ctx.strokeStyle = '#f2a93b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    if (airborne) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-14, 6);
      ctx.moveTo(8, -4);
      ctx.lineTo(14, 6);
      ctx.stroke();
    } else if (sliding) {
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(22, 2);
      ctx.moveTo(6, -4);
      ctx.lineTo(26, 2);
      ctx.stroke();
    } else {
      const a = Math.sin(runPhase) * 10;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 + a, 2);
      ctx.moveTo(8, -4);
      ctx.lineTo(8 - a, 2);
      ctx.stroke();
    }
    // Head, beak, wattle, eye.
    const hx = sliding ? 26 : 24;
    const hy = sliding ? -34 : -52;
    ellipse(ctx, hx, hy, 13, 13, PALETTE.head);
    ctx.fillStyle = PALETTE.beak;
    ctx.beginPath();
    ctx.moveTo(hx + 10, hy - 2);
    ctx.lineTo(hx + 24, hy + 3);
    ctx.lineTo(hx + 10, hy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.wattle;
    ctx.beginPath();
    ctx.moveTo(hx + 4, hy + 6);
    ctx.quadraticCurveTo(hx + 12, hy + 20, hx + 2, hy + 18);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, hx + 5, hy - 4, 2.5, 2.5, PALETTE.eye);
    ctx.restore();
  }

  function drawFarmer(state) {
    const gap = state.farmerGap;
    const fx = state.player.x - gap - 60;
    if (fx < -140) return;
    const runPhase = state.time * 12;
    const bob = Math.abs(Math.sin(runPhase)) * 4;
    ctx.save();
    ctx.translate(fx, FIELD.groundY - bob);
    // Legs pumping.
    ctx.strokeStyle = PALETTE.farmerPants;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    const a = Math.sin(runPhase) * 14;
    ctx.beginPath();
    ctx.moveTo(-6, -58);
    ctx.lineTo(-6 + a, 0);
    ctx.moveTo(6, -58);
    ctx.lineTo(6 - a, 0);
    ctx.stroke();
    // Body: blue shirt, apron.
    ctx.fillStyle = PALETTE.farmerShirt;
    rr(ctx, -22, -118, 44, 62, 12);
    ctx.fill();
    ctx.fillStyle = '#f2ead8';
    ctx.fillRect(-14, -116, 28, 58);
    // Arms reaching forward.
    ctx.strokeStyle = PALETTE.farmerShirt;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(14, -104);
    ctx.lineTo(38 + Math.sin(runPhase) * 6, -88);
    ctx.moveTo(14, -92);
    ctx.lineTo(36 - Math.sin(runPhase) * 6, -78);
    ctx.stroke();
    // Head + straw hat + moustache.
    ellipse(ctx, 0, -132, 15, 15, PALETTE.farmerSkin);
    ctx.fillStyle = PALETTE.farmerHat;
    ellipse(ctx, 0, -142, 26, 7, PALETTE.farmerHat);
    rr(ctx, -13, -158, 26, 12, 5);
    ctx.fill();
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(-8, -128, 16, 5);
    ctx.restore();
    // "!" when he is close enough to smell the stuffing.
    if (gap <= 110) {
      text(ctx, '!', fx + 70, FIELD.groundY - 170, 44, PALETTE.danger, 'center', 900);
    }
  }

  function drawHazard(h) {
    const { x, y, width, height, kind } = h;
    if (kind === 'hay') {
      ctx.fillStyle = '#d9a441';
      ctx.beginPath();
      ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a87c22';
      ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, width / 2 - 8, -0.6 + i * 0.3, -0.2 + i * 0.3);
        ctx.stroke();
      }
    } else if (kind === 'fence') {
      ctx.fillStyle = '#8a5a30';
      ctx.fillRect(x, y, 10, height);
      ctx.fillRect(x + width - 10, y, 10, height);
      ctx.fillRect(x, y + 8, width, 10);
      ctx.fillRect(x, y + height / 2, width, 10);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10, y - 8);
      ctx.lineTo(x + 20, y);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + width - 20, y);
      ctx.lineTo(x + width - 10, y - 8);
      ctx.lineTo(x + width, y);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'crate') {
      ctx.fillStyle = '#a8763e';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#7a5222';
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      ctx.moveTo(x + width, y);
      ctx.lineTo(x, y + height);
      ctx.stroke();
    } else if (kind === 'pitchfork') {
      ctx.strokeStyle = '#8a8f96';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y - 30);
      ctx.lineTo(x + width / 2, y + height);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 3; i += 1) {
        const tx = x + 8 + i * (width - 16) / 2;
        ctx.moveTo(tx, y + height);
        ctx.lineTo(tx, y + height + 16);
      }
      ctx.stroke();
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(x + width / 2 - 4, y - 34, 8, 12);
    } else if (kind === 'oven') {
      ctx.fillStyle = PALETTE.oven;
      rr(ctx, x, y, width, height, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.ovenDoor;
      rr(ctx, x + 12, y + 34, width - 24, height - 46, 6);
      ctx.fill();
      // Fire glow in the door window.
      ctx.fillStyle = PALETTE.ovenFire;
      rr(ctx, x + 22, y + 48, width - 44, 26, 4);
      ctx.fill();
      ctx.fillStyle = '#2e2e38';
      ctx.fillRect(x + width / 2 - 6, y - 26, 12, 28);
      ctx.fillStyle = '#c9ced6';
      ctx.fillRect(x + 14, y + 12, width - 28, 8);
      // Heat shimmer marks.
      ctx.strokeStyle = 'rgba(255, 154, 60, 0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + 20 + i * 28, y - 4);
        ctx.quadraticCurveTo(x + 26 + i * 28, y - 14, x + 20 + i * 28, y - 22);
        ctx.stroke();
      }
    } else if (kind === 'pot') {
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y - 34);
      ctx.lineTo(x + width / 2, y);
      ctx.stroke();
      ctx.fillStyle = '#4a4a55';
      ellipse(ctx, x + width / 2, y + height / 2, width / 2, height / 2, '#4a4a55');
      ctx.fillStyle = '#2e2e38';
      ellipse(ctx, x + width / 2, y + 6, width / 2 - 8, 6, '#2e2e38');
    } else if (kind === 'knife') {
      const stuck = y >= FIELD.groundY - height;
      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      if (!stuck) ctx.rotate(0.5);
      ctx.fillStyle = PALETTE.knifeBlade;
      ctx.beginPath();
      ctx.moveTo(-6, -height / 2);
      ctx.lineTo(6, -height / 2 + 10);
      ctx.lineTo(4, height / 2 - 14);
      ctx.lineTo(-4, height / 2 - 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.knifeHandle;
      rr(ctx, -5, height / 2 - 16, 10, 18, 4);
      ctx.fill();
      ctx.restore();
      if (!stuck) {
        // Telegraph shadow where it will land.
        ctx.fillStyle = 'rgba(229, 83, 75, 0.35)';
        ellipse(ctx, x + width / 2, FIELD.groundY + 6, 22, 6, 'rgba(229, 83, 75, 0.35)');
      }
    }
  }

  function drawPickup(pk) {
    const bob = Math.sin(pk.t) * 4;
    const x = pk.x;
    const y = pk.y + bob;
    if (pk.kind === 'corn') {
      ctx.fillStyle = PALETTE.corn;
      ellipse(ctx, x, y, 10, 15, PALETTE.corn);
      ctx.strokeStyle = '#d9a441';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + i * 5, y - 12);
        ctx.lineTo(x + i * 5, y + 12);
        ctx.stroke();
      }
      ctx.fillStyle = '#7fae4c';
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 10);
      ctx.lineTo(x - 16, y + 22);
      ctx.lineTo(x - 2, y + 16);
      ctx.closePath();
      ctx.fill();
    } else if (pk.kind === 'pie') {
      ctx.fillStyle = PALETTE.pie;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 18, y + 8);
      ctx.lineTo(x - 2, y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2ead8';
      ctx.fillRect(x - 2, y + 14, 20, 5);
      ellipse(ctx, x + 8, y + 4, 3, 3, '#e5534b');
    } else {
      // Golden feather.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.6 + Math.sin(pk.t) * 0.15);
      ctx.fillStyle = PALETTE.feather;
      ellipse(ctx, 0, 0, 6, 18, PALETTE.feather);
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(0, 18);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      if (!pt.active) continue;
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    // Top bar.
    ctx.fillStyle = PALETTE.panel;
    rr(ctx, 16, 14, 340, 74, 12);
    ctx.fill();
    text(ctx, `SCORE ${state.score}`, 32, 48, 30, PALETTE.text);
    text(ctx, `${Math.floor(state.distanceM)} m  ·  ${state.stageName}`, 32, 74, 16, PALETTE.muted);
    // Progress to the escape.
    const prog = Math.min(1, state.distanceM / 1500);
    ctx.fillStyle = 'rgba(40, 26, 12, 0.82)';
    rr(ctx, 372, 14, 536, 74, 12);
    ctx.fill();
    text(ctx, 'ESCAPE', 388, 40, 13, PALETTE.muted);
    text(ctx, `${Math.floor(prog * 100)}%`, 640, 40, 13, PALETTE.text, 'center');
    ctx.fillStyle = '#5a4632';
    rr(ctx, 388, 50, 504, 14, 7);
    ctx.fill();
    ctx.fillStyle = PALETTE.good;
    rr(ctx, 388, 50, Math.max(14, 504 * prog), 14, 7);
    ctx.fill();
    text(ctx, '1500 m', 892, 40, 13, PALETTE.muted, 'right');
    // Lives + best.
    ctx.fillStyle = PALETTE.panel;
    rr(ctx, 924, 14, 340, 74, 12);
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      const hx = 950 + i * 34;
      const hy = 52;
      ctx.fillStyle = i < state.lives ? '#e5534b' : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 8);
      ctx.bezierCurveTo(hx - 12, hy - 4, hx - 6, hy - 14, hx, hy - 6);
      ctx.bezierCurveTo(hx + 6, hy - 14, hx + 12, hy - 4, hx, hy + 8);
      ctx.fill();
    }
    text(ctx, `BEST ${Math.max(best, state.score)}`, 1064, 58, 18, PALETTE.text, 'left');
    // Farmer gap meter, bottom-left: how close the farmer is.
    const gapFrac = 1 - state.farmerGap / 300;
    ctx.fillStyle = PALETTE.panel;
    rr(ctx, 16, H - 56, 300, 40, 10);
    ctx.fill();
    text(ctx, 'FARMER', 28, H - 30, 13, PALETTE.muted);
    ctx.fillStyle = '#5a4632';
    rr(ctx, 108, H - 44, 180, 14, 7);
    ctx.fill();
    ctx.fillStyle = gapFrac > 0.7 ? PALETTE.danger : gapFrac > 0.45 ? '#f2a93b' : PALETTE.good;
    rr(ctx, 108, H - 44, Math.max(8, 180 * gapFrac), 14, 7);
    ctx.fill();
    // Controls hint during the first seconds of a run.
    if (state.time < 6 && state.time > 0) {
      text(ctx, 'SPACE jump ×2  ·  ↓ slide  ·  ← → dodge  ·  P pause', W / 2, H - 24, 16, PALETTE.text, 'center');
    }
  }

  function drawBanner(state) {
    if (!state.banner) return;
    const alpha = Math.min(1, state.banner.t);
    ctx.globalAlpha = alpha;
    text(ctx, state.banner.text, W / 2, 220, 52, PALETTE.text, 'center', 900);
    text(ctx, state.banner.sub, W / 2, 256, 22, PALETTE.muted, 'center');
    ctx.globalAlpha = 1;
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(30, 18, 8, 0.55)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'GOBBLE RUN', W / 2, 150, 96, PALETTE.text, 'center', 900);
    text(ctx, 'THE GREAT TURKEY ESCAPE', W / 2, 196, 28, '#f2c94c', 'center', 800);
    // The turkey and its pursuer stand clear of the instructions panel.
    drawTurkey({ ...state, time: state.time }, 200, 480, { big: true, airborne: false });
    drawFarmer({ ...state, farmerGap: 120, player: { ...state.player, x: 200 } });
    text(ctx, 'Thanksgiving is coming. The farmer is coming faster.', W / 2, 300, 22, PALETTE.text, 'center');
    text(ctx, 'Outrun him 1500 m — farmyard, barn, kitchen — and dodge the oven and the knives.', W / 2, 332, 18, PALETTE.muted, 'center');
    ctx.fillStyle = PALETTE.panel;
    rr(ctx, W / 2 - 330, 380, 660, 132, 14);
    ctx.fill();
    text(ctx, 'SPACE / ↑ / W  jump (twice)      ↓ / S  slide', W / 2, 424, 20, PALETTE.text, 'center');
    text(ctx, '← / →  dodge      P  pause      click works too', W / 2, 456, 20, PALETTE.text, 'center');
    text(ctx, 'Corn +10  ·  pie +25  ·  golden feather +50  ·  close call +5', W / 2, 488, 18, PALETTE.muted, 'center');
    const pulse = 0.65 + Math.sin(state.time * 4) * 0.35;
    ctx.globalAlpha = pulse;
    text(ctx, 'PRESS SPACE OR CLICK TO RUN', W / 2, 580, 30, '#f2c94c', 'center', 900);
    ctx.globalAlpha = 1;
    if (best > 0) text(ctx, `BEST ${best}`, W / 2, 626, 20, PALETTE.text, 'center');
  }

  function drawOver(state, best) {
    const escaped = state.over === 'escaped';
    ctx.fillStyle = escaped ? 'rgba(20, 40, 16, 0.6)' : 'rgba(40, 10, 8, 0.6)';
    ctx.fillRect(0, 0, W, H);
    // The panel holds the text only; the turkey and the farmer stand on the
    // ground below it, so the art never covers a line.
    ctx.fillStyle = PALETTE.panel;
    rr(ctx, W / 2 - 380, 120, 760, 350, 18);
    ctx.fill();
    if (escaped) {
      text(ctx, 'ESCAPED!', W / 2, 200, 72, '#7fc95e', 'center', 900);
      text(ctx, 'You made it past the kitchen. Happy Thanksgiving —', W / 2, 248, 22, PALETTE.text, 'center');
      text(ctx, 'somewhere far, far away from the dinner table.', W / 2, 276, 22, PALETTE.text, 'center');
    } else {
      text(ctx, 'CAUGHT!', W / 2, 200, 72, PALETTE.danger, 'center', 900);
      text(ctx, state.caughtReason || 'The farmer got you.', W / 2, 248, 22, PALETTE.text, 'center');
      text(ctx, 'Thanksgiving dinner is served… almost. Run again!', W / 2, 276, 22, PALETTE.muted, 'center');
    }
    text(ctx, `SCORE ${state.score}    DISTANCE ${Math.floor(state.distanceM)} m`, W / 2, 348, 24, PALETTE.text, 'center');
    text(ctx, `BEST ${Math.max(best, state.score)}`, W / 2, 382, 20, PALETTE.muted, 'center');
    const pulse = 0.65 + Math.sin(state.time * 4) * 0.35;
    ctx.globalAlpha = pulse;
    text(ctx, 'PRESS SPACE OR CLICK TO RUN AGAIN', W / 2, 428, 26, '#f2c94c', 'center', 900);
    ctx.globalAlpha = 1;
    if (escaped) {
      drawTurkey({ ...state, time: state.time }, W / 2, 600, { big: true });
    } else {
      drawFarmer({ ...state, farmerGap: 60, player: { ...state.player, x: 550 } });
      drawTurkey({ ...state, time: state.time }, 760, 620, { big: false });
    }
  }

  function draw(state, screen, best) {
    frame(state);
    drawSky(state);
    drawFar(state);
    drawMid(state);
    drawGround(state);
    for (const h of state.hazards) if (h.active) drawHazard(h);
    for (const pk of state.pickups) if (pk.active) drawPickup(pk);
    drawParticles(state);
    // The turkey and the farmer are drawn only while playing — the title
    // and the end screens paint their own art, and drawing the world pair
    // underneath put a second turkey (and a second farmer) on screen.
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawFarmer(state);
      const p = state.player;
      // Feet at the turkey's real height: a jump lifts the drawing off the
      // ground, a slide keeps it low.
      drawTurkey(state, p.x + TURKEY.width / 2, p.y + TURKEY.height, {
        sliding: p.sliding,
        airborne: !p.grounded,
        blink: p.invuln > 0,
      });
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawBanner(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(30, 18, 8, 0.55)';
      ctx.fillRect(0, 0, W, H);
      text(ctx, 'PAUSED', W / 2, 330, 64, PALETTE.text, 'center', 900);
      text(ctx, 'Press P or click to keep running', W / 2, 380, 22, PALETTE.muted, 'center');
    } else if (screen === SCREEN_OVER) drawOver(state, best);
  }

  return { draw };
}
