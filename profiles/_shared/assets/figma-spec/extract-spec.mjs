#!/usr/bin/env node
// Extract a Figma build spec (and a reference screenshot) for each frame at its own viewport.
//
//   node extract-spec.mjs --base http://localhost:5173 --frames frames.json --out figma-spec [--tools <dir>] [--channel auto|msedge|chrome]
//   node extract-spec.mjs --url http://localhost:5173/frames/home --width 1440 --height 900 --name home --out figma-spec
//
// frames.json (optional "steps": [{"click": "#open"}, ...] to reach a state by interaction, optional "lang": "ar" opens ?lang=ar, optional "local": {"key": "value"} sets localStorage before the page loads): [{ "slug": "home", "route": "/frames/home", "viewport": { "label": "Desktop 1440", "w": 1440, "h": 900 } }, ...]
// Each frame is opened at ITS OWN viewport width (never a fixed 1440), in capture mode (?capture=1), after
// fonts, images, scroll-triggered effects and animations have settled and a stability check has passed.
// Output per frame: <slug>@<w>.json (the spec), <slug>@<w>.png (full-page reference screenshot); plus index.json.
//
// Needs playwright-core (and uses the machine's Chrome or Edge, so no browser download).
// Default tools folder: ~/.claude/design-pipeline/tools/figma

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
const toolsDir = args.tools || path.join(os.homedir(), '.claude', 'design-pipeline', 'tools', 'figma');
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
    for (let y = 0; y < h; y += Math.max(200, innerHeight * 0.75)) { scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); }
    scrollTo(0, document.documentElement.scrollHeight); await new Promise(r => setTimeout(r, 300));
    scrollTo(0, 0); await new Promise(r => setTimeout(r, 400));
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    // only pictures that have a source, and never wait on one for long: decode() on a lazy image with no source stalls and can crash the page
    const limit = (pr) => Promise.race([pr, new Promise(r => setTimeout(r, 4000))]);
    await Promise.all([...document.images].map(i => i.complete && i.naturalWidth ? 0 : (i.currentSrc && i.decode ? limit(i.decode().catch(() => {})) : 0)));
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
// frames are independent pages, so several are measured at once (--jobs, default 4); the index keeps the frame-list order
const jobs = Math.max(1, Math.min(+(args.jobs || 4), frames.length || 1));
const results = new Array(frames.length); let nextFrame = 0;
const work = async (f, idx, safe = false) => {
  const w = f.viewport.w, h = f.viewport.h || 900;
  const url = /^https?:/.test(f.route) ? f.route : base + f.route;
  const sep = url.includes('?') ? '&' : '?';
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  // a frame can set localStorage before the page loads (for example the site's language or a signed-in user): "local": { "key": "value" }
  if (f.local && typeof f.local === 'object') await ctx.addInitScript((kv) => { for (const [k, v] of Object.entries(kv)) { try { localStorage.setItem(k, String(v)); } catch (e) {} } }, f.local);
  const page = await ctx.newPage();
  // retry after a browser crash: pictures over 400 KB (a huge SVG with filters is the usual cause) are not loaded, so one heavy asset cannot lose the whole frame
  if (safe) await page.route(/\.svg(\?|#|$)/i, async (route) => { try { const resp = await route.fetch(); const body = await resp.body(); if (body.length > 400000) await route.abort(); else await route.fulfill({ response: resp, body }); } catch (e) { await route.abort().catch(() => {}); } });
  const t0 = Date.now(); const ph = {}; let tp = t0; const mark = (k) => { const n = Date.now(); ph[k] = n - tp; tp = n; if (args.verbose) console.error(`${f.slug} ${k} ${ph[k]}ms`); }; // where the time goes, per phase, kept in the index
  const entry = { lang: f.lang || null, slug: f.slug, label: f.viewport.label, width: w, height: h, url };
  try {
    await page.goto(url + sep + 'capture=1' + (f.lang ? '&lang=' + encodeURIComponent(f.lang) : ''), { waitUntil: 'networkidle', timeout: 60000 });
    mark('load'); entry.stable = await settle(page); mark('settle');
    // steps bring a page into a state that needs interaction (a dialog, a menu, a filled form). Each step is one key:
    //   {"click": "<selector or text=...>"}  {"hover": sel}  {"fill": [sel, value]}  {"select": [sel, value]}  {"press": "Escape"}  {"press": [sel, "Enter"]}
    //   {"wait": 500}  or  {"wait": "<selector>"}  {"scroll": 600}  {"eval": "<javascript run in the page>"}
    // A step that fails is listed in the entry (`stepErrors`) and the frame carries on, so one bad selector does not stop the export.
    for (const st of (Array.isArray(f.steps) ? f.steps : [])) {
      try {
        if (st.click !== undefined) await page.click(String(st.click), { timeout: 5000 });
        else if (st.hover !== undefined) await page.hover(String(st.hover), { timeout: 5000 });
        else if (st.fill !== undefined) await page.fill(String(st.fill[0]), String(st.fill[1] ?? ''), { timeout: 5000 });
        else if (st.select !== undefined) await page.selectOption(String(st.select[0]), String(st.select[1]), { timeout: 5000 });
        else if (st.press !== undefined) { if (Array.isArray(st.press)) await page.press(String(st.press[0]), String(st.press[1]), { timeout: 5000 }); else await page.keyboard.press(String(st.press)); }
        else if (st.wait !== undefined) { if (typeof st.wait === 'number') await page.waitForTimeout(st.wait); else await page.waitForSelector(String(st.wait), { timeout: 8000 }); }
        else if (st.scroll !== undefined) await page.evaluate((y) => window.scrollTo(0, y), Number(st.scroll));
        else if (st.eval !== undefined) await page.evaluate(String(st.eval));
        else throw new Error('unknown step ' + JSON.stringify(st).slice(0, 80));
      } catch (e) { (entry.stepErrors = entry.stepErrors || []).push(JSON.stringify(st).slice(0, 100) + ': ' + String(e && e.message || e).split('\n')[0].slice(0, 120)); }
    }
    if (f.steps && f.steps.length) { await page.waitForTimeout(350); entry.stable = await settle(page); }
    mark('steps');
    const name = `${f.slug}@${w}`;
    // a playing video would show a different frame in the reference screenshot and in the saved picture of the video: pause it first
    await page.evaluate(() => document.querySelectorAll('video').forEach((v) => { try { v.pause(); } catch (e) {} }));
    await page.screenshot({ path: path.join(outDir, name + '.png'), fullPage: true }); mark('screenshot');
    // video and canvas content cannot be rebuilt as layers: save each one's pixels (everything else hidden) so it can fill its placeholder
    // an <img> whose SVG is too large to inline as vectors (more than 24,000 characters) is saved as a picture too
    // Figma's SVG import does not draw some features (dashed strokes such as progress rings, masks, filters, patterns, embedded bitmaps,
    // foreignObject) and the extractor keeps no vector over 24,000 characters: those SVGs are saved as pictures too
    await page.evaluate(() => {
      const BAD = /stroke-dasharray|<mask[\s>]|<filter[\s>]|<foreignObject|<pattern[\s>]|<image[\s>]/i;
      document.querySelectorAll('svg').forEach((el) => { if (el.parentElement && el.parentElement.closest('svg')) return; const m = el.outerHTML; if (m.length > 24000 || BAD.test(m)) el.setAttribute('data-np-big', '1'); });
      document.querySelectorAll('img').forEach((img) => { const s = img.currentSrc || img.src || ''; if (!/\.svg(\?|#|$)/i.test(s)) return; try { const x = new XMLHttpRequest(); x.open('GET', s, false); x.send(); const t = x.responseText || ''; if (x.status >= 200 && x.status < 300 && (t.length > 24000 || BAD.test(t))) img.setAttribute('data-np-big', '1'); } catch (e) {} });
    });
    const mediaEls = await page.$$('video, canvas, img[data-np-big], svg[data-np-big]');
    if (mediaEls.length) {
      fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
      await page.addStyleTag({ content: 'html[data-np-hide] body *{visibility:hidden!important}html[data-np-hide] [data-np-shot]{visibility:visible!important}' });
      let mi = 0; const done = new Map(); // a source used several times (a repeated logo strip) is captured once, at its first size
      for (const el of mediaEls) {
        const bb = await el.boundingBox(); if (!bb || bb.width < 8 || bb.height < 8) continue;
        const key = await el.evaluate((e) => (e.currentSrc || e.src || '') && e.tagName !== 'CANVAS' ? e.tagName + '|' + (e.currentSrc || e.src) + '|' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) : '').catch(() => '');
        if (key && done.has(key)) { await el.evaluate((e, fl) => e.setAttribute('data-np-file', fl), done.get(key)); continue; }
        const file = `assets/${name}.media${mi}.png`;
        try {
          await el.evaluate((e) => { document.documentElement.setAttribute('data-np-hide', '1'); e.setAttribute('data-np-shot', '1'); });
          await el.screenshot({ path: path.join(outDir, file), animations: 'disabled', timeout: 3000 }); // animations off: a marquee or a moving hero would never be "stable"
          await el.evaluate((e, fl) => { e.setAttribute('data-np-file', fl); e.removeAttribute('data-np-shot'); document.documentElement.removeAttribute('data-np-hide'); }, file);
          if (key) done.set(key, file); mi++;
        } catch (e) { await el.evaluate((x) => { x.removeAttribute('data-np-shot'); document.documentElement.removeAttribute('data-np-hide'); }).catch(() => {}); }
      }
    }
    mark('media');
    const spec = await page.evaluate(extractor); mark('extract');
    spec.frame = { slug: f.slug, label: f.viewport.label };
    fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(spec));
    Object.assign(entry, { spec: name + '.json', screenshot: name + '.png', page: spec.page, nodes: spec.nodes, fonts: spec.fonts, truncated: spec.truncated, ms: Date.now() - t0, phases: ph });
  } catch (e) {
    entry.error = String(e && e.message || e);
  }
  if (safe) entry.safeMode = 'SVG files over 400 KB were not loaded (the first attempt crashed the browser)';
  await ctx.close().catch(() => {});
  if (entry.error && /crash|closed|disconnected/i.test(entry.error) && !safe) return work(f, idx, true);
  results[idx] = entry;
};
await Promise.all(Array.from({ length: jobs }, async () => { while (nextFrame < frames.length) { const i = nextFrame++; await work(frames[i], i); } }));
index.frames = results;
await browser.close();

// union of fonts, for pinning in Figma
const fonts = {};
for (const e of index.frames) for (const fo of (e.fonts || [])) { const k = fo.family + '|' + fo.weight + '|' + fo.style; fonts[k] = fonts[k] || { ...fo, count: 0 }; fonts[k].count += fo.count; }
index.fonts = Object.values(fonts).sort((a, b) => b.count - a.count);
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
console.log(JSON.stringify({ out: outDir, frames: index.frames.map(e => ({ slug: e.slug, w: e.width, nodes: e.nodes, stable: e.stable, error: e.error })), fonts: index.fonts.map(f => `${f.family} ${f.weight}${f.style === 'italic' ? ' italic' : ''} x${f.count}${f.loaded === false ? ' NOT LOADED' : ''}`) }, null, 2));
