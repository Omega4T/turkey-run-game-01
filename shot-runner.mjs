// Gobble Run — screenshot runner. Serves game/ on localhost, loads each
// ?shot= in headless Chrome, waits for the deterministic frame, captures a
// 1280x720 JPEG, and reports console errors and network requests (the game
// must make zero). Run: node shot-runner.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('/home/hatch/workspace/chrome/node_modules/puppeteer-core');

const SHOTS = JSON.parse(process.env.SHOTS || '["title","run","kitchen","escaped"]');
const OUT = process.env.OUT_DIR || '/home/hatch/workspace/makefun/turkey-run-game-01/screenshots';
const PORT = 18083;
const FILES = { title: '1-title.jpg', run: '2-run.jpg', kitchen: '3-kitchen.jpg', escaped: '4-escaped.jpg', caught: '4-caught.jpg' };

const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
  cwd: '/home/hatch/workspace/makefun/turkey-run-game-01',
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((r) => setTimeout(r, 1200));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  userDataDir: '/tmp/gobble-chrome-profile',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--window-size=1280,720', '--force-device-scale-factor=1'],
  env: { ...process.env, HOME: '/home/hatch/workspace/chrome/fakehome' },
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
const requests = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('request', (r) => requests.push(r.url()));

const results = {};
for (const shot of SHOTS) {
  await page.goto(`http://localhost:${PORT}/?shot=${shot}&seed=7`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => document.title === 'shot-ready', { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 400));
  const file = `${OUT}/${FILES[shot]}`;
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
  results[shot] = { file };
  console.log(shot, '->', file);
}
// Also load the plain game (no shot) to prove the live loop boots with no errors.
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 20000 });
await new Promise((r) => setTimeout(r, 2500));
console.log('live boot title:', await page.title());
await browser.close();
server.kill();
console.log('console errors:', JSON.stringify(errors));
console.log('network requests:', requests.length, requests.slice(0, 5));
console.log(JSON.stringify(results, null, 1));
