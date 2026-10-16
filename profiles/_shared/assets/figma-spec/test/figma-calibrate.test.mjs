// Tests the calibration: the fitting recovers known corrections from synthetic "built vs spec" data, a calibration that
// doesn't help held-out frames is rejected, and the builder applies a calibration (and is unchanged without one).
//   node test/figma-calibrate.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { observe, mergeObs, fit, accept, residuals } from '../calibrate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let bad = 0;
const check = (n, ok, extra = '') => { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  ' + extra)); };
const near = (a, b, t) => Math.abs(a - b) <= t;

// ---------- a synthetic spec: a heading, a paragraph and three more texts, plus a scrolling row of cards ----------
const T = (i, y, h, extra = {}) => ({ k: 't', i, n: 'text' + i, r: [16, y, 200, h], ff: 'Inter', fw: 400, fs: 16, lh: 24, col: 'rgb(0,0,0)', txt: 'x', lines: 1, ...extra });
const spec = { root: { k: 'f', i: 0, n: 'Page', r: [0, 0, 393, 852], c: [
  T(1, 40, 32, { h: 1, fw: 600 }), T(2, 84, 48), T(3, 150, 24), T(4, 190, 24), T(5, 230, 24),
  { k: 'f', i: 6, n: 'row', r: [0, 300, 393, 120], sc: { sl: 0, sw: 800, cw: 393 }, c: [
    { k: 'f', i: 7, n: 'card', r: [0, 0, 200, 120] }, { k: 'f', i: 8, n: 'card', r: [208, 0, 200, 120] }, { k: 'f', i: 9, n: 'card', r: [416, 0, 200, 120] } ] } ] } };
// what Figma produced: every text 2 px too high and 4% too short in height, 3 px less space under the heading, cards 16 px too far right
const built = [
  { i: 1, y: 38, h: 30.7, x: 16 }, { i: 2, y: 79, h: 46.1, x: 16 }, { i: 3, y: 148, h: 23, x: 16 }, { i: 4, y: 188, h: 23, x: 16 }, { i: 5, y: 228, h: 23, x: 16 },
  { i: 7, y: 300, h: 120, x: 16 }, { i: 8, y: 300, h: 120, x: 224 }, { i: 9, y: 300, h: 120, x: 432 },
];
const probe = { nodes: built.map(b => ({ w: 200, type: 'X', ...b })) };

const obs = observe(spec, probe);
check('observe finds the texts, the heading gap and the carousel children', obs.texts.length === 5 && obs.headings.length === 1 && obs.scroll.length === 3, JSON.stringify([obs.texts.length, obs.headings.length, obs.scroll.length]));

// the heading + the block under it need three observations before a gap is fitted: use three frames' worth
const obs3 = mergeObs([obs, obs, obs]);
const cal = fit(obs3, {});
const f = cal.text['Inter|400'];
check('fit recovers the text line-height scale (about 1.04)', f && near(f.lineHeightScale, 1.04, 0.02), JSON.stringify(f));
check('fit recovers a vertical text offset in the right direction (text was too high)', f && f.yOffset > 0.5 && f.yOffset < 4, JSON.stringify(f));
check('fit recovers the heading gap (3 px short)', near(cal.spacing.headingGap, 3, 1.5), JSON.stringify(cal.spacing));
check('fit recovers the carousel offset (cards 16 px too far right: dx -16)', near(cal.scroll.dx, -16, 1), JSON.stringify(cal.scroll));

// a parameter with too few observations is left alone
const few = fit({ texts: obs.texts.slice(0, 2), headings: [], scroll: [] }, {});
check('a parameter backed by fewer than three nodes is not changed', !few.text['Inter|400'] && few.spacing.headingGap === undefined);

// a second round adds the new residual to the previous calibration
const again = fit({ texts: obs3.texts.map(t => ({ ...t, dy: 0.5 })), headings: [], scroll: [] }, cal);
check('a later round adds to the previous calibration', near(again.text['Inter|400'].yOffset, cal.text['Inter|400'].yOffset + 0.5, 0.11), JSON.stringify(again.text));
check('residuals report how far the nodes still are', residuals(obs).textDy >= 1.5 && residuals(obs).scrollDx === 16);

// ---------- the held-out rule ----------
const ok = accept([3.1, 2.8, 3.4], [1.9, 1.7, 2.2]);
check('a calibration that helps held-out frames is accepted', ok.accepted === true && ok.thresholds.maxDiff >= 2, JSON.stringify(ok));
const worse = accept([3.1, 2.8, 3.4], [2.0, 1.8, 4.5]);
check('a calibration that makes one held-out frame clearly worse is rejected', worse.accepted === false && worse.noneWorse === false, JSON.stringify(worse));
const same = accept([3.0, 3.0], [3.0, 2.98]);
check('a calibration that does not improve the median is rejected', same.accepted === false);
check('the whole-screen limit never goes below 2%', accept([1.0, 1.0], [0.5, 0.4]).thresholds.maxDiff === 2);

// ---------- the builder applies the calibration ----------
const template = fs.readFileSync(path.join(HERE, '..', 'figma-builder.js'), 'utf8');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
let nextId = 1;
class Node {
  constructor(type) { this.id = '1:' + nextId++; this.type = type; this.children = []; this.parent = null; this.name = type; this.width = 100; this.height = 100; this.x = 0; this.y = 0; this._pd = {}; }
  appendChild(c) { if (c.parent) c.parent.children = c.parent.children.filter(x => x !== c); c.parent = this; this.children.push(c); }
  resize(w, h) { this.width = w; this.height = h; }
  findAll(fn) { const out = []; (function w(n) { for (const c of n.children) { if (fn(c)) out.push(c); w(c); } })(this); return out; }
  setBoundVariable() {}
  setPluginData(k, v) { this._pd[k] = v; } getPluginData(k) { return this._pd[k] || ''; }
}
class Text extends Node { constructor() { super('TEXT'); this._chars = ''; this.fontName = { family: 'Inter', style: 'Regular' }; } get characters() { return this._chars; } set characters(v) { this._chars = v; } }
const fig = () => ({ mixed: Symbol('m'), currentPage: new Node('PAGE'), createFrame() { return new Node('FRAME'); }, createAutoLayout(d = 'HORIZONTAL') { const n = new Node('FRAME'); n.layoutMode = d; return n; }, createText() { return new Text(); }, createRectangle() { return new Node('RECTANGLE'); }, createNodeFromSvg() { return new Node('FRAME'); }, async loadFontAsync() {}, async getNodeByIdAsync() { return null; }, async setCurrentPageAsync() {}, variables: { async getVariableByIdAsync() { return null; }, setBoundVariableForPaint(p) { return p; } } });
const FONTMAP = { 'Inter|400|normal': { family: 'Inter', style: 'Regular' }, 'Inter|600|normal': { family: 'Inter', style: 'SemiBold' } };
const run = async (rootNode, calibration) => { const figma = fig(); const code = template.replace('__SPEC__', JSON.stringify({ node: rootNode, parentId: null, name: 'Test', x: 0, y: 0 })).replace('__FONTMAP__', JSON.stringify(FONTMAP)).replace('__OPTS__', JSON.stringify({ fixedContainers: true, ...(calibration ? { calibration } : {}) })); const r = await new AsyncFn('figma', code)(figma); return { r, page: figma.currentPage }; };

// a plain (not auto-layout) page: texts keep absolute positions, so a yOffset moves them
const plain = { k: 'f', i: 0, n: 'Page', r: [0, 0, 393, 400], c: [T(1, 40, 24), T(2, 50, 24, { fw: 600 })] };
const base = await run(plain, null);
const calib = { text: { 'Inter|400': { lineHeightScale: 1.05, yOffset: 2 } }, scroll: { dx: -16 } };
const withCal = await run(plain, calib);
const ty = (res, k) => res.page.children[0].children[k].y;
check('without a calibration the text sits at the spec position', ty(base, 0) === 40);
check('with a calibration the text moves by yOffset (only the calibrated font)', ty(withCal, 0) === 42 && ty(withCal, 1) === 50, `${ty(withCal, 0)}, ${ty(withCal, 1)}`);
check('every built node is tagged with its spec index', base.page.children[0].getPluginData('pipeline:node') === '0' && base.page.children[0].children[0].getPluginData('pipeline:node') === '1');
const empty = await run(plain, {});
check('an empty calibration changes nothing', JSON.stringify(empty.page.children[0].children.map(c => [c.x, c.y, c.width, c.height])) === JSON.stringify(base.page.children[0].children.map(c => [c.x, c.y, c.width, c.height])));

// a scrolling row on a plain frame: its children shift by scroll.dx
const row = { k: 'f', i: 0, n: 'Page', r: [0, 0, 393, 200], c: [{ k: 'f', i: 1, n: 'row', r: [0, 0, 393, 120], sc: { sl: 0, sw: 800, cw: 393 }, c: [{ k: 'f', i: 2, n: 'card', r: [16, 0, 200, 120] }, { k: 'f', i: 3, n: 'card', r: [100, 0, 200, 120] }] }] };
const rowCal = await run(row, calib), rowBase = await run(row, null);
const cardX = (res) => res.page.children[0].children[0].children[0].x;
check('a carousel opens where the calibration says (no left offset)', cardX(rowBase) === 16 && cardX(rowCal) === 0, `${cardX(rowBase)} -> ${cardX(rowCal)}`);

// inside auto layout, a heading gap becomes padding under the heading, in a wrapper
const stack = { k: 'f', i: 0, n: 'Page', r: [0, 0, 393, 400], L: { d: 'flex', dir: 'col', jc: 'flex-start', ai: 'flex-start', gap: [8, 0], pad: [16, 16, 16, 16] }, c: [T(1, 16, 32, { h: 1 }), T(2, 56, 24)] };
const st = await run(stack, { spacing: { headingGap: 6 } });
const kids = st.page.children[0].children;
check('a heading gap wraps the heading in a group with padding under it', kids[0].name === 'Text group' && kids[0].paddingBottom === 6 && kids[1].name !== 'Text group', JSON.stringify(kids.map(k => k.name)));

if (bad) { console.error('\nFAILED: ' + bad); process.exit(1); }
console.log('\nALL OK');
