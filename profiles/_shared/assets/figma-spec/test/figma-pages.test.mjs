// Runs figma-pages.js against a mock Figma file (pages, ordering, clone, rename).
//   node test/figma-pages.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const template = fs.readFileSync(path.join(HERE, '..', 'figma-pages.js'), 'utf8');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;

let nextId = 1;
const mkPage = (name) => ({ id: '0:' + nextId++, type: 'PAGE', name, children: [], backgrounds: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }], async loadAsync() {}, clone() { const c = mkPage(this.name + ' copy'); c.children = [...this.children]; root.children.push(c); return c; } });
const root = { name: 'Untitled', children: [mkPage('Page 1')], insertChild(i, p) { const k = root.children.indexOf(p); root.children.splice(k, 1); root.children.splice(i, 0, p); } };
const figma = { root, createPage() { const p = mkPage('Page'); root.children.push(p); return p; }, async getNodeByIdAsync(id) { return root.children.find(p => p.id === id) || null; } };

const BG = { r: 0x27 / 255, g: 0x27 / 255, b: 0x27 / 255 };
const run = async (plan) => new AsyncFn('figma', template.replace('__PLAN__', JSON.stringify({ background: BG, ...plan })))(figma);
const names = () => root.children.map(p => p.name);
const D = (n) => `———  ${n}  ———`;
let bad = 0;
const check = (n, ok, extra = '') => { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  ' + extra)); };

const plan = { fileName: 'Demo — v1.0', features: [{ id: 'F-0', name: 'Foundation' }, { id: 'F-1', name: 'Challenges' }] };
const expected = ['Cover', D('Overview'), 'Specs & Guidelines', 'Product Flows', 'Components', 'Handoff status', 'Changelog', D('Features'), 'F-0 · Foundation', 'F-1 · Challenges', D('Archive'), 'Archive'];

let r = await run(plan);
check('first run creates the exact page order', JSON.stringify(names()) === JSON.stringify(expected), JSON.stringify(names()));
check('default Page 1 reused as Cover', r.renamed.some(x => x[0] === 'Page 1' && x[1] === 'Cover') && root.children.length === expected.length);
check('every page has the #272727 background', root.children.every(p => Math.abs(p.backgrounds[0].color.r - BG.r) < 0.002));
check('file renamed', root.name === 'Demo — v1.0' && r.fileRenamed === true);

r = await run(plan);
check('second run changes nothing (idempotent)', r.created.length === 0 && r.moved.length === 0 && r.renamed.length === 0 && r.backgrounds === 0 && r.archived.length === 0, JSON.stringify(r));

const f1 = root.children.find(p => p.name.startsWith('F-1'));
r = await run({ ...plan, fileName: 'Demo — v1.1', archive: [{ pageId: f1.id, fromVersion: 'v1.0' }] });
const copyName = 'v1.0 · F-1 · Challenges';
check('archive run clones with the version prefix', names().includes(copyName), JSON.stringify(names()));
check('archived copy sits after the Archive index page', names().indexOf(copyName) === names().indexOf('Archive') + 1, JSON.stringify(names()));
check('archived copy has the background', root.children.find(p => p.name === copyName).backgrounds[0].color.r < 0.2);
check('file renamed to the new version', root.name === 'Demo — v1.1');

r = await run({ ...plan, fileName: 'Demo — v1.1', features: [{ id: 'F-0', name: 'Foundation' }, { id: 'F-1', name: 'Quests' }] });
check('renamed feature keeps its page and order', names()[9] === 'F-1 · Quests' && names().length === expected.length + 1, JSON.stringify(names()));
check('archived copy is not treated as unknown', r.unknownPages.length === 0, JSON.stringify(r.unknownPages));

const hand = figma.createPage(); hand.name = 'Sandbox';
r = await run({ ...plan, fileName: 'Demo — v1.1', features: [{ id: 'F-0', name: 'Foundation' }, { id: 'F-1', name: 'Quests' }] });
check('hand-made page is kept after the archive group', names()[names().length - 1] === 'Sandbox' && r.unknownPages.includes('Sandbox'), JSON.stringify(names()));

if (bad) { console.error('\nFAILED: ' + bad); process.exit(1); }
console.log('\nALL OK');
