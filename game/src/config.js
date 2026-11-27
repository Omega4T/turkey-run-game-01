// Gobble Run — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** The run ends in an escape at this distance (metres). */
export const ESCAPE_DISTANCE = 1500;

/** Stage boundaries in metres: farmyard, then the barn, then the kitchen. */
export const STAGES = [
  { name: 'THE FARMYARD', until: 500, sky: '#f7c873', far: '#e8a85c', ground: '#b97e3f', grass: '#7fae4c' },
  { name: 'THE BARN', until: 1000, sky: '#e8b25e', far: '#a86a3c', ground: '#8a5a30', grass: '#6f8f3e' },
  { name: 'THE KITCHEN', until: Infinity, sky: '#d98a4a', far: '#7a4a2e', ground: '#6b4a35', grass: '#8a6a45' },
];

export const TURKEY = {
  x: 220,
  minX: 130,
  maxX: 400,
  width: 64,
  height: 58,
  slideHeight: 30,
  runSpeed: 380,
  maxSpeed: 640,
  speedPerMetre: 0.17,
  moveSpeed: 420,
  gravity: 2600,
  jumpVelocity: -950,
  // A modest second jump: -820 kept the turkey airborne 0.79 s from the
  // peak, longer than the 0.84 s spawn gap, so it kept landing on the next
  // obstacle; -650 lands just after a pair partner clears.
  doubleJumpVelocity: -650,
  invulnerable: 1.5,
};

export const FARMER = {
  startGap: 260,
  maxGap: 300,
  recoverPerSecond: 10,
  hitPenalty: 90,
  closeWarn: 90,
};

export const LIVES = 3;

export const OBSTACLES = {
  /** Seconds between spawn attempts at speed 0, shrinking as the run speeds up.
   * 1.25 s early (about one obstacle a second, room to land and re-jump)
   * down to ~0.83 s at top speed. The old 0.95 s base put an obstacle
   * every 0.75 s on average — faster than the double jump's 1.06 s
   * airtime, so the turkey kept landing on the next one. */
  baseInterval: 1.25,
  minInterval: 0.65,
  /** px per metre of distance, for the score and the HUD. */
  pxPerMetre: 50,
  hay: { width: 64, height: 58, kind: 'hay' },
  fence: { width: 56, height: 74, kind: 'fence' },
  crate: { width: 62, height: 62, kind: 'crate' },
  pitchfork: { width: 70, height: 46, hangY: 78, kind: 'pitchfork' },
  oven: { width: 96, height: 118, kind: 'oven' },
  pot: { width: 78, height: 44, hangY: 88, kind: 'pot' },
  knife: { width: 26, height: 64, fallSpeed: 520, kind: 'knife' },
};

export const PICKUPS = {
  corn: { size: 26, points: 10 },
  pie: { size: 30, points: 25 },
  feather: { size: 28, points: 50 },
  cornInterval: 1.7,
};

export const SCORE = {
  nearMiss: 5,
  nearMissPx: 26,
};

/** How many obstacles / pickups / particles can exist at once; pools are allocated once. */
export const POOL_SIZE = 96;

export const PALETTE = {
  sky: '#f7c873',
  sun: '#fff3c4',
  cloud: '#fff8e0',
  hill: '#e8a85c',
  tree: '#5d7d33',
  treeTrunk: '#7a4a26',
  fence: '#8a5a30',
  ground: '#b97e3f',
  grass: '#7fae4c',
  dirt: '#9c6b34',
  turkeyBody: '#8a5230',
  turkeyDark: '#6b3d22',
  tail: ['#a0522d', '#d2691e', '#e8a33c', '#c96a2e'],
  head: '#dfe6f2',
  beak: '#f2a93b',
  wattle: '#e5534b',
  eye: '#1c1c22',
  farmerShirt: '#3e6fb0',
  farmerPants: '#5a4632',
  farmerSkin: '#e8b88a',
  farmerHat: '#c9a227',
  oven: '#4a4a55',
  ovenDoor: '#2e2e38',
  ovenFire: '#ff9a3c',
  knifeBlade: '#d7dce4',
  knifeHandle: '#3a2a1a',
  corn: '#f2c94c',
  pie: '#d96a3c',
  feather: '#f7ead0',
  panel: 'rgba(40, 26, 12, 0.82)',
  text: '#fff6e0',
  muted: '#e8d5a8',
  danger: '#e5534b',
  good: '#7fc95e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-run.best';
