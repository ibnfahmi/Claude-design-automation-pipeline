#!/usr/bin/env node
// Pack the builder and the measured specs into small SVG files that can be uploaded to Figma with `upload_assets`, so they reach the
// file WITHOUT passing through the model. The runner (figma-runner.js) then reads them back inside Figma and builds the frames, so a
// build call is a few hundred characters instead of the 27 KB builder plus a spec.
//
//   node pack-payload.mjs pack --dir figma-spec --frames frames.json --pages pages.json [--deltas state-deltas.json] [--fonts fontmap.json] [--opts opts.json] [--out figma-spec/payload]
//   node pack-payload.mjs post --dir figma-spec/payload --urls '["https://mcp.figma.com/mcp/upload/.../submit?...", ...]'
//
// pack: writes figma-spec/payload/<name>.svg for the builder (builder.js), the runner (runner.js), the plan (plan.json) and one file per frame
//   (spec-<slug>.json), plus manifest.json (the files in upload order). Each SVG holds ONE <text id="DATA"> whose content is the base64 of
//   the payload, so Figma imports it as a frame with one TEXT node; the runner decodes it.
//   pages.json:  { "<page name>": "<figma page id>" }     (the feature pages the setup created; a frame goes on the page of its `page`)
//   plan.json:   { fontMap, opts, jobs: [{ slug, name, pageId, x, y, hash, mode: "full"|"overlay", width, cropHeight }] }
//   A frame listed in state-deltas.json as reusable (overlay-only, from state-delta.mjs) is packed as an overlay job (only the overlay nodes).
// post: POSTs each manifest file to its submit URL (from the upload_assets call, in order) with the file name as the layer name, and writes
//   placed.json (file name -> the node id Figma gave it).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const cmd = process.argv[2];
const svgOf = (text) => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20" viewBox="0 0 100 20"><text id="DATA" x="0" y="10" font-size="10">${Buffer.from(text, 'utf8').toString('base64')}</text></svg>`;

