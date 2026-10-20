// Runs figma-builder.js against a mock Figma Plugin API that enforces the figma-use rules
// (sizing order, font loading, auto-layout contexts), using a real extracted spec as input.
//   node test/figma-builder.test.mjs [spec.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const specFile = process.argv[2] || path.join(HERE, 'sample-home@1440.json');
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
let code = fs.readFileSync(path.join(HERE, '..', 'figma-builder.js'), 'utf8');

const FONTMAP = {};
for (const f of spec.fonts) FONTMAP[`${f.family}|${f.weight}|${f.style}`] = { family: f.family, style: f.weight >= 700 ? 'Bold' : f.weight >= 600 ? 'SemiBold' : 'Regular' };
const section = { node: spec.root, parentId: null, name: 'Home / Default @ Desktop 1440', x: 0, y: 0, hash: 'h123' };
code = code.replace('__SPEC__', JSON.stringify(section)).replace('__FONTMAP__', JSON.stringify(FONTMAP)).replace('__OPTS__', JSON.stringify({ fixedContainers: true }));

// ---------- mock Figma ----------
let nextId = 1;
const errors = [];
const fail = (m) => { errors.push(m); throw new Error(m); };
const loadedFonts = new Set(['Inter|Regular']);
const registry = new Map();
class Node {
  constructor(type) { this.id = '1:' + nextId++; registry.set(this.id, this); this.type = type; this.children = []; this.parent = null; this.name = type; this.width = 100; this.height = 100; this.x = 0; this.y = 0; this._lm = 'NONE'; this._lsh = 'FIXED'; this._lsv = 'FIXED'; this.layoutPositioning = 'AUTO'; this.fills = []; this.strokes = []; this.effects = []; }
  get layoutMode() { return this._lm; }
  set layoutMode(v) { this._lm = v; }
  clone() { const n = new Node(this.type); Object.assign(n, { name: this.name, width: this.width, height: this.height, _lm: this._lm, _lsh: this._lsh, _lsv: this._lsv, fills: this.fills, _pd: { ...(this._pd || {}) } }); n.children = []; for (const c of this.children) { const cc = c.clone(); cc.parent = n; n.children.push(cc); } return n; }
  insertChild(i, c) { if (c.parent) c.parent.children = c.parent.children.filter(x => x !== c); c.parent = this; this.children.splice(i, 0, c); }
  appendChild(c) { if (c.parent) c.parent.children = c.parent.children.filter(x => x !== c); c.parent = this; this.children.push(c); }
  resize(w, h) { this.width = w; this.height = h; this._lsh = 'FIXED'; this._lsv = 'FIXED'; if (this.type === 'TEXT') this.textAutoResize = 'NONE'; }
  _checkSizing(axis, v) {
    if (v === 'FIXED') return;
    const parentAuto = this.parent && this.parent._lm && this.parent._lm !== 'NONE';
    if (v === 'HUG') { if (!((this.type === 'FRAME' && this._lm !== 'NONE') || (this.type === 'TEXT' && parentAuto))) fail(`HUG not allowed on ${this.type} (${this.name}) layoutMode=${this._lm}`); }
    if (v === 'FILL') { if (!parentAuto || this.layoutPositioning === 'ABSOLUTE') fail(`FILL only for children of auto-layout frames (${this.name})`); }
  }
  get layoutSizingHorizontal() { return this._lsh; } set layoutSizingHorizontal(v) { this._checkSizing('h', v); this._lsh = v; }
  get layoutSizingVertical() { return this._lsv; } set layoutSizingVertical(v) { this._checkSizing('v', v); this._lsv = v; }
  set layoutPositioning(v) { if (v === 'ABSOLUTE' && !(this.parent && this.parent._lm !== 'NONE')) fail('ABSOLUTE needs an auto-layout parent'); this._lp = v; }
  get layoutPositioning() { return this._lp || 'AUTO'; }
  setBoundVariable() {}
  setSharedPluginData(ns, k, v) { (this._pd = this._pd || {})[ns + ':' + k] = v; }
  getSharedPluginData(ns, k) { return (this._pd || {})[ns + ':' + k] || ''; }
  setPluginData() { throw new Error('setPluginData is not supported in this host'); }
}
class Text extends Node {
  constructor() { super('TEXT'); this._fn = { family: 'Inter', style: 'Regular' }; this._chars = ''; this.textAutoResize = 'WIDTH_AND_HEIGHT'; this.ranges = []; }
  get fontName() { return this._fn; }
  set fontName(v) { if (!loadedFonts.has(v.family + '|' + v.style)) fail('unloaded font ' + v.family + ' ' + v.style); this._fn = v; }
  get characters() { return this._chars; }
  set characters(v) { if (!loadedFonts.has(this._fn.family + '|' + this._fn.style)) fail('characters written with unloaded font'); this._chars = v; }
  setRangeFontName(a, b, f) { if (!loadedFonts.has(f.family + '|' + f.style)) fail('range font not loaded'); this.ranges.push(['font', a, b, f]); }
  setRangeFontSize() {} setRangeLineHeight() {} setRangeLetterSpacing() {} setRangeFills() {} setRangeTextDecoration() {} setRangeTextCase() {}
}
const figma = {
  currentPage: new Node('PAGE'),
  createFrame() { const n = new Node('FRAME'); return n; },
  createAutoLayout(dir = 'HORIZONTAL') { const n = new Node('FRAME'); n._lm = dir; n._lsh = 'HUG'; n._lsv = 'HUG'; return n; },
  createText() { return new Text(); },
  createRectangle() { return new Node('RECTANGLE'); },
  createNodeFromSvg(s) { if (!/<svg/.test(s)) fail('bad svg'); const n = new Node('FRAME'); n.name = 'svg'; return n; },
  async loadFontAsync(f) { loadedFonts.add(f.family + '|' + f.style); },
  async getNodeByIdAsync(id) { return id === 'page' ? figma.currentPage : (registry.get(id) || null); },
  async setCurrentPageAsync() {},
  variables: { async getVariableByIdAsync() { return null; }, setBoundVariableForPaint(p) { return p; } },
};
figma.currentPage.children = [];
// appending to the page must work like a frame
figma.currentPage.appendChild = Node.prototype.appendChild;

