// Export-readiness lint: finds, in a project's source, the patterns a Figma export cannot draw faithfully, so they are known before the
// export is paid for. It reads files only and never changes them; every finding names the file, the line and what to do instead.
//   node export-lint.mjs --dir <project folder> [--json]
// Findings are advice, never blockers: a pattern the reference needs stays, and the advice is to isolate it (see "Export-friendly
// authoring" in code-quality.md).
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const root = path.resolve(String(arg('dir', '.')));
const SKIP = /^(node_modules|dist|build|\.git|\.next|share|figma-spec|test-results|coverage)$/;
const EXT = /\.(css|scss|less|html|htm|jsx|tsx|js|vue|svelte|svg)$/i;

const RULES = [
  { id: 'centre-transform', sev: 'major', re: /translate(?:[XY])?\(\s*-50%/g, ext: /css|scss|less|html|jsx|tsx|vue|svelte/i,
    say: 'Centring with transform: translate(-50%). Centre with flex or grid on the parent (place-items / justify-content / align-items).' },
  { id: 'pseudo-text', sev: 'major', re: /::?(?:before|after)\s*\{[^}]*content:\s*(?:"[^"\s][^"]*"|'[^'\s][^']*'|attr\()/g, ext: /css|scss|less|html|vue|svelte/i, multi: true,
    say: 'Visible text in ::before/::after content. Put text in a real element so it exports as text.' },
  { id: 'negative-margin', sev: 'minor', re: /margin(?:-[a-z]+)?\s*:\s*-\d/g, ext: /css|scss|less|html|vue|svelte/i,
    say: 'Negative margin. Use gap or padding so the spacing maps to auto-layout.' },
  { id: 'float', sev: 'minor', re: /\bfloat\s*:\s*(?:left|right)/g, ext: /css|scss|less|html|vue|svelte/i,
    say: 'float. Use flex or grid.' },
  { id: 'clip-text', sev: 'minor', re: /background-clip\s*:\s*text/g, ext: /css|scss|less|html|vue|svelte/i,
    say: 'Gradient text (background-clip: text). Exported as a glyph gradient; keep it on its own element, nothing else inside it.' },
  { id: 'svg-dash', sev: 'major', re: /stroke-dasharray/g, ext: /css|scss|less|html|htm|jsx|tsx|vue|svelte|svg/i,
    say: 'Dashed SVG stroke (a progress ring, for example). Figma does not import it as a vector; it becomes a picture. Keep the whole ring in one svg element.' },
  { id: 'svg-effect', sev: 'major', re: /<(?:mask|filter|pattern|foreignObject)\b/g, ext: /html|htm|jsx|tsx|vue|svelte|svg/i,
    say: 'SVG mask, filter, pattern or foreignObject. Figma does not import it; it becomes a picture. Keep it in its own svg element.' },
  { id: 'marquee', sev: 'minor', re: /@keyframes\s+[\w-]*(?:marquee|ticker)[\w-]*/gi, ext: /css|scss|less|html|vue|svelte/i,
    say: 'Marquee or ticker. Keep it as a normal row of items with the motion added on top, so the first frame is a clean row.' },
  { id: 'unnamed-section', sev: 'minor', re: /<(?:section|article|header|footer|nav|aside|main)\b(?![^>]*data-name)[^>]*>/g, ext: /html|htm|jsx|tsx|vue|svelte/i,
    say: 'Section without data-name. Add data-name="Hero" (and so on) so the Figma layer gets a readable name.' },
];

const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (SKIP.test(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (EXT.test(e.name)) files.push(p); } })(root);

const findings = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8'); if (text.length > 2_000_000) continue;
  const ext = path.extname(f).slice(1);
  for (const r of RULES) {
    if (!r.ext.test(ext)) continue;
    r.re.lastIndex = 0; let m; let n = 0;
    while ((m = r.re.exec(text)) && n < 20) { n++; findings.push({ rule: r.id, sev: r.sev, file: path.relative(root, f).replace(/\\/g, '/'), line: text.slice(0, m.index).split('\n').length, say: r.say }); if (m[0].length === 0) r.re.lastIndex++; }
  }
}

const by = {}; for (const x of findings) (by[x.rule] = by[x.rule] || []).push(x);
const summary = Object.entries(by).map(([rule, xs]) => ({ rule, sev: xs[0].sev, count: xs.length, say: xs[0].say, where: xs.slice(0, 5).map((x) => x.file + ':' + x.line) }));
if (arg('json', false)) { console.log(JSON.stringify({ filesScanned: files.length, findings: findings.length, summary }, null, 1)); }
else {
  console.log(`Export-readiness: ${files.length} files scanned, ${findings.length} finding(s).`);
  for (const s of summary) console.log(`- [${s.sev}] ${s.rule} x${s.count}: ${s.say}\n    ${s.where.join(', ')}${s.count > 5 ? ', …' : ''}`);
  if (!findings.length) console.log('Nothing that the export draws badly was found.');
}
