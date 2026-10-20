// Extracts a small SYNTHETIC site with extract-spec.mjs (a real browser through Playwright) and checks what the extractor and the
// frame options produce. The site has nothing to do with any project: it holds the patterns every project meets (a dialog opened by a
// click, a typed value, a stored setting, a dashed progress ring, a mirrored SVG arrow, a background image, a gradient heading, an
// animated link underline). Skipped when the helper packages (playwright-core, pngjs, pixelmatch) are not installed.
//   node test/extract-spec.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile); // async: the test's own web server must keep answering while the extractor runs

const HERE = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.join(os.homedir(), '.claude', 'design-pipeline', 'tools', 'figma');
try { createRequire(path.join(toolsDir, 'package.json'))('playwright-core'); } catch (e) { console.log('SKIP extract-spec test: playwright-core is not installed in ' + toolsDir); process.exit(0); }

const errors = [];
const check = (name, ok, extra = '') => { if (!ok) errors.push(name); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const files = {
  '/index.html': ['text/html', `<!doctype html><meta charset="utf-8"><title>t</title>
<style>.dashed{stroke-dasharray:100 200} body{margin:0;font:16px Arial;width:600px} #dlg{display:none;position:fixed;left:100px;top:80px;width:300px;height:160px;background:#fff;border:1px solid #ccc} #dlg.on{display:block}
h1{margin:0;background:linear-gradient(90deg,#1e40af,#3b82f6);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block}
.flip{transform:scaleX(-1)} .hero{width:200px;height:80px;background-image:url(bg.png)} .u{display:inline-block;background:linear-gradient(currentColor,currentColor) no-repeat 0 100%/0 2px}</style>
<h1>Title</h1> <button id="open" onclick="document.getElementById('dlg').className='on'">Open</button>
<div id="lang"></div><script>document.getElementById('lang').textContent=localStorage.getItem('lang')||'none'</script>
<input id="name" placeholder="Your name">
<svg id="ring" width="60" height="60" viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" fill="none" stroke="#2563eb" stroke-width="6" stroke-dasharray="100 200"/></svg>
<span id="trans" style="display:inline-block;width:40px;height:40px;background:conic-gradient(rgba(37,99,235,.5) 50%, transparent 0)"></span>
<span id="cring" style="display:inline-block;width:60px;height:60px;border-radius:50%;background:conic-gradient(#2563eb 72%, #e5e7eb 0)"><b>72</b></span>
<svg id="ring2" width="60" height="60" viewBox="0 0 60 60"><circle class="dashed" cx="30" cy="30" r="25" fill="none" stroke="#2563eb" stroke-width="6"/></svg>
<svg id="plain" width="24" height="24" viewBox="0 0 24 24"><path d="M4 6h16" stroke="#000"/></svg>
<img class="flip" src="arrow.svg" width="24" height="24"> <img id="bigimg" src="big.svg" width="80" height="40"> <img class="flip2" src="arrow.svg" width="24" height="24" style="scale:-1 1"> <div class="hero"></div> <a class="u" href="#">underlined</a>
<div id="row" style="display:flex;width:300px;gap:8px"><span id="ra">A</span><span id="rb" style="margin-left:auto;order:2">B</span><span id="rc">C</span></div>
<div id="dlg">Dialog text <input id="email"></div>`],
  '/arrow.svg': ['image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 12h12M10 6l6 6-6 6" stroke="#000" fill="none"/></svg>'],
  '/big.svg': ['image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40" viewBox="0 0 80 40"><defs><mask id="m"><rect width="80" height="40" fill="white"/><circle cx="20" cy="20" r="10" fill="black"/></mask></defs><rect width="80" height="40" fill="#2563eb" mask="url(#m)"/></svg>'],
  '/bg.png': ['image/png', PNG1],
};
const server = http.createServer((req, res) => { const f = files[req.url.split('?')[0]]; if (!f) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': f[0] }); res.end(f[1]); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-test-'));
fs.writeFileSync(path.join(tmp, 'frames.json'), JSON.stringify([
  { slug: 'plain', route: '/index.html', viewport: { label: 'Test 600', w: 600, h: 500 }, local: { lang: 'en-test' } },
  { slug: 'opened', route: '/index.html', viewport: { label: 'Test 600', w: 600, h: 500 }, steps: [{ click: '#open' }, { fill: ['#email', 'a@b.co'] }, { click: '#nothing-here' }], local: { lang: 'en-test' } },
]));
let outText;
try { outText = (await execFileAsync('node', [path.join(HERE, '..', 'extract-spec.mjs'), '--base', base, '--frames', path.join(tmp, 'frames.json'), '--out', path.join(tmp, 'out')], { encoding: 'utf8', timeout: 150000 })).stdout; }
catch (e) { server.close(); console.error('EXTRACT FAILED:', String(e.stdout || e.message).slice(0, 400)); process.exit(1); }
server.close();

const load = (slug) => JSON.parse(fs.readFileSync(path.join(tmp, 'out', `${slug}@600.json`), 'utf8'));
const all = (root) => { const out = []; (function w(n) { out.push(n); (n.c || []).forEach(w); })(root); return out; };
const plain = all(load('plain').root), opened = all(load('opened').root);
const texts = (nodes) => nodes.filter((n) => n.k === 't').map((n) => n.txt || (n.runs || []).map((r) => r.txt).join(''));
const index = JSON.parse(fs.readFileSync(path.join(tmp, 'out', 'index.json'), 'utf8'));

check('a frame\'s local settings are applied before the page loads', texts(plain).includes('en-test'), JSON.stringify(texts(plain)));
check('without steps the dialog is not in the page', !texts(plain).some((t) => /Dialog text/.test(t)));
check('steps reach a state by interaction (click opens the dialog)', texts(opened).some((t) => /Dialog text/.test(t)), JSON.stringify(texts(opened)));
const email = opened.find((n) => n.inp && n.ph === 'a@b.co');
check('a fill step types a value, and the spec keeps it as the input\'s text', !!email, JSON.stringify(opened.filter((n) => n.inp).map((n) => [n.inp, n.ph])));
const entry = index.frames.find((f) => f.slug === 'opened');
check('a step that fails is reported and does not stop the frame', Array.isArray(entry.stepErrors) && entry.stepErrors.length === 1 && !entry.error, JSON.stringify(entry.stepErrors));
const name = plain.find((n) => n.inp === 'text' && n.ph === 'Your name');
check('an input\'s placeholder is kept with its own colour', !!name && !!name.tp && !!name.tp.col, name && JSON.stringify(name.tp && name.tp.col));
const ring = plain.find((n) => n.k === 'i' && n.kind === 'svg-picture');
check('an SVG Figma cannot import (dashed stroke) is saved as a picture', !!ring && fs.existsSync(path.join(tmp, 'out', ring.file)), ring && ring.file);
check('a dash pattern set by a stylesheet makes the SVG a picture too', plain.filter((n) => n.k === 'i' && n.kind === 'svg-picture').length >= 2, String(plain.filter((n) => n.kind === 'svg-picture').length));
const transNode = plain.find((n) => n.bgfile && /conic-gradient\(rgba/.test('') ) || plain.filter((n) => n.bgfile).find((n) => { try { const { PNG } = createRequire(path.join(toolsDir, 'package.json'))('pngjs'); const png = PNG.sync.read(fs.readFileSync(path.join(tmp, 'out', n.bgfile))); return png.width <= 42 && png.data.some((v, i) => i % 4 === 3 && v === 0); } catch (e) { return false; } });
check('a saved picture keeps its transparent parts transparent (not the page background)', !!transNode, transNode && transNode.bgfile);
const bigPic = plain.find((n) => n.k === 'i' && n.file && n.r[2] === 80);
let bigOk = false; try { const { PNG } = createRequire(path.join(toolsDir, 'package.json'))('pngjs'); const png = PNG.sync.read(fs.readFileSync(path.join(tmp, 'out', bigPic.file))); let clear = 0, blue = 0; for (let i = 0; i < png.data.length; i += 4) { if (png.data[i + 3] === 0) clear++; else if (png.data[i + 2] > 200) blue++; } bigOk = png.width === 80 && png.height === 40 && clear > 100 && blue > 1000; } catch (e) {}
check('an image whose SVG has a mask is rendered alone, at its size, with its mask hole transparent', bigOk, bigPic && bigPic.file);
const cring = plain.find((n) => n.bgfile && all(n).some((c) => c.k === 't' && /72/.test(c.txt || (c.runs || []).map((r) => r.txt).join(''))));
check('an element painted by a conic gradient gets its pixels as its fill, with its text still a layer on top', !!cring && !cring.bgi && fs.existsSync(path.join(tmp, 'out', cring.bgfile)) && all(cring).some((c) => c.k === 't' && /72/.test(c.txt || (c.runs || []).map((r) => r.txt).join(''))), cring && JSON.stringify([cring.bgfile, !!cring.bgi, (cring.c || []).length]));
const vec = plain.filter((n) => n.k === 's');
check('a plain inline SVG stays a vector', vec.some((n) => /M4 6h16/.test(n.svg || '')), vec.length + ' svg nodes');
const arrow = vec.find((n) => /M4 12h12/.test(n.svg || ''));
check('an <img> SVG becomes a vector, and a mirrored one stays mirrored', !!arrow && /matrix\(-1 0 0 1 /.test(arrow.svg), arrow && arrow.svg.slice(0, 160));
check('a mirror written as the scale property is kept too (the transform property is none)', vec.filter((n) => /matrix\(-1 0 0 1 /.test(n.svg || '')).length === 2, String(vec.filter((n) => /matrix\(-1 0 0 1 /.test(n.svg || '')).length));
check('a CSS background image is kept in the spec', plain.some((n) => /url\(/.test(n.bgi || '')));
check('a hair-thin gradient strip (an animated underline) is not a fill', !plain.some((n) => n.n === 'u' && n.bgi) && !plain.some((n) => /underlined/.test(n.txt || '') && n.bgi));
const h1 = plain.find((n) => n.k === 'f' && /gradient/.test(n.bgi || '') && (n.c || []).some((c) => c.k === 't'));
check('gradient-clipped text keeps its gradient and its transparent colour for the builder', !!h1 && /rgba\(0, 0, 0, 0\)/.test(h1.c.find((c) => c.k === 't').col || ''));
const rowNode = plain.find((n) => n.k === 'f' && n.L && n.L.d === 'flex' && (n.c || []).some((c) => c.F && c.F.ma));
const bNode = rowNode && rowNode.c.find((c) => c.F && c.F.ma);
check('an auto margin and the CSS order of a flex item are kept in the spec', !!bNode && bNode.F.ma === 'l' && bNode.F.o === 2, bNode && JSON.stringify(bNode.F));

if (errors.length) { console.error('\nFAILED:', errors.length); process.exit(1); }
console.log('\nALL OK');
