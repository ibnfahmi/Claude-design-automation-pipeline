#!/usr/bin/env node
// Compare a reference screenshot (from the running app) with a screenshot of the Figma frame.
//   node compare-shots.mjs --a reference.png --b figma.png [--out diff.png] [--tools <dir>] [--grid 12x8] [--threshold 0.1]
// Prints JSON: { size, diffPercent, worst: [{ x, y, w, h, diffPercent }], diffImage }.
// The two images are compared at the same size: the larger is cropped to the smaller's top-left if they differ by a few pixels,
// and if the sizes differ a lot the result says so (sizeMismatch) so the caller can fix the frame size first.
// Needs pngjs and pixelmatch in the tools folder (default ~/.claude/design-automation/tools/figma).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true'; } }
if (!args.a || !args.b) { console.error('Usage: compare-shots.mjs --a reference.png --b figma.png [--out diff.png]'); process.exit(2); }
const toolsDir = args.tools || path.join(os.homedir(), '.claude', 'design-automation', 'tools', 'figma');
const req = createRequire(path.join(toolsDir, 'package.json'));
let PNG, pixelmatch;
try {
  ({ PNG } = req('pngjs'));
  const pm = await import(pathToFileURL(req.resolve('pixelmatch')).href); pixelmatch = pm.default || pm;
} catch (e) { console.error('pngjs and pixelmatch are needed in ' + toolsDir + ' (npm install pngjs pixelmatch).'); process.exit(2); }

const A = PNG.sync.read(fs.readFileSync(args.a)), B = PNG.sync.read(fs.readFileSync(args.b));
const sizeMismatch = Math.abs(A.width - B.width) > 8 || Math.abs(A.height - B.height) > 8;
const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
const crop = (img) => { if (img.width === w && img.height === h) return img.data; const out = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) img.data.copy(out, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4); return out; };
const da = crop(A), db = crop(B);
const diff = new PNG({ width: w, height: h });
const n = pixelmatch(da, db, diff.data, w, h, { threshold: +(args.threshold || 0.1), includeAA: false });
const [gx, gy] = (args.grid || '12x8').split('x').map(Number);
const cells = [];
const cw = Math.ceil(w / gx), ch = Math.ceil(h / gy);
for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
  let bad = 0, tot = 0;
  for (let y = j * ch; y < Math.min(h, (j + 1) * ch); y++) for (let x = i * cw; x < Math.min(w, (i + 1) * cw); x++) { tot++; const k = (y * w + x) * 4; if (diff.data[k] === 255 && diff.data[k + 1] === 0 && diff.data[k + 2] === 0) bad++; }
  if (tot) cells.push({ x: i * cw, y: j * ch, w: Math.min(cw, w - i * cw), h: Math.min(ch, h - j * ch), diffPercent: Math.round(bad / tot * 1000) / 10 });
}
cells.sort((p, q) => q.diffPercent - p.diffPercent);
let diffImage = null;
if (args.out) { fs.writeFileSync(args.out, PNG.sync.write(diff)); diffImage = path.resolve(args.out); }
console.log(JSON.stringify({ size: { reference: [A.width, A.height], figma: [B.width, B.height], compared: [w, h] }, sizeMismatch, diffPercent: Math.round(n / (w * h) * 10000) / 100, worst: cells.filter(c => c.diffPercent > 0).slice(0, 6), diffImage }, null, 2));
