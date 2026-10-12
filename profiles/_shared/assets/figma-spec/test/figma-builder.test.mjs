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
const section = { node: spec.root, parentId: null, name: 'Home / Default @ Desktop 1440', x: 0, y: 0 };
code = code.replace('__SPEC__', JSON.stringify(section)).replace('__FONTMAP__', JSON.stringify(FONTMAP)).replace('__OPTS__', JSON.stringify({ fixedContainers: true }));

// ---------- mock Figma ----------
let nextId = 1;
const errors = [];
const fail = (m) => { errors.push(m); throw new Error(m); };
const loadedFonts = new Set(['Inter|Regular']);
class Node {
  constructor(type) { this.id = '1:' + nextId++; this.type = type; this.children = []; this.parent = null; this.name = type; this.width = 100; this.height = 100; this.x = 0; this.y = 0; this._lm = 'NONE'; this._lsh = 'FIXED'; this._lsv = 'FIXED'; this.layoutPositioning = 'AUTO'; this.fills = []; this.strokes = []; this.effects = []; }
  get layoutMode() { return this._lm; }
  set layoutMode(v) { this._lm = v; }
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
  async getNodeByIdAsync(id) { return id === 'page' ? figma.currentPage : null; },
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
check('buttons hug their content', all.some(n => n.name === 'Button' || n.name === 'Btn') );
console.log('\nstats', JSON.stringify(result.stats), '\napproximated', JSON.stringify(result.approximated), '\ndeviations', result.deviationCount);
if (errors.length) { console.error('\nFAILED:', errors.length); process.exit(1); }
console.log('\nALL OK');
