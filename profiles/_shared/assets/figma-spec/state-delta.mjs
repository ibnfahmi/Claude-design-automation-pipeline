// State delta: finds the state frames (a dialog, a menu, a dropdown, a search open over a page) that are the same page as an
// already-built frame, cropped to the viewport, plus overlay nodes. The Handoff Agent then CLONES the built frame, crops the clone
// to the viewport height (resize + clip content) and builds only the overlay on top, instead of building the whole page again.
//
//   node state-delta.mjs --frames frames.json --dir figma-spec [--out figma-spec/state-deltas.json]
//   node state-delta.mjs --base figma-spec/home@1440.json --state figma-spec/home-menu@1440.json [--height 900]
//
// frames.json: [{ "slug", "route", "viewport": {"w","h"}, "lang"? }, ...]; specs are figma-spec/<slug>@<w>.json (the extractor's names).
// Result per state frame: { slug, base, reusable, reason, missing, extra, cropHeight, add: [overlay nodes] }.
// `add` holds the top-most overlay subtrees (fixed or absolute positioned) with `r` already converted to the page's coordinates,
// so they can be built directly under the cloned root.
//
// How it decides: it compares only what is inside the viewport (the page behind a dialog is scroll-locked, so the state frame is
// viewport-sized while the base page is full length), by rectangle, kind, text and background. The non-overlay content of the state
// must match the base within a small tolerance (5% of the nodes, at least 2); anything else (a header that changes for a signed-in
// user, different content) is not reusable and is built in full. The pixel comparison checks every clone like any other frame.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isOverlay = (n) => !!(n && n.L && (n.L.pos === 'fixed' || n.L.pos === 'absolute'));
const key = (a) => [a.k, a.x, a.y, a.w, a.h, a.k === 't' ? a.t : '', a.bg].join('|');

// every node inside the viewport as an absolute rectangle; `ov` marks nodes inside an overlay subtree
function flatten(root, H) {
  const out = [];
  (function w(n, ox, oy, inOv) {
    const x = ox + n.r[0], y = oy + n.r[1];
    const ov = inOv || (isOverlay(n) && n !== root);
    if (y >= H) return;
    out.push({ k: n.k, x: Math.round(x), y: Math.round(y), w: Math.round(n.r[2]), h: Math.round(n.r[3]), t: n.txt || n.n || '', bg: n.bg || '', ov, isRoot: n === root });
    (n.c || []).forEach((c) => w(c, x, y, ov));
  })(root, 0, 0, false);
  return out;
}

// the top-most overlay subtrees with their position converted to the page's coordinates
function overlays(root) {
  const out = [];
  (function w(n, ox, oy) {
    const x = ox + n.r[0], y = oy + n.r[1];
    if (n !== root && isOverlay(n)) { out.push({ ...n, r: [Math.round(x * 10) / 10, Math.round(y * 10) / 10, n.r[2], n.r[3]] }); return; }
    (n.c || []).forEach((c) => w(c, x, y));
  })(root, 0, 0);
  return out;
}

