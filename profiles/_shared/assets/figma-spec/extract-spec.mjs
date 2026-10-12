#!/usr/bin/env node
// Extract a Figma build spec (and a reference screenshot) for each frame at its own viewport.
//
//   node extract-spec.mjs --base http://localhost:5173 --frames frames.json --out figma-spec [--tools <dir>] [--channel auto|msedge|chrome]
//   node extract-spec.mjs --url http://localhost:5173/frames/home --width 1440 --height 900 --name home --out figma-spec
//
// frames.json: [{ "slug": "home", "route": "/frames/home", "viewport": { "label": "Desktop 1440", "w": 1440, "h": 900 } }, ...]
// Each frame is opened at ITS OWN viewport width (never a fixed 1440), in capture mode (?capture=1), after
// fonts, images, scroll-triggered effects and animations have settled and a stability check has passed.
// Output per frame: <slug>@<w>.json (the spec), <slug>@<w>.png (full-page reference screenshot); plus index.json.
//
// Needs playwright-core (and uses the machine's Chrome or Edge, so no browser download).
// Default tools folder: ~/.claude/design-automation/tools/figma

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true'; args[k] = v; }
}
const toolsDir = args.tools || path.join(os.homedir(), '.claude', 'design-automation', 'tools', 'figma');
const outDir = path.resolve(args.out || 'figma-spec');
fs.mkdirSync(outDir, { recursive: true });

let chromium;
try {
  const req = createRequire(path.join(toolsDir, 'package.json'));
  ({ chromium } = req('playwright-core'));
} catch (e) {
  console.error('playwright-core not found in ' + toolsDir + '. Install it there first (npm install playwright-core pngjs pixelmatch).');
  process.exit(2);
}

const extractor = fs.readFileSync(path.join(HERE, 'spec-extractor.js'), 'utf8');

let frames;
if (args.frames) frames = JSON.parse(fs.readFileSync(args.frames, 'utf8'));
else if (args.url) frames = [{ slug: args.name || 'page', route: args.url, viewport: { label: 'Custom', w: +(args.width || 1440), h: +(args.height || 900) } }];
else { console.error('Give --frames <file> with --base, or --url.'); process.exit(2); }
const base = (args.base || '').replace(/\/$/, '');

async function launch() {
  const want = args.channel || 'auto';
  const order = want === 'auto' ? ['msedge', 'chrome', null] : [want];
  let last;
  for (const ch of order) {
    try { return await chromium.launch(ch ? { channel: ch, headless: true } : { headless: true }); } catch (e) { last = e; }
  }
  throw new Error('No Chrome or Edge could be launched: ' + (last && last.message));
}

const stability = () => {
  const out = [];
  document.querySelectorAll('body *').forEach((el, i) => {
    if (i > 2500) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    out.push([Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height), cs.opacity, cs.transform].join(','));
  });
  let h = 0; const s = out.join('|');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h + ':' + out.length;
};

const settle = async (page) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-capture') || document.documentElement.dataset.captureReady === 'true', null, { timeout: 30000 }).catch(() => {});
  // trigger lazy content and scroll effects, then return to the top
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += Math.max(200, innerHeight * 0.75)) { scrollTo(0, y); await new Promise(r => setTimeout(r, 350)); }
    scrollTo(0, document.documentElement.scrollHeight); await new Promise(r => setTimeout(r, 350));
    scrollTo(0, 0); await new Promise(r => setTimeout(r, 400));
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete && i.naturalWidth ? 0 : (i.decode ? i.decode().catch(() => {}) : 0)));
    document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} });
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  let prev = await page.evaluate(stability), stable = false;
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(600);
    const cur = await page.evaluate(stability);
    if (cur === prev) { stable = true; break; }
    prev = cur;
  }
  return stable;
};

const browser = await launch();
const index = { tool: 'extract-spec', created: new Date().toISOString(), frames: [] };
for (const f of frames) {
  const w = f.viewport.w, h = f.viewport.h || 900;
  const url = /^https?:/.test(f.route) ? f.route : base + f.route;
  const sep = url.includes('?') ? '&' : '?';
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const entry = { slug: f.slug, label: f.viewport.label, width: w, height: h, url };
  try {
    await page.goto(url + sep + 'capture=1', { waitUntil: 'networkidle', timeout: 60000 });
    entry.stable = await settle(page);
    const name = `${f.slug}@${w}`;
    await page.screenshot({ path: path.join(outDir, name + '.png'), fullPage: true });
    const spec = await page.evaluate(extractor);
    spec.frame = { slug: f.slug, label: f.viewport.label };
    fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(spec));
    Object.assign(entry, { spec: name + '.json', screenshot: name + '.png', page: spec.page, nodes: spec.nodes, fonts: spec.fonts, truncated: spec.truncated, ms: Date.now() - t0 });
  } catch (e) {
    entry.error = String(e && e.message || e);
  }
  index.frames.push(entry);
  await ctx.close();
}
await browser.close();

// union of fonts, for pinning in Figma
const fonts = {};
for (const e of index.frames) for (const fo of (e.fonts || [])) { const k = fo.family + '|' + fo.weight + '|' + fo.style; fonts[k] = fonts[k] || { ...fo, count: 0 }; fonts[k].count += fo.count; }
index.fonts = Object.values(fonts).sort((a, b) => b.count - a.count);
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
console.log(JSON.stringify({ out: outDir, frames: index.frames.map(e => ({ slug: e.slug, w: e.width, nodes: e.nodes, stable: e.stable, error: e.error })), fonts: index.fonts.map(f => `${f.family} ${f.weight}${f.style === 'italic' ? ' italic' : ''} x${f.count}${f.loaded === false ? ' NOT LOADED' : ''}`) }, null, 2));
