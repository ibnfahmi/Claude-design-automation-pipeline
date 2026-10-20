// Runs export-lint.mjs on a tiny synthetic project and checks each pattern is found, and clean code is not flagged.
//   node test/export-lint.test.mjs
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
fs.mkdirSync(path.join(tmp, 'node_modules')); fs.writeFileSync(path.join(tmp, 'node_modules', 'x.css'), '.a{float:left}');
fs.writeFileSync(path.join(tmp, 'bad.css'), '.a{position:absolute;left:50%;transform:translate(-50%,-50%)}\n.b::after{\n content:"New";\n}\n.c{margin-left:-12px;float:right}\nh1{background-clip:text}\n@keyframes marquee{to{transform:translateX(-50%)}}\n');
fs.writeFileSync(path.join(tmp, 'bad.html'), '<section><svg><circle stroke-dasharray="1 2"/><mask id="m"/></svg></section>\n<section data-name="Hero"></section>');
fs.writeFileSync(path.join(tmp, 'good.css'), '.a{display:grid;place-items:center;gap:8px}.b::before{content:""}');
const out = JSON.parse(execFileSync('node', [path.join(HERE, '..', 'export-lint.mjs'), '--dir', tmp, '--json'], { encoding: 'utf8' }));
const rules = Object.fromEntries(out.summary.map((s) => [s.rule, s.count]));
const errors = []; const check = (n, ok, e = '') => { if (!ok) errors.push(n); console.log((ok ? 'PASS ' : 'FAIL ') + n + (e ? '  ' + e : '')); };
check('transform centring is found (translate(-50%) and the keyframe use too)', rules['centre-transform'] >= 1, JSON.stringify(rules));
check('visible text in a pseudo-element is found, an empty content is not', rules['pseudo-text'] === 1, JSON.stringify(rules));
check('negative margin, float, gradient text, dashed stroke, mask, marquee are found', ['negative-margin', 'float', 'clip-text', 'svg-dash', 'svg-effect', 'marquee'].every((r) => rules[r] === 1), JSON.stringify(rules));
check('only the section without data-name is flagged', rules['unnamed-section'] === 1, JSON.stringify(rules));
check('node_modules and clean files are skipped', !out.summary.some((s) => s.where.some((w) => /node_modules|good\.css/.test(w))));
if (errors.length) { console.error('FAILED', errors.length); process.exit(1); } console.log('\nALL OK');