export function stateDelta(baseRoot, stateRoot, height) {
  const H = height || stateRoot.r[3];
  if (!(stateRoot.r[3] <= baseRoot.r[3])) return { reusable: false, reason: 'the state frame is taller than the base' };
  if (Math.round(stateRoot.r[2]) !== Math.round(baseRoot.r[2])) return { reusable: false, reason: 'different width' };
  const bf = flatten(baseRoot, H).filter((a) => !a.ov && !a.isRoot);
  const sf = flatten(stateRoot, H);
  const sNon = sf.filter((a) => !a.ov && !a.isRoot);
  const count = (list) => { const m = new Map(); for (const a of list) m.set(key(a), (m.get(key(a)) || 0) + 1); return m; };
  const bm = count(bf), sm = count(sNon);
  let missing = 0, extra = 0;
  for (const [k, n] of bm) if ((sm.get(k) || 0) < n) missing += n - (sm.get(k) || 0);
  for (const [k, n] of sm) if ((bm.get(k) || 0) < n) extra += n - (bm.get(k) || 0);
  const tol = Math.max(2, Math.round(0.05 * bf.length));
  // overlays the base page already has (a sticky header, a skip link) are not new: they are in the clone, or not wanted in an overlay-only frame
  // (same name and kind: an animated decoration or a header whose look changed a little counts as the same one)
  const baseOv = overlays(baseRoot);
  const known = (n) => baseOv.some((b) => b.k === n.k && b.n === n.n);
  const add = overlays(stateRoot).filter((n) => !known(n));
  const base = { missing, extra, cropHeight: Math.round(stateRoot.r[3]), baseNodes: bf.length };
  if (!add.length) return { reusable: false, reason: 'no overlay nodes to add', ...base };
  if (missing > tol || extra > tol) return { reusable: false, reason: `the page behind it differs (${missing} base nodes missing, ${extra} new)`, ...base };
  // the region to compare when the frame holds only the overlay: the box around the dialog, menu or panel. A node that covers the whole
  // viewport is the scrim (or a wrapper holding the scrim and the dialog), so only its smaller descendants count.
  const W = Math.round(stateRoot.r[2]);
  const isFull = (r) => r[2] >= 0.95 * W && r[3] >= 0.95 * H;
  const boxes = [];
  const walkBox = (n, ox, oy) => {
    const x = ox + n.r[0], y = oy + n.r[1];
    if (!isFull([x, y, n.r[2], n.r[3]])) { boxes.push([x, y, n.r[2], n.r[3]]); return; }
    (n.c || []).forEach((c) => walkBox(c, x, y));
  };
  add.forEach((n) => walkBox(n, 0, 0));
  let compareBox = null;
  if (boxes.length) { const x1 = Math.max(0, Math.min(...boxes.map((b) => b[0]))), y1 = Math.max(0, Math.min(...boxes.map((b) => b[1]))), x2 = Math.min(W, Math.max(...boxes.map((b) => b[0] + b[2]))), y2 = Math.min(H, Math.max(...boxes.map((b) => b[1] + b[3]))); if (x2 > x1 && y2 > y1) compareBox = [Math.floor(x1), Math.floor(y1), Math.ceil(x2 - x1), Math.ceil(y2 - y1)]; }
  return { reusable: true, reason: `${add.length} overlay node(s) over the cropped base`, ...base, compareBox, width: W, add };
}

// pairs each state frame with an earlier frame of the same page and width that is not itself a clone
export function planDeltas(frames, load) {
  const groups = new Map();
  for (const f of frames) {
    const k = [String(f.route).split('?')[0], f.viewport && f.viewport.w, f.lang || ''].join('|');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(f);
  }
  const out = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const ordered = [...list].sort((a, b) => String(a.route).length - String(b.route).length);
    const bases = [];
    for (const f of ordered) {
      const spec = load(f);
      if (!spec) continue;
      let best = null;
      for (const b of bases) {
        const r = stateDelta(b.spec.root, spec.root, f.viewport && f.viewport.h);
        if (r.reusable && (!best || r.missing + r.extra < best.missing + best.extra)) best = { ...r, base: b.f.slug };
      }
      if (best) out.push({ slug: f.slug, ...best }); else bases.push({ f, spec });
    }
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (k) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
  if (arg('base') && arg('state')) {
    const r = stateDelta(JSON.parse(fs.readFileSync(arg('base'), 'utf8')).root, JSON.parse(fs.readFileSync(arg('state'), 'utf8')).root, arg('height') ? +arg('height') : undefined);
    console.log(JSON.stringify({ ...r, add: r.add ? r.add.length + ' node(s)' : undefined }, null, 1));
  } else if (arg('frames')) {
    const dir = arg('dir') || 'figma-spec';
    const frames = JSON.parse(fs.readFileSync(arg('frames'), 'utf8'));
    const load = (f) => { const p = path.join(dir, `${f.slug}@${f.viewport.w}.json`); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
    const result = planDeltas(frames, load);
    if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(result));
    console.log(JSON.stringify({ frames: frames.length, reusableStates: result.length, slugs: result.map((r) => r.slug + ' <- ' + r.base) }, null, 1));
  } else {
    console.error('usage: state-delta.mjs --frames frames.json --dir figma-spec [--out file] | --base a.json --state b.json');
    process.exit(2);
  }
}
