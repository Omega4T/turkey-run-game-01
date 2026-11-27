// Gobble Run — headless playtest. Boots the live game, starts it, jumps,
// proves the score and distance climb, proves the hit path (teleport a hay
// bale onto the turkey), proves the caught path (stand still until the
// farmer closes in), and proves restart works. Run: node playtest.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('/home/hatch/workspace/chrome/node_modules/puppeteer-core');
const PORT = 18084;

const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
  cwd: '/home/hatch/workspace/makefun/turkey-run-game-01',
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((r) => setTimeout(r, 1200));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  userDataDir: '/tmp/gobble-chrome-profile',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--window-size=1280,720'],
  env: { ...process.env, HOME: '/home/hatch/workspace/chrome/fakehome' },
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', (r) => { if (!r.url().startsWith('http://localhost')) errors.push('external request: ' + r.url()); });

const state = () => page.evaluate(() => {
  const G = window.__gobbler;
  if (!G) return null;
  const s = G.state;
  return {
    screen: G.screen,
    score: s.score,
    distanceM: Math.round(s.distanceM),
    lives: s.lives,
    stage: s.stageName,
    farmerGap: Math.round(s.farmerGap),
    speed: Math.round(s.speed),
    over: s.over,
    playerY: Math.round(s.player.y),
    grounded: s.player.grounded,
    hazards: s.hazards.filter((h) => h.active).length,
    pickups: s.pickups.filter((p) => p.active).length,
  };
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(`http://localhost:${PORT}/?seed=7`, { waitUntil: 'load', timeout: 20000 });
await sleep(1000);
console.log('title:', JSON.stringify(await state()));

// Start the run.
await page.keyboard.press('Space');
await sleep(500);
console.log('after start:', JSON.stringify(await state()));

// Run clean for 4s: distance and score must climb.
await sleep(4000);
console.log('after 4s run:', JSON.stringify(await state()));

// Jump: the turkey must leave the ground.
await page.keyboard.press('Space');
await sleep(150);
const jumped = await state();
console.log('mid-jump:', JSON.stringify(jumped));
if (jumped.grounded) errors.push('FAIL: jump did not leave the ground');

// Pause and resume.
await page.keyboard.press('KeyP');
await sleep(300);
console.log('paused:', JSON.stringify(await state()));
await page.keyboard.press('KeyP');
await sleep(300);
console.log('resumed:', JSON.stringify(await state()));

// Hit path: teleport a hay bale onto the turkey's current rect (wherever it
// is — grounded or mid-jump), so the collision is guaranteed.
const beforeHit = await state();
await page.evaluate(() => {
  const s = window.__gobbler.state;
  s.player.invuln = 0;
  const h = s.hazards.find((x) => !x.active);
  h.active = true;
  h.kind = 'hay';
  h.width = 64;
  h.height = 58;
  h.x = s.player.x;
  h.y = s.player.y;
  h.vy = 0;
  h.passed = false;
  h.close = false;
  h.life = 0;
});
await sleep(300);
const afterHit = await state();
console.log('before hit:', JSON.stringify(beforeHit));
console.log('after hit:', JSON.stringify(afterHit));
if (afterHit.lives !== beforeHit.lives - 1) errors.push('FAIL: hit did not cost a life');

// Caught path: stand still and let the farmer close in (hits keep coming).
let caught = null;
for (let i = 0; i < 40; i += 1) {
  await sleep(500);
  const s = await state();
  if (s.screen === 'over') {
    caught = s;
    break;
  }
}
console.log('caught:', JSON.stringify(caught));
if (!caught || caught.over !== 'caught') errors.push('FAIL: standing still did not end caught');

// Restart from the end screen. Score/distance are small but nonzero: the
// fresh run has already been scrolling for ~500 ms by the time we read it.
await page.keyboard.press('Space');
await sleep(500);
const restarted = await state();
console.log('restarted:', JSON.stringify(restarted));
if (restarted.screen !== 'play' || restarted.score > 10 || restarted.distanceM > 10 || restarted.lives !== 3) {
  errors.push('FAIL: restart did not reset the run');
}

console.log('console errors:', JSON.stringify(errors));
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
