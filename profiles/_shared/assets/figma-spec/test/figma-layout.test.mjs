// Runs figma-layout.js against mock nodes.   node test/figma-layout.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const template = fs.readFileSync(path.join(HERE, '..', 'figma-layout.js'), 'utf8');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;

const store = {}; let n = 1;
const mk = (w, h) => { const id = '1:' + n++; store[id] = { id, x: 0, y: 0, width: w, height: h }; return id; };
const figma = { async getNodeByIdAsync(id) { return store[id] || null; } };

// Two size blocks, three columns (entry, main, next); main has 2 extra states; mobile is narrower
const mkFrame = (w, h) => ({ id: mk(w, h), cardId: mk(Math.max(240, w), 96), noteId: mk(w, 120) });
const desk = { size: 'Desktop 1440', columns: [{ step: 'Entry', frames: [mkFrame(1440, 900)] }, { step: 'Main', frames: [mkFrame(1440, 1200), mkFrame(1440, 900), mkFrame(1440, 900)] }, { step: 'Next', frames: [mkFrame(1440, 800)] }] };
const mob = { size: 'Mobile 390', columns: [{ step: 'Entry', frames: [mkFrame(390, 844)] }, { step: 'Main', frames: [mkFrame(390, 1500), mkFrame(390, 844), mkFrame(390, 844)] }, { step: 'Next', frames: [mkFrame(390, 844)] }] };
const plan = { originX: 0, originY: 600, gapX: 80, gapY: 64, gapBlock: 160, cardH: 96, noteH: 0, blocks: [desk, mob] };

const r = await new AsyncFn('figma', template.replace('__PLAN__', JSON.stringify(plan)))(figma);
let bad = 0;
const check = (name, ok, extra = '') => { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + extra)); };
const P = (id) => r.placed.find(p => p.id === id);

check('columns run left to right in order', r.columnX[0] < r.columnX[1] && r.columnX[1] < r.columnX[2], JSON.stringify(r.columnX));
check('column gap is 80', r.columnX[1] - r.columnX[0] === 1440 + 80 && r.columnX[2] - r.columnX[1] === 1440 + 80, JSON.stringify(r.columnX));
const main = desk.columns[1].frames;
check('states stack below their screen at the same x', main.every(f => P(f.id).x === r.columnX[1]) && P(main[1].id).y > P(main[0].id).y + 1200 && P(main[2].id).y > P(main[1].id).y + 900);
check('label card sits above its frame, same x', main.every(f => store[f.cardId].x === P(f.id).x && store[f.cardId].y + store[f.cardId].height <= P(f.id).y));
check('dev note sits under its frame', main.every(f => store[f.noteId].y >= P(f.id).y + P(f.id).h));
const mobMain = mob.columns[1].frames;
check('smaller size block is below the larger one', Math.min(...mob.columns.flatMap(c => c.frames.map(f => store[f.cardId].y))) > Math.max(...desk.columns.flatMap(c => c.frames.map(f => P(f.id).y + P(f.id).h))));
check('same column x in every size block', mob.columns.every((c, i) => c.frames.every(f => P(f.id).x === r.columnX[i])));
// no overlaps among all frames, cards, notes
const boxes = Object.values(store).map(s => ({ id: s.id, x: s.x, y: s.y, w: s.width, h: s.height }));
let overlap = null;
for (let i = 0; i < boxes.length && !overlap; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) { overlap = [a.id, b.id]; break; } }
check('nothing overlaps', !overlap, JSON.stringify(overlap));
check('returns the next free y below the last block', r.nextFreeY > P(mobMain[2].id).y + 844);

if (bad) { console.error('\nFAILED: ' + bad); process.exit(1); }
console.log('\nALL OK');