if (cmd === 'pack') {
  const dir = arg('dir', 'figma-spec');
  const out = arg('out', path.join(dir, 'payload'));
  const frames = JSON.parse(fs.readFileSync(arg('frames', path.join(dir, 'frames.json')), 'utf8'));
  const pages = arg('pages') ? JSON.parse(fs.readFileSync(arg('pages'), 'utf8')) : {};
  const deltas = arg('deltas') && fs.existsSync(arg('deltas')) ? JSON.parse(fs.readFileSync(arg('deltas'), 'utf8')) : [];
  const fontMap = arg('fonts') ? JSON.parse(fs.readFileSync(arg('fonts'), 'utf8')) : {};
  const opts = arg('opts') ? JSON.parse(fs.readFileSync(arg('opts'), 'utf8')) : { fixedContainers: true };
  const builderPath = arg('builder', path.join(HERE, 'figma-builder.js'));
  fs.mkdirSync(out, { recursive: true });
  const manifest = [];
  const write = (name, text) => { fs.writeFileSync(path.join(out, name + '.svg'), svgOf(text)); manifest.push({ name, file: name + '.svg', chars: text.length }); };

  // the builder without its three placeholder lines: the runner supplies SPEC, FONTMAP and OPTS itself
  const builder = fs.readFileSync(builderPath, 'utf8').replace(/\r\n/g, '\n');
  if (!/const SPEC = __SPEC__;/.test(builder)) throw new Error('figma-builder.js has no __SPEC__ placeholder');
  write('builder.js', builder);
  write('runner.js', fs.readFileSync(path.join(HERE, 'figma-runner.js'), 'utf8').replace(/\r\n/g, '\n'));

  const jobs = []; const cursor = {};
  for (const f of frames) {
    const w = f.viewport.w;
    const file = path.join(dir, `${f.slug}@${w}.json`);
    if (!fs.existsSync(file)) { console.error('no spec for ' + f.slug + ' (' + file + ')'); continue; }
    const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
    const d = deltas.find((x) => x.slug === f.slug && x.reusable);
    const pageName = f.page || 'Page';
    const x = cursor[pageName] || 0; const h = d ? d.cropHeight : Math.round(spec.root.r[3]);
    cursor[pageName] = x + Math.round(d ? d.width : spec.root.r[2]) + 160;
    jobs.push({ slug: f.slug, name: f.name, pageId: pages[pageName] || null, pageName, x, y: 0, hash: f.hash || null, mode: d ? 'overlay' : 'full', width: Math.round(d ? d.width : spec.root.r[2]), cropHeight: d ? d.cropHeight : null, height: h });
    write('spec-' + f.slug, JSON.stringify(d ? { add: d.add } : { root: spec.root }));
  }
  write('plan.json', JSON.stringify({ fontMap, opts, jobs }));
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(JSON.stringify({ out, files: manifest.length, jobs: jobs.length, overlayJobs: jobs.filter((j) => j.mode === 'overlay').length, totalPayloadChars: manifest.reduce((s, m) => s + m.chars, 0), uploadCount: manifest.length }));
} else if (cmd === 'post') {
  const dir = arg('dir', 'figma-spec/payload');
  const urls = JSON.parse(arg('urls', '[]'));
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  if (urls.length < manifest.length) { console.error(`need ${manifest.length} upload URLs, got ${urls.length}`); process.exit(2); }
  const placed = {}; let failed = 0;
  await Promise.all(manifest.map(async (m, i) => {
    const fd = new FormData();
    fd.append('file', new Blob([fs.readFileSync(path.join(dir, m.file))], { type: 'image/svg+xml' }), m.file);
    try { const r = await fetch(urls[i], { method: 'POST', body: fd }); const j = await r.json(); if (j.success) placed[m.name] = j.placedOnNodeId; else { failed++; console.error(m.name, JSON.stringify(j).slice(0, 200)); } }
    catch (e) { failed++; console.error(m.name, String(e).slice(0, 200)); }
  }));
  fs.writeFileSync(path.join(dir, 'placed.json'), JSON.stringify(placed, null, 1));
  console.log(JSON.stringify({ uploaded: Object.keys(placed).length, failed }));
  process.exitCode = failed ? 1 : 0;
} else if (cmd === 'fill-plan') {
  // images.json is the runner's `images` (grouped by source). Finds each picture's local file (the saved media pixels, or the same
  // file name in --assets, a ';'-separated list of folders) and writes fill-plan.json, one entry per placeholder id, in the order the
  // upload_assets call must get its nodeIds. SVG sources are skipped (they are drawn as vectors by the extractor) and so are pictures with no local file.
  const dir = arg('dir', 'figma-spec');
  const groups = JSON.parse(fs.readFileSync(arg('images'), 'utf8'));
  const assetDirs = String(arg('assets', '')).split(';').filter(Boolean).concat([path.join(dir, 'assets')]);
  const plan = []; const missing = [];
  for (const g of groups) {
    let file = null;
    if (g.file && fs.existsSync(path.join(dir, g.file))) file = path.join(dir, g.file);
    else if (g.src && !/\.svg(\?|$)/i.test(g.src)) { const base = decodeURIComponent(g.src.split('?')[0].split('/').pop()); for (const d of assetDirs) { const p = path.join(d, base); if (fs.existsSync(p)) { file = p; break; } } }
    if (!file) { missing.push(g.file || g.src); continue; }
    for (const id of g.ids) plan.push({ id, file });
  }
  fs.writeFileSync(arg('out', path.join(dir, 'payload', 'fill-plan.json')), JSON.stringify(plan, null, 1));
  console.log(JSON.stringify({ count: plan.length, nodeIds: plan.map((p) => p.id), missing: [...new Set(missing)] }));
} else if (cmd === 'fill-post') {
  const plan = JSON.parse(fs.readFileSync(arg('plan'), 'utf8')); const urls = JSON.parse(arg('urls', '[]'));
  if (urls.length < plan.length) { console.error(`need ${plan.length} upload URLs, got ${urls.length}`); process.exit(2); }
  let ok = 0;
  await Promise.all(plan.map(async (p, i) => {
    const ext = path.extname(p.file).toLowerCase(); const ct = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
    try { const r = await fetch(urls[i], { method: 'POST', headers: { 'Content-Type': ct }, body: fs.readFileSync(p.file) }); const j = await r.json(); if (j.success) ok++; else console.error(p.id, JSON.stringify(j).slice(0, 160)); } catch (e) { console.error(p.id, String(e).slice(0, 160)); }
  }));
  console.log(JSON.stringify({ filled: ok, of: plan.length })); process.exitCode = ok === plan.length ? 0 : 1;
} else {
  console.error('usage: pack-payload.mjs pack|post|fill-plan|fill-post ...');
  process.exit(2);
}
