// Library first: runs figma-builder.js against a mock Figma API to check that
//   1. a component is built from its canonical spec (SPEC.asComponent),
//   2. later screens get instances of it, with their own text and size,
//   3. a node that does not match (different text count, unknown component) is built as a normal frame.
//   node test/figma-library.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const template = fs.readFileSync(path.join(HERE, '..', 'figma-builder.js'), 'utf8');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;

// ---------- mock Figma (loose on layout rules; those are covered by figma-builder.test.mjs) ----------
let nextId = 1;
const registry = new Map();
class Node {
  constructor(type) { this.id = '1:' + nextId++; this.type = type; this.children = []; this.parent = null; this.name = type; this.width = 100; this.height = 100; this.x = 0; this.y = 0; this._pd = {}; registry.set(this.id, this); }
  appendChild(c) { if (c.parent) c.parent.children = c.parent.children.filter(x => x !== c); c.parent = this; this.children.push(c); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); this.parent = null; }
  resize(w, h) { this.width = w; this.height = h; }
  findAll(fn) { const out = []; (function w(n) { for (const c of n.children) { if (fn(c)) out.push(c); w(c); } })(this); return out; }
  setBoundVariable() {}
  setSharedPluginData(ns, k, v) { this._pd[ns + ':' + k] = v; }
  getSharedPluginData(ns, k) { return this._pd[ns + ':' + k] || ''; }
  setPluginData() { throw new Error('setPluginData is not supported in this host'); }
  createInstance() {
    const clone = (n, type) => { const c = n.type === 'TEXT' ? new Text() : new Node(type || n.type); Object.assign(c, { name: n.name, width: n.width, height: n.height, layoutMode: n.layoutMode }); if (n.type === 'TEXT') { c._chars = n._chars; c.fontName = n.fontName; } c.children = n.children.map(k => { const kc = clone(k); kc.parent = c; return kc; }); return c; };
    return clone(this, 'INSTANCE');
  }
}
class Text extends Node {
  constructor() { super('TEXT'); this._chars = ''; this.fontName = { family: 'Inter', style: 'Regular' }; }
  get characters() { return this._chars; }
  set characters(v) { this._chars = v; }
  getStyledTextSegments() { return [{ fontName: this.fontName }]; }
}
const loaded = new Set();
const figma = {
  mixed: Symbol('mixed'),
  currentPage: new Node('PAGE'),
  createFrame() { return new Node('FRAME'); },
  createAutoLayout(dir = 'HORIZONTAL') { const n = new Node('FRAME'); n.layoutMode = dir; return n; },
  createText() { return new Text(); },
  createRectangle() { return new Node('RECTANGLE'); },
  createNodeFromSvg() { return new Node('FRAME'); },
  createComponentFromNode(n) { n.type = 'COMPONENT'; return n; },
  async loadFontAsync(f) { loaded.add(f.family + '|' + f.style); },
  async getNodeByIdAsync(id) { return registry.get(id) || null; },
  async setCurrentPageAsync() {},
  variables: { async getVariableByIdAsync() { return null; }, setBoundVariableForPaint(p) { return p; } },
};

const FONTMAP = { 'Inter|600|normal': { family: 'Inter', style: 'SemiBold' }, 'Inter|400|normal': { family: 'Inter', style: 'Regular' } };
const run = async (section, opts = {}) => new AsyncFn('figma', template
  .replace('__SPEC__', JSON.stringify(section)).replace('__FONTMAP__', JSON.stringify(FONTMAP)).replace('__OPTS__', JSON.stringify({ fixedContainers: true, ...opts })))(figma);

// ---------- specs ----------
const text = (txt, x, w) => ({ k: 't', n: txt, r: [x, 12, w, 20], txt, ff: 'Inter', fs: 16, fw: 600, lh: 20, col: 'rgb(255, 255, 255)', lines: 1 });
const button = (label, w, extra = {}) => ({ k: 'f', n: 'button', act: 'button', comp: 'Button', sig: 'S1', r: [0, 0, w, 44], bg: 'rgb(110, 60, 220)', rad: [8, 8, 8, 8], L: { d: 'flex', dir: 'row', jc: 'center', ai: 'center', gap: [0, 0], pad: [12, 24, 12, 24] }, c: [text(label, 24, w - 48)], ...extra });
const screen = (kids) => ({ k: 'f', n: 'Page', r: [0, 0, 393, 400], bg: 'rgb(255, 255, 255)', L: { d: 'flex', dir: 'col', jc: 'flex-start', ai: 'flex-start', gap: [16, 0], pad: [24, 24, 24, 24] }, c: kids.map((k, i) => ({ ...k, r: [24, 24 + i * 60, k.r[2], k.r[3]] })) });

