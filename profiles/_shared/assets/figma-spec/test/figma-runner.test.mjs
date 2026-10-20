// Runs pack-payload.mjs and figma-runner.js: the builder and specs are packed into SVG payloads, "uploaded" into a mock Figma file as
// frames with one TEXT node each, and the runner builds the frames from them with a call of a few hundred characters.
//   node test/figma-runner.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.join(HERE, '..');
const errors = [];
const check = (name, ok, extra = '') => { if (!ok) errors.push(name); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

// ---------- pack: a tiny project folder
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-'));
const sample = JSON.parse(fs.readFileSync(path.join(HERE, 'sample-home@1440.json'), 'utf8'));
const dlgSpec = { root: { k: 'f', n: 'Page', r: [0, 0, 1440, 900], L: { d: 'block' }, c: [] } };
fs.writeFileSync(path.join(tmp, 'home@1440.json'), JSON.stringify(sample));
fs.writeFileSync(path.join(tmp, 'dlg@1440.json'), JSON.stringify(dlgSpec));
const overlay = { k: 'f', n: 'Dialog', r: [440, 200, 560, 400], bg: 'rgb(255, 255, 255)', L: { d: 'flex', dir: 'column', pos: 'fixed' }, c: [{ k: 't', n: 'Title', r: [24, 24, 200, 30], txt: 'Apply $& done', ff: 'Inter', fs: 20, fw: 600, col: 'rgb(0, 0, 0)', lines: 1 }] };
fs.writeFileSync(path.join(tmp, 'frames.json'), JSON.stringify([
  { slug: 'home', name: 'Home / Default', page: 'F-0 · Foundation', viewport: { w: 1440, h: 900 }, hash: 'hh' },
  { slug: 'dlg', name: 'Sign in / Dialog', page: 'F-0 · Foundation', viewport: { w: 1440, h: 900 }, hash: 'hd' },
]));
fs.writeFileSync(path.join(tmp, 'deltas.json'), JSON.stringify([{ slug: 'dlg', reusable: true, cropHeight: 900, width: 1440, add: [overlay] }]));
fs.writeFileSync(path.join(tmp, 'pages.json'), JSON.stringify({ 'F-0 · Foundation': 'page' }));
const FONTMAP = {}; for (const f of sample.fonts) FONTMAP[`${f.family}|${f.weight}|${f.style}`] = { family: f.family, style: f.weight >= 700 ? 'Bold' : f.weight >= 600 ? 'SemiBold' : 'Regular' };
fs.writeFileSync(path.join(tmp, 'fonts.json'), JSON.stringify(FONTMAP));
const out = path.join(tmp, 'payload');
const packed = JSON.parse(execFileSync('node', [path.join(SCRIPTS, 'pack-payload.mjs'), 'pack', '--dir', tmp, '--frames', path.join(tmp, 'frames.json'), '--pages', path.join(tmp, 'pages.json'), '--deltas', path.join(tmp, 'deltas.json'), '--fonts', path.join(tmp, 'fonts.json'), '--out', out], { encoding: 'utf8' }));
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
check('pack writes the builder, the plan and one file per frame', manifest.map((m) => m.name).join(',') === 'builder.js,runner.js,spec-home,spec-dlg,plan.json', manifest.map((m) => m.name).join(','));
check('the overlay frame is packed as an overlay job, the page as a full one', packed.overlayJobs === 1 && packed.jobs === 2);
const decode = (f) => Buffer.from(/>([A-Za-z0-9+/=]+)<\/text>/.exec(fs.readFileSync(path.join(out, f + '.svg'), 'utf8'))[1], 'base64').toString('utf8');
check('a payload decodes back to its content', JSON.parse(decode('spec-dlg')).add[0].c[0].txt === 'Apply $& done' && decode('builder.js').includes('__SPEC__'));
check('a payload file is a valid one-text SVG', fs.readFileSync(path.join(out, 'plan.json.svg'), 'utf8').startsWith('<svg') && (fs.readFileSync(path.join(out, 'plan.json.svg'), 'utf8').match(/<text /g) || []).length === 1);

// ---------- mock Figma, taken from the builder test (the same Plugin API rules)
const bt = fs.readFileSync(path.join(HERE, 'figma-builder.test.mjs'), 'utf8');
const mock = bt.slice(bt.indexOf('// ---------- mock Figma ----------'), bt.indexOf('const run = new'));
const AF = Object.getPrototypeOf(async function () {}).constructor;
const runnerTpl = fs.readFileSync(path.join(SCRIPTS, 'figma-runner.js'), 'utf8');
const body = `${mock}
Node.prototype.findOne = function (fn) { for (const c of this.children) { if (fn(c)) return c; const d = c.findOne && c.findOne(fn); if (d) return d; } return null; };
Node.prototype.loadAsync = async function () {};
const payloadPage = new Node('PAGE');
const put = (name, text) => { const fr = new Node('FRAME'); fr.name = name; const t = new Text(); t.name = 'DATA'; t._chars = Buffer.from(text, 'utf8').toString('base64'); fr.children.push(t); t.parent = fr; payloadPage.children.push(fr); fr.parent = payloadPage; return fr; };
for (const m of manifest) { const svg = fs.readFileSync(path.join(out, m.file), 'utf8'); const b64 = /<text[^>]*>([^<]+)<\\/text>/.exec(svg)[1]; put(m.file, Buffer.from(b64, 'base64').toString('utf8')); }
// the call a build makes: a bootstrap that reads runner.js from the file and runs it with RUN
const boot = "const AF=Object.getPrototypeOf(async function(){}).constructor;const P=await figma.getNodeByIdAsync('" + payloadPage.id + "');await P.loadAsync();const n=P.children.find(c=>/^runner\.js/.test(c.name));const src=decodeURIComponent(escape(atob(n.findOne(t=>t.type==='TEXT').characters)));return await new AF('figma','RUN','atob',src)(figma,{payloadPage:'" + payloadPage.id + "',from:0,budgetMs:30000},atob);";
const callChars = boot.length;
const result = await new AF('figma', 'atob', boot)(figma, atob);
return { result, figma, callChars, payloadPage };
`;
let out2;
try { out2 = await new AF('fs', 'path', 'manifest', 'out', 'runnerTpl', 'Buffer', 'AF', body)(fs, path, manifest, out, runnerTpl, Buffer, AF); } catch (e) { console.error('RUNNER THREW:', e.message); process.exit(1); }
const { result, figma, callChars } = out2;
check('the runner builds every job and says it is done', result.done === true && result.built.length === 2 && result.errors.length === 0, JSON.stringify({ done: result.done, built: result.built.length, errors: result.errors }));
check('the call that carries the whole run is a small bootstrap, not the builder or the runner', callChars < 700, callChars + ' chars');
const top = figma.currentPage.children;
const home = top.find((n) => n.name === 'Home / Default');
check('the page was built section by section from the payload', !!home && home.children.length >= 3 && result.built[0].sections >= 3, home && `${home.children.length} children, ${result.built[0].sections} sections`);
check('the frame is tagged with the plan hash', home.getSharedPluginData('pipeline', 'hash') === 'hh');
const dlg = top.find((n) => n.name === 'Sign in / Dialog');
check('the overlay frame is overlay-only: transparent, clipped, holding just the dialog', !!dlg && dlg.fills.length === 0 && dlg.clipsContent === true && dlg.children.length === 1 && dlg.children[0].name === 'Dialog');
const title = (function w(n) { if (n.type === 'TEXT') return n; for (const c of n.children) { const r = w(c); if (r) return r; } return null; })(dlg);
check('a "$&" in a spec is kept as text, not read as a replace pattern', !!title && title.characters === 'Apply $& done', title && title.characters);
check('the result is compact and lists the images to fill', Array.isArray(result.images) && result.stats.frames > 5, JSON.stringify(result.stats).slice(0, 80));

if (errors.length) { console.error('\nFAILED:', errors.length); process.exit(1); }
console.log('\nALL OK');