const run = new (Object.getPrototypeOf(async function () {}).constructor)('figma', code);
let result;
try { result = await run(figma); } catch (e) { console.error('BUILDER THREW:', e.message); process.exit(1); }

// ---------- assertions ----------
const all = []; (function walk(n) { all.push(n); n.children.forEach(walk); })(figma.currentPage.children[0]);
const count = (t) => all.filter(n => n.type === t).length;
const specTexts = []; (function w(n) { if (n.k === 't') specTexts.push(n); (n.c || []).forEach(w); })(spec.root);
const check = (name, ok, extra = '') => { if (!ok) errors.push(name + (extra ? ' - ' + extra : '')); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

check('no exception and a root frame was created', !!result.rootId);
check('text nodes = spec text nodes', count('TEXT') === specTexts.length, `${count('TEXT')} of ${specTexts.length}`);
check('no missing fonts', result.missingFonts.length === 0, result.missingFonts.join(','));
check('every text uses a loaded font', all.filter(n => n.type === 'TEXT').every(t => loadedFonts.has(t.fontName.family + '|' + t.fontName.style)));
check('images are placeholders with source info', result.images.length === all.filter(n => n.name.startsWith('Image /')).length && result.images.length >= 1, `${result.images.length}`);
check('inline svg became a node', result.stats.svgs >= 1);
check('auto layout is used widely', result.stats.autoLayout >= 8, `${result.stats.autoLayout} auto-layout frames`);
check('grid became rows', result.stats.gridRows >= 1, `${result.stats.gridRows} row(s)`);
const rows = all.filter(n => n.name === 'Row');
check('grid cards fill their row equally', rows.length && rows[0].children.length === 3 && rows[0].children.every(c => c.layoutSizingHorizontal === 'FILL'));
check('pseudo-elements became decoration frames', all.some(n => n.name.startsWith('Decoration')));
check('absolute badges are ABSOLUTE', all.filter(n => n.layoutPositioning === 'ABSOLUTE').length >= 3, `${result.stats.absolute}`);
check('multi-line text keeps a fixed width and HEIGHT auto resize', all.filter(n => n.type === 'TEXT' && n.maxLines === undefined && n.height > 40 && n.textAutoResize === 'HEIGHT').length >= 1);
check('line clamp became truncation with maxLines', all.some(n => n.type === 'TEXT' && n.textTruncation === 'ENDING' && n.maxLines === 2));
const hero = all.find(n => n.name === 'Hero');
const gf = hero && hero.fills.find(f => f.type === 'GRADIENT_LINEAR');
check('hero gradient exists', !!gf);
if (gf) {
  const T = gf.gradientTransform; const ap = (x, y) => [T[0][0] * x + T[0][1] * y + T[0][2], T[1][0] * x + T[1][1] * y + T[1][2]];
  const s = ap(0.5, 0), e = ap(0.5, 1);
  check('gradient transform maps top to start and bottom to end', Math.abs(s[0]) < 1e-6 && Math.abs(s[1] - 0.5) < 1e-6 && Math.abs(e[0] - 1) < 1e-6 && Math.abs(e[1] - 0.5) < 1e-6, JSON.stringify([s, e]));
}
const topFrame = figma.currentPage.children[0];
check('top-level frame is tagged as built from the spec, with its hash', topFrame.getSharedPluginData('pipeline', 'source') === 'spec' && topFrame.getSharedPluginData('pipeline', 'hash') === 'h123');
check('buttons hug their content', all.some(n => n.name === 'Button' || n.name === 'Btn') );
// ---- an overlay state is made by cloning the built frame, cropping it and adding the overlay on top
{
  const baseId = result.rootId;
  const overlay = { k: 'f', n: 'Dialog', r: [440, 200, 560, 400], bg: 'rgb(255, 255, 255)', L: { d: 'flex', dir: 'column', pos: 'fixed' }, c: [{ k: 't', n: 'Title', r: [24, 24, 200, 30], txt: 'Apply', ff: 'Inter', fs: 20, fw: 600, col: 'rgb(0, 0, 0)', lines: 1 }] };
  const section2 = { cloneOf: baseId, cropHeight: 900, add: [overlay], name: 'Home / Dialog @ Desktop 1440', x: 0, y: 2000, hash: 'h999' };
  const code2 = fs.readFileSync(path.join(HERE, '..', 'figma-builder.js'), 'utf8').replace('__SPEC__', JSON.stringify(section2)).replace('__FONTMAP__', JSON.stringify(FONTMAP)).replace('__OPTS__', JSON.stringify({ fixedContainers: true }));
  const run2 = new (Object.getPrototypeOf(async function () {}).constructor)('figma', code2);
  const before = figma.currentPage.children.length;
  let r2; try { r2 = await run2(figma); } catch (e) { console.error('CLONE RUN THREW:', e.message); process.exit(1); }
  const clone = figma.currentPage.children[figma.currentPage.children.length - 1];
  const orig = figma.currentPage.children[0];
  check('the clone is a new frame next to the original', figma.currentPage.children.length === before + 1 && clone !== orig && r2.stats.cloned === 1);
  check('the clone is cropped to the state height and clips its content', clone.height === 900 && clone.clipsContent === true && orig.height !== 900, `${clone.height} vs ${orig.height}`);
  check('the original frame is untouched', orig.getSharedPluginData('pipeline', 'hash') === 'h123');
  check('the clone has its own name, position and hash, and records its base', clone.name === 'Home / Dialog @ Desktop 1440' && clone.y === 2000 && clone.getSharedPluginData('pipeline', 'hash') === 'h999' && clone.getSharedPluginData('pipeline', 'clonedFrom') === baseId);
  const dlg = clone.children[clone.children.length - 1];
  check('the overlay was built last (on top), absolute, at its page position', dlg && dlg.name === 'Dialog' && dlg.x === 440 && dlg.y === 200 && r2.stats.overlays === 1, dlg && `${dlg.name} ${dlg.x},${dlg.y}`);
  check('the clone kept the base content (same child count plus the overlay)', clone.children.length === orig.children.length + 1, `${clone.children.length} vs ${orig.children.length}`);
}
// ---- fixes found by a real export test: transparent grid rows, clipping, input text, media files, gradient layers, wrapped text
{
  const rows2 = all.filter(n => n.name === 'Row');
  check('grid rows are transparent (a new frame is white by default)', rows2.length && rows2.every(r => Array.isArray(r.fills) && r.fills.length === 0));
  check('top-level frames clip their content', topFrame.clipsContent === true);
  const wrapped = all.filter(n => n.type === 'TEXT' && n.textAutoResize === 'HEIGHT');
  check('wrapped text gets 4 px of width slack', wrapped.length >= 1);

  const input = { k: 'f', n: 'Input', r: [0, 0, 300, 48], bd: { w: [1, 1, 1, 1], c: ['rgb(200, 200, 200)', 'rgb(200, 200, 200)', 'rgb(200, 200, 200)', 'rgb(200, 200, 200)'], s: 'solid' }, L: { d: 'block', pad: [12, 16, 12, 16] }, inp: 'text', ph: 'Your email', tp: { ff: 'Inter', fs: 16, fw: 400, col: 'rgb(120, 120, 120)', lh: 24, ls: 0 } };
  const video = { k: 'i', n: 'video', r: [0, 0, 300, 200], kind: 'video', src: '', file: 'assets/home@1440.media0.png' };
  const gradient = { k: 'f', n: 'Glow', r: [0, 0, 300, 100], bgi: 'radial-gradient(circle at 50% 0%, rgba(0, 112, 254, 0.4), rgba(0, 0, 0, 0) 60%), linear-gradient(rgb(11, 27, 61), rgb(20, 50, 110))', L: { d: 'block' } };
  const iconBtn = { k: 'f', n: 'IconBtn', act: 'button', r: [0, 0, 44, 44], bg: 'rgba(255, 255, 255, 0.1)', rad: [12, 12, 12, 12], L: { d: 'grid', gap: [0, 0], cols: '44px', rows: '44px', ai: 'center' }, c: [{ k: 's', n: 'svg', r: [12, 12, 24, 24], svg: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 6h16"/></svg>' }] };
  const dlg = { k: 'f', n: 'Dialog', r: [100, 100, 200, 200], bg: 'rgb(255, 255, 255)', L: { d: 'block', pos: 'relative' } };
  const dlgPlain = { k: 'f', n: 'PlainDialog', r: [100, 100, 200, 200], bg: 'rgb(255, 255, 255)', L: { d: 'block' } };
  const scrim = { k: 'f', n: 'Scrim', r: [0, 0, 400, 500], bg: 'rgba(3, 12, 30, 0.62)', bf: 'blur(6px)', L: { d: 'block', pos: 'absolute' } };
  const scrim2 = { ...scrim, n: 'Scrim2' };
  const wrap2 = { k: 'f', n: 'Wrap2', r: [0, 0, 400, 500], L: { d: 'grid', gap: [0, 0], cols: '400px', rows: '500px', ai: 'center', pos: 'fixed' }, c: [scrim2, dlgPlain] };
  const wrap = { k: 'f', n: 'Wrap', r: [0, 0, 400, 500], L: { d: 'grid', gap: [0, 0], cols: '400px', rows: '500px', ai: 'center', pos: 'fixed' }, c: [scrim, dlg] };
  const gradText = { k: 'f', n: 'GradHeading', r: [0, 0, 300, 40], bgi: 'linear-gradient(90deg, rgb(30, 64, 175), rgb(59, 130, 246))', L: { d: 'block' }, c: [{ k: 't', n: 'Title', r: [0, 0, 300, 40], txt: 'Every idea', ff: 'Inter', fs: 32, fw: 700, col: 'rgba(0, 0, 0, 0)', lines: 1 }] };
  const dlg2 = { k: 'f', n: 'CenteredDialog', r: [170, 40, 160, 200], bg: 'rgb(255, 255, 255)', L: { d: 'block' } };
  const centerWrap = { k: 'f', n: 'CenterWrap', r: [0, 0, 500, 300], L: { d: 'grid', gap: [0, 0], cols: '468px', rows: '268px', ai: 'center', ji: 'center', pad: [16, 16, 16, 16], pos: 'fixed' }, c: [dlg2] };
  const noJiWrap = { k: 'f', n: 'NoJiWrap', r: [0, 0, 500, 300], L: { d: 'grid', gap: [0, 0], cols: '468px', rows: '268px', ai: 'center', pad: [16, 16, 16, 16], pos: 'fixed' }, c: [{ ...dlg2, n: 'LeftDialog', r: [16, 40, 160, 200] }] };
  const btnA = { k: 'f', n: 'BtnA', act: 'link', r: [0, 0, 263, 72], bg: 'rgb(255, 255, 255)', L: { d: 'flex', dir: 'row', jc: 'center', ai: 'center', gap: [20, 20], pad: [18, 36, 18, 36] }, c: [{ k: 't', n: 'A', r: [36, 24, 190, 24], txt: 'Share an idea', ff: 'Inter', fs: 16, fw: 600, col: 'rgb(0, 0, 0)', lines: 1, nw: 1 }] };
  const btnB = { ...btnA, n: 'BtnB', r: [278, 0, 272, 72] };
  const ctas = { k: 'f', n: 'Ctas', r: [0, 0, 550, 72], L: { d: 'flex', dir: 'row', wrap: 1, jc: 'center', ai: 'center', gap: [15, 15] }, c: [btnA, btnB] };
  const wrapRow = { k: 'f', n: 'Wrapped', r: [0, 0, 300, 160], L: { d: 'flex', dir: 'row', wrap: 1, gap: [8, 8] }, c: [{ ...btnA, n: 'W1', r: [0, 0, 140, 72] }, { ...btnA, n: 'W2', r: [150, 0, 140, 72] }, { ...btnA, n: 'W3', r: [0, 80, 140, 72] }] };
  const mk = (n, x, w, F) => ({ k: 'f', n, r: [x, 0, w, 44], bg: 'rgb(200, 200, 200)', L: { d: 'block' }, ...(F ? { F } : {}) });
  // search has margin-left: auto; bell comes second in the page but has order: 1, so it is shown last
  const gtext = (n, y) => ({ k: 'f', n, r: [0, y, 200, 20], bg: 'rgb(10, 10, 10)', L: { d: 'block' } });
  const gappy = { k: 'f', n: 'Gappy', r: [0, 0, 200, 90], L: { d: 'block' }, c: [gtext('G1', 0), gtext('G2', 25), gtext('G3', 70)] };
  const overlap = { k: 'f', n: 'Overlap', r: [0, 0, 200, 90], L: { d: 'block' }, c: [{ k: 'f', n: 'O1', r: [0, 0, 200, 40], bg: 'rgb(0, 0, 0)', L: { d: 'block' } }, { k: 'f', n: 'O2', r: [10, 25, 180, 40], bg: 'rgb(200, 0, 0)', L: { d: 'block' } }, { k: 'f', n: 'O3', r: [0, 70, 200, 20], bg: 'rgb(0, 0, 200)', L: { d: 'block' } }] };
  const bt = (n, x, y, w, h) => ({ k: 'f', n, r: [x, y, w, h], bg: 'rgb(30, 30, 30)', L: { d: 'block' } });
  const barRow = { k: 'f', n: 'BarRow', r: [0, 0, 400, 24], L: { d: 'grid', gap: [12, 12], cols: '24px 90px 200px', rows: '24px', ai: 'center', jc: 'normal' }, c: [bt('Rank', 0, 0, 24, 24), bt('Label', 36, 2.5, 90, 19), bt('Bar', 138, 6, 200, 12)] };
  const ringNode = { k: 'f', n: 'RingBox', r: [0, 0, 60, 60], bgfile: 'assets/x.media0.png', rad: [30, 30, 30, 30], L: { d: 'block' }, c: [{ k: 't', n: '72', r: [18, 20, 24, 20], txt: '72', ff: 'Inter', fs: 16, fw: 700, col: 'rgb(0, 0, 0)', lines: 1 }] };
  const pulled = { k: 'f', n: 'Pulled', r: [0, 0, 200, 140], L: { d: 'flex', dir: 'col', gap: [10, 10], pad: [40, 0, 0, 0] }, c: [{ k: 'f', n: 'P1', r: [0, -36, 200, 100], bg: 'rgb(0, 0, 0)', L: { d: 'block' } }, { k: 'f', n: 'P2', r: [0, 74, 200, 60], bg: 'rgb(9, 9, 9)', L: { d: 'block' } }] };
  const textStack = { k: 'f', n: 'TextStack', r: [0, 0, 200, 50], L: { d: 'flex', dir: 'col', gap: [0, 0] }, c: [{ k: 't', n: 'T1', r: [0, 0, 150, 33], txt: 'Title', ff: 'Inter', fs: 24, fw: 700, lh: 26.4, col: 'rgb(0, 0, 0)', lines: 1 }, { k: 't', n: 'T2', r: [0, 30.4, 150, 17], txt: 'Sub', ff: 'Inter', fs: 12, fw: 400, lh: 17, col: 'rgb(0, 0, 0)', lines: 1 }] };
  const clamped = { k: 'f', n: 'ClampBox', r: [0, 0, 300, 60], L: { d: 'flex', dir: 'col', gap: [0, 0] }, c: [{ k: 't', n: 'ClampText', r: [0, 0, 294, 46], lines: 2, clamp: 2, ff: 'Inter', fs: 14, fw: 400, lh: 24, col: 'rgb(0, 0, 0)', txt: 'A very long description that the page shows on two lines only and cuts off with an ellipsis after that, so the rest never appears on the page at all.' }] };
  const actions = { k: 'f', n: 'Actions', r: [0, 0, 500, 44], L: { d: 'flex', dir: 'row', jc: 'normal', ai: 'center', gap: [10, 10] }, c: [mk('Search', 300, 44, { ma: 'l' }), mk('Bell', 454, 27, { o: 1 }), mk('Btn', 354, 90)] };
  const tile = (n, x) => ({ k: 'f', n, r: [x, 0, 200, 240], L: { d: 'flex', dir: 'row', ai: 'flex-end', gap: [0, 0], pos: 'relative' }, c: [{ k: 'i', n: 'img', r: [0, 0, 200, 240], src: 'a.jpg', fit: 'cover', L: { pos: 'absolute' } }, { k: 'f', n: 'cap', r: [0, 160, 150, 80], L: { d: 'block', pos: 'relative' }, c: [{ k: 't', n: 'Cap', r: [10, 10, 100, 20], txt: 'Caption', ff: 'Inter', fs: 14, fw: 400, col: 'rgb(0, 0, 0)', lines: 1 }] }] });
  const tiles = { k: 'f', n: 'Tiles', r: [0, 0, 416, 240], L: { d: 'grid', gap: [16, 16], cols: '200px 200px', rows: '240px', ai: 'normal', jc: 'normal' }, c: [tile('TileA', 0), tile('TileB', 216)] };
  const holder = { k: 'f', n: 'Holder', r: [0, 0, 550, 1900], L: { d: 'flex', dir: 'col', gap: [0, 0] }, c: [pulled, textStack, ringNode, barRow, overlap, gappy, clamped, tiles, actions, input, video, gradient, iconBtn, wrap, wrap2, gradText, centerWrap, noJiWrap, ctas, wrapRow] };
  const section4 = { node: holder, parentId: null, name: 'Fix checks', x: 0, y: 6000 };
  const code4 = fs.readFileSync(path.join(HERE, '..', 'figma-builder.js'), 'utf8').replace('__SPEC__', JSON.stringify(section4)).replace('__FONTMAP__', JSON.stringify(FONTMAP)).replace('__OPTS__', JSON.stringify({ fixedContainers: true }));
  const run4 = new (Object.getPrototypeOf(async function () {}).constructor)('figma', code4);
  let r4; try { r4 = await run4(figma); } catch (e) { console.error('FIX RUN THREW:', e.message); process.exit(1); }
  const root4 = figma.currentPage.children[figma.currentPage.children.length - 1];
  const kids4 = []; (function w(n) { kids4.push(n); n.children.forEach(w); })(root4);
  const inputFrame = kids4.find(n => n.name === 'Input');
  const inputText = inputFrame && inputFrame.children.find(c => c.type === 'TEXT');
  check('an input shows its placeholder or value as text, inside its box', !!inputText && inputText.characters === 'Your email' && inputText.x === 17 && r4.stats.inputTexts === 1, inputText && `${inputText.characters} at ${inputText.x},${inputText.y}`);
  check('an input text is vertically centred', !!inputText && inputText.y >= 0 && inputText.y <= 48);
  check('a video keeps the file with its saved pixels for the image fill', r4.images.some(i => i.kind === 'video' && i.file === 'assets/home@1440.media0.png'));
  const glow = kids4.find(n => n.name === 'Glow');
  const wrapNode = kids4.find(n => n.name === 'Wrap');
  const scrimIdx = wrapNode ? wrapNode.children.findIndex(c => c.name === 'Scrim') : -1;
  check('CSS paint order: a positioned dialog that follows a positioned scrim paints above it (scrim goes behind)', scrimIdx === 0, `scrim at index ${scrimIdx} of ${wrapNode && wrapNode.children.map(c => c.name).join(',')}`);
  const wrapNode2 = kids4.find(n => n.name === 'Wrap2');
  check('CSS paint order: a positioned scrim paints above a NON-positioned sibling, even one that follows it', !!wrapNode2 && wrapNode2.children[wrapNode2.children.length - 1].name === 'Scrim2', wrapNode2 && wrapNode2.children.map(c => c.name).join(','));
  const btn = kids4.find(n => n.name === 'Button');
  check('an icon button keeps its 44 x 44 box instead of hugging its icon', !!btn && btn.width === 44 && btn.height === 44 && btn.layoutSizingHorizontal !== 'HUG', btn ? `${btn.width}x${btn.height} ${btn.layoutSizingHorizontal}` : kids4.map(n => n.name).join(','));
  const gh = kids4.find(n => n.name === 'GradHeading');
  const ghText = gh && gh.children.find(c => c.type === 'TEXT');
  check('gradient-clipped text paints the gradient on the glyphs, not as a box behind them', !!gh && gh.fills.length === 0 && !!ghText && ghText.fills.some(f => f.type === 'GRADIENT_LINEAR'), gh && JSON.stringify([gh.fills.length, ghText && ghText.fills.map(f => f.type)]));
  const cw2 = kids4.find(n => n.name === 'CenterWrap');
  const crow = cw2 && cw2.children.find(c => c.name === 'Row');
  check('justify-items: center from the grid properties centres the dialog across its column', !!crow && crow.primaryAxisAlignItems === 'CENTER', crow && String(crow.primaryAxisAlignItems));
  const nj = kids4.find(n => n.name === 'NoJiWrap'); const njrow = nj && nj.children.find(c => c.name === 'Row');
  check('a grid without justify-items does not centre by guessing from the measured position', !!njrow && njrow.primaryAxisAlignItems === 'MIN', njrow && String(njrow.primaryAxisAlignItems));
  check('align-items: center keeps the row track height so the item can be centred inside it', !!crow && crow.height === 268, crow && String(crow.height));
  const act = kids4.find(n => n.name === 'Actions');
  check('an element with a saved picture is listed for the picture fill', r4.images.some((i) => i.kind === 'css-picture' && i.file === 'assets/x.media0.png'), JSON.stringify(r4.images.map((i) => i.kind)));
  const pl = kids4.find(n => n.name === 'Pulled'), ts = kids4.find(n => n.name === 'TextStack');
  check('a first child pulled above the padding by a negative margin keeps its measured position', !!pl && pl.layoutMode === 'NONE' && pl.children.find(c => c.name === 'P1').y === -36, pl && pl.layoutMode);
  check('texts whose content boxes overlap a little are still an auto-layout stack', !!ts && ts.layoutMode === 'VERTICAL', ts && ts.layoutMode);
  const br = kids4.find(n => n.name === 'BarRow'); const brows = br ? br.children.filter(c => c.name === 'Row') : [];
  check('items centred in one grid row track stay in one row (the bar is not pushed to a second row)', brows.length === 1 && brows[0].children.length === 3, br && brows.map(r => r.children.length).join('+'));
  const ov = kids4.find(n => n.name === 'Overlap'); const o2 = ov && ov.children.find(c => c.name === 'O2');
  check('children that overlap through a negative margin keep their measured positions (no auto layout)', !!ov && ov.layoutMode === 'NONE' && !!o2 && o2.y === 25, ov && [ov.layoutMode, o2 && o2.y].join(' '));
  const gp = kids4.find(n => n.name === 'Gappy');
  const gnames = gp && gp.children.map(c => c.name + (c.name === 'gap' ? Math.round(c.height) : '')).join(',');
  check('siblings with different gaps keep their exact gaps (fixed spacers, item spacing 0), not one median gap', !!gp && gnames === 'G1,gap5,G2,gap25,G3' && gp.itemSpacing === 0, gnames);
  const ct = kids4.find(n => n.name === 'ClampText');
  check('a line-clamped text keeps the height of its clamped lines and truncates, instead of growing to show every line', !!ct && ct.textAutoResize === 'NONE' && ct.textTruncation === 'ENDING' && ct.maxLines === 2 && ct.height >= 46 && ct.height <= 50, ct && [ct.textAutoResize, ct.textTruncation, ct.maxLines, ct.height].join(' '));
  const tA = kids4.find(n => n.name === 'TileA');
  check('a grid tile taller than its in-flow content keeps its height', !!tA && tA.height === 240 && tA.layoutSizingVertical !== 'FILL', tA && tA.height + ' ' + tA.layoutSizingVertical);
  const tB = kids4.find(n => n.name === 'TileB');
  check('the other tiles of the row follow the first one', !!tB && tB.layoutSizingVertical === 'FILL', tB && String(tB.layoutSizingVertical));
  check('CSS order decides the visual sequence of flex items', !!act && act.children.map(c => c.name).join(',') === 'spacer,Search,Btn,Bell', act && act.children.map(c => c.name).join(','));
  const sp = act && act.children.find(c => c.name === 'spacer');
  check('an auto margin becomes a growing spacer that pushes the item and what follows it to the far side', !!sp && sp.layoutSizingHorizontal === 'FILL', sp && String(sp.layoutSizingHorizontal));
  const ctasNode = kids4.find(n => n.name === 'Ctas'), wrappedNode = kids4.find(n => n.name === 'Wrapped');
  check('a row marked wrap whose children fit on one line does not wrap', !!ctasNode && ctasNode.layoutWrap !== 'WRAP', ctasNode && String(ctasNode.layoutWrap));
  check('a row whose children really sit on two lines still wraps', !!wrappedNode && wrappedNode.layoutWrap === 'WRAP', wrappedNode && String(wrappedNode.layoutWrap));
  check('a multi-layer background keeps every gradient layer, the CSS top layer last in the fill list', !!glow && glow.fills.length === 2 && glow.fills[0].type === 'GRADIENT_LINEAR' && glow.fills[1].type === 'GRADIENT_RADIAL', JSON.stringify(glow && glow.fills.map(f => f.type)));
  const rad = glow && glow.fills.find(f => f.type === 'GRADIENT_RADIAL');
  // radial-gradient(circle at 50% 0%, ..., rgba(0,0,0,0) 60%) on a 300 x 100 box: centre (150, 0), farthest-corner radius hypot(150, 100) = 180.3
  const gtm = rad && rad.gradientTransform, rr = Math.hypot(150, 100);
  check('a radial gradient is placed from its centre and size: node space to gradient space', !!gtm && Math.abs(gtm[0][0] - 300 / (2 * rr)) < 1e-6 && Math.abs(gtm[0][2] - (0.5 - 150 / (2 * rr))) < 1e-6 && Math.abs(gtm[1][2] - 0.5) < 1e-6, JSON.stringify(gtm));
  check('the transparent end of a gradient keeps the colour of its neighbour, not black', !!rad && rad.gradientStops[1].color.a === 0 && Math.abs(rad.gradientStops[1].color.b - 254 / 255) < 1e-6, JSON.stringify(rad && rad.gradientStops[1].color));
}
// ---- an overlay-only frame holds just the scrim and the dialog
{
  const scrim = { k: 'f', n: 'Backdrop', r: [0, 0, 1440, 900], bg: 'rgba(0, 0, 0, 0.5)', bf: 'blur(8px)', L: { pos: 'fixed' } };
  const dialog = { k: 'f', n: 'Dialog', r: [440, 200, 560, 400], bg: 'rgb(255, 255, 255)', L: { d: 'flex', dir: 'column', pos: 'fixed' }, c: [{ k: 't', n: 'Title', r: [24, 24, 200, 30], txt: 'Apply', ff: 'Inter', fs: 20, fw: 600, col: 'rgb(0, 0, 0)', lines: 1 }] };
  const section3 = { overlayOnly: true, width: 1440, cropHeight: 900, add: [scrim, dialog], name: 'Sign in / Dialog @ Desktop 1440', x: 0, y: 4000, hash: 'h777' };
  const code3 = fs.readFileSync(path.join(HERE, '..', 'figma-builder.js'), 'utf8').replace('__SPEC__', JSON.stringify(section3)).replace('__FONTMAP__', JSON.stringify(FONTMAP)).replace('__OPTS__', JSON.stringify({ fixedContainers: true }));
  const run3 = new (Object.getPrototypeOf(async function () {}).constructor)('figma', code3);
  let r3; try { r3 = await run3(figma); } catch (e) { console.error('OVERLAY RUN THREW:', e.message); process.exit(1); }
  const ov = figma.currentPage.children[figma.currentPage.children.length - 1];
  check('an overlay-only frame has the scrim and the dialog and nothing else', ov.children.length === 2 && ov.children[0].name === 'Backdrop' && ov.children[1].name === 'Dialog', ov.children.map(c => c.name).join(','));
  check('an overlay-only frame is transparent, clipped, and viewport-sized', ov.fills.length === 0 && ov.clipsContent === true && ov.width === 1440 && ov.height === 900);
  check('the dialog sits at its page position, the scrim keeps its blur', ov.children[1].x === 440 && ov.children[1].y === 200 && (ov.children[0].effects || []).some(e => e.type === 'BACKGROUND_BLUR'), JSON.stringify((ov.children[0].effects || []).map(e => e.type)));
  check('an overlay-only frame is named and tagged', ov.name === 'Sign in / Dialog @ Desktop 1440' && ov.getSharedPluginData('pipeline', 'hash') === 'h777' && r3.stats.overlayOnly === 1);
}
console.log('\nstats', JSON.stringify(result.stats), '\napproximated', JSON.stringify(result.approximated), '\ndeviations', result.deviationCount);
// ---- sections are placed where CSS paints them: a fixed header that comes first in the page ends up above the content that follows
{
  const AFn = Object.getPrototypeOf(async function () {}).constructor;
  const mkRun = (spec) => new AFn('figma', fs.readFileSync(path.join(HERE, '..', 'figma-builder.js'), 'utf8').replace('__SPEC__', JSON.stringify(spec)).replace('__FONTMAP__', JSON.stringify(FONTMAP)).replace('__OPTS__', JSON.stringify({ fixedContainers: true })));
  const rt = await mkRun({ node: { k: 'f', n: 'Page', r: [0, 0, 400, 300], c: [] }, parentId: null, name: 'PaintOrder', x: 0, y: 9000 })(figma);
  await mkRun({ node: { k: 'f', n: 'hdr', r: [0, 0, 400, 40], bg: 'rgb(0, 0, 0)', L: { d: 'block', pos: 'fixed', z: 50 } }, parentId: rt.rootId, name: 'hdr', dom: 0 })(figma);
  await mkRun({ node: { k: 'f', n: 'main', r: [0, 0, 400, 300], bg: 'rgb(255, 255, 255)', L: { d: 'block' } }, parentId: rt.rootId, name: 'main', dom: 1 })(figma);
  await mkRun({ node: { k: 'f', n: 'foot', r: [0, 300, 400, 40], bg: 'rgb(9, 9, 9)', L: { d: 'block' } }, parentId: rt.rootId, name: 'foot', dom: 2 })(figma);
  const pg = await figma.getNodeByIdAsync(rt.rootId);
  check('a fixed header built first in page order is placed above the content that follows it', pg.children.map((c) => c.name).join(',') === 'main,foot,hdr', pg.children.map((c) => c.name).join(','));
}

if (errors.length) { console.error('\nFAILED:', errors.length); process.exit(1); }
console.log('\nALL OK');