let bad = 0;
const check = (n, ok, extra = '') => { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  ' + extra)); };

// 1. library build
let r = await run({ node: button('Join', 140), parentId: null, name: 'Button', x: 0, y: 0, asComponent: { name: 'Button / Primary' } });
const comp = registry.get(r.rootId);
check('the canonical spec becomes a component', comp && comp.type === 'COMPONENT' && comp.name === 'Button / Primary', JSON.stringify(r.root));
check('the component is tagged with its name and signature', comp.getSharedPluginData('pipeline', 'component') === 'Button' && comp.getSharedPluginData('pipeline', 'sig') === 'S1');
check('the component is tagged as built from a spec', comp.getSharedPluginData('pipeline', 'source') === 'spec');
const compTexts = comp.findAll(n => n.type === 'TEXT');
check('the component holds its text', compTexts.length === 1 && compTexts[0].characters === 'Join');

// 2. a screen built from instances
const OPTS = { components: { 'Button|S1': { id: comp.id } } };
figma.currentPage.children = [];
r = await run({ node: screen([button('Join meeting', 200), button('Schedule', 120)]), parentId: null, name: 'Home / Default', x: 0, y: 0 }, OPTS);
const home = registry.get(r.rootId);
const insts = home.findAll(n => n.type === 'INSTANCE');
check('both buttons became instances of the component', insts.length === 2 && r.stats.instances === 2, JSON.stringify(r.stats));
check('each instance has its own text', insts[0].findAll(n => n.type === 'TEXT')[0].characters === 'Join meeting' && insts[1].findAll(n => n.type === 'TEXT')[0].characters === 'Schedule');
check('the component itself keeps its text', compTexts[0].characters === 'Join');
check('each instance has its measured size', insts[0].width === 200 && insts[1].width === 120 && insts[0].height === 44);
check('instances sit inside the screen frame', insts.every(i => i.parent && i.parent.parent === home || i.parent === home));
check('no approximations were reported', r.approximated.length === 0, JSON.stringify(r.approximated));

// 3. fallbacks
figma.currentPage.children = [];
const twoTexts = button('Two', 160, { c: [text('Two', 24, 40), text('Lines', 80, 40)] });
r = await run({ node: screen([twoTexts]), parentId: null, name: 'Mismatch', x: 0, y: 0 }, OPTS);
const mism = registry.get(r.rootId);
check('a node with a different text count is built as a frame', mism.findAll(n => n.type === 'INSTANCE').length === 0 && r.stats.instances === 0);
check('the mismatch is reported', r.approximated.some(a => /component mismatch/.test(a)), JSON.stringify(r.approximated));
check('the discarded instance is not left behind', !mism.findAll(n => n.type === 'INSTANCE').length);

figma.currentPage.children = [];
r = await run({ node: screen([button('Other', 100, { sig: 'S2' })]), parentId: null, name: 'Unknown', x: 0, y: 0 }, OPTS);
check('an unknown signature is built as a normal frame', registry.get(r.rootId).findAll(n => n.type === 'INSTANCE').length === 0);

figma.currentPage.children = [];
r = await run({ node: screen([button('Join', 140)]), parentId: null, name: 'Missing component', x: 0, y: 0 }, { components: { 'Button|S1': { id: '9:999' } } });
check('a missing component id is reported and built as a frame', r.approximated.some(a => /component not found/.test(a)) && registry.get(r.rootId).findAll(n => n.type === 'INSTANCE').length === 0, JSON.stringify(r.approximated));

if (bad) { console.error('\nFAILED: ' + bad); process.exit(1); }
console.log('\nALL OK');
