// Gobble Run — the entry program for make.fun turkey-run-game-01
// (Node 22, standard library only). It hands the game in: copy the
// repository's game/ and screenshots/ trees into the output directory and
// write /output/dossier.json with the kit's vendored buildDossier library,
// the summary the judge reads.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader runs it twice and requires both runs to produce identical
// bytes, so nothing here depends on time, randomness or environment.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const dossierPath = join(out, 'dossier.json');

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files, in
// all, or a path under game/ over 1000 bytes).
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Read the dossier back and print what was handed in, so a local run shows
// the entry is complete before it is bundled. This only writes to stdout;
// the output bytes are untouched, so the two grader runs stay identical.
const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
const gameFiles = readdirSync(join(out, 'game'), { recursive: true });
const gameBytes = gameFiles.reduce((n, f) => {
  const p = join(out, 'game', String(f));
  try { return n + (statSync(p).isFile() ? statSync(p).size : 0); } catch { return n; }
}, 0);
console.log(`gobble-run: ${gameFiles.length} game files, ${gameBytes} bytes; screenshots: ${(dossier.images ?? []).length} embedded, cover #${dossier.cover ?? '?'}; dossier ${statSync(dossierPath).size} bytes`);
