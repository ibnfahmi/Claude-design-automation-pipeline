/* Figma runner: builds frames from payloads that are already inside the Figma file, so a build call is a few hundred characters.
 *
 * This file is itself packed into the payload (`runner.js`), so a build call only carries the small bootstrap below, never this source.
 * Before the first call, `pack-payload.mjs pack` made the payload files and `pack-payload.mjs post` uploaded them to the page
 * RUN.payloadPage (each file became a frame with one TEXT node holding base64 data): `builder.js`, `runner.js`, `plan.json` and one
 * `spec-<slug>.json` per frame. The bootstrap (about 450 characters) is the `use_figma` code of every build call:
 *
 *   const AF=Object.getPrototypeOf(async function(){}).constructor;
 *   const P=await figma.getNodeByIdAsync('<payload page id>'); await P.loadAsync();
 *   const n=P.children.find(c=>/^runner\.js/.test(c.name));
 *   const src=decodeURIComponent(escape(atob(n.findOne(t=>t.type==='TEXT').characters)));
 *   return await new AF('figma','RUN','atob',src)(figma,{payloadPage:'<payload page id>',from:0,budgetMs:30000},atob);
 *
 * RUN is the argument (this source runs as a function body with `figma`, `RUN` and `atob` in scope):
 *
 *   RUN = { payloadPage: "0:1",            // the page the payload files were placed on
 *           from: 0,                       // index in plan.jobs to start at (the previous call's `next`)
 *           budgetMs: 30000,               // stop starting new sections after this long (the sandbox limits a call); the result says where to go on
 *           only: ["home-default-d"] }     // optional: build only these slugs
 *
 * It builds every job of plan.jobs from `from` on, a frame section by section (the first section creates the top-level frame without
 * its children, the next ones append the page's top-level children, exactly the flow figma-capture.md section 2b describes), or an
 * overlay-only frame in one step, and returns a compact result: the frames built (slug, node id, size), the images still to fill,
 * missing fonts, approximations, and `next` (the index to continue at) with `done` (true when every job is built).
 * It builds with the builder from the file, so the plugin's builder stays the single source of truth.
 */
const AF = Object.getPrototypeOf(async function () {}).constructor;
const t0 = Date.now();

const payloadPage = await figma.getNodeByIdAsync(RUN.payloadPage);
if (!payloadPage) throw new Error('payload page not found: ' + RUN.payloadPage);
if (payloadPage.loadAsync) await payloadPage.loadAsync();
const byName = {};
for (const c of payloadPage.children) byName[String(c.name).replace(/\.svg$/i, '')] = c;
const decode = (b64) => decodeURIComponent(escape(atob(b64)));
const readText = (name) => {
  const n = byName[name]; if (!n) throw new Error('payload file not found: ' + name);
  const t = n.findOne ? n.findOne((x) => x.type === 'TEXT') : null; if (!t) throw new Error('payload has no text: ' + name);
  return decode(t.characters);
};
const builderSrc = readText('builder.js');
const plan = JSON.parse(readText('plan.json'));

const agg = { drift: { texts: 0, off: 0, worst: [] }, built: [], images: [], missingFonts: new Set(), approximated: new Set(), deviations: 0, stats: {}, errors: [] };
async function runBuilder(spec) {
  // function replacements, because a spec can contain "$" sequences that String.replace would read as patterns
  const code = builderSrc
    .replace('__SPEC__', () => JSON.stringify(spec))
    .replace('__FONTMAP__', () => JSON.stringify(plan.fontMap || {}))
    .replace('__OPTS__', () => JSON.stringify(plan.opts || {}));
  const r = await new AF('figma', code)(figma); // figma passed in, so the builder sees the same Plugin API as the runner
  for (const im of (r.images || [])) agg.images.push(im);
  for (const b of (r.bgImages || [])) agg.images.push({ id: b.id, src: b.url, kind: 'bg', fit: 'cover', w: 0, h: 0 }); // CSS background-image: url(...) pictures are filled like images
  for (const f of (r.missingFonts || [])) agg.missingFonts.add(f);
  for (const a of (r.approximated || [])) agg.approximated.add(a);
  agg.deviations += r.deviationCount || 0;
  if (r.drift) { const d = agg.drift; d.texts += r.drift.texts; d.off += r.drift.off; d.worst = d.worst.concat(r.drift.worst || []).sort((a, b) => Math.max(Math.abs(b.dx), Math.abs(b.dy)) - Math.max(Math.abs(a.dx), Math.abs(a.dy))).slice(0, 3); }
  for (const [k, v] of Object.entries(r.stats || {})) agg.stats[k] = (agg.stats[k] || 0) + v;
  return r;
}

let i = RUN.from || 0;
for (; i < plan.jobs.length; i++) {
  const job = plan.jobs[i];
  if (RUN.only && !RUN.only.includes(job.slug)) continue;
  if (Date.now() - t0 > (RUN.budgetMs || 30000)) break;
  try {
    const spec = JSON.parse(readText('spec-' + job.slug));
    const common = { name: job.name, x: job.x, y: job.y, pageId: job.pageId, hash: job.hash };
    if (job.mode === 'overlay') {
      const r = await runBuilder({ overlayOnly: true, width: job.width, cropHeight: job.cropHeight, add: spec.add, ...common });
      agg.built.push({ slug: job.slug, id: r.rootId, w: job.width, h: job.cropHeight, mode: 'overlay' });
      continue;
    }
    const root = spec.root; const kids = root.c || [];
    agg.drift = { texts: 0, off: 0, worst: [] };
    const top = await runBuilder({ node: { ...root, c: [] }, parentId: null, ...common });
    for (const k of kids) {
      if (Date.now() - t0 > (RUN.budgetMs || 30000) * 2) { agg.errors.push({ slug: job.slug, error: 'time budget exceeded in the middle of a frame; rerun this slug with only' }); break; }
      await runBuilder({ node: k, parentId: top.rootId, name: k.n });
    }
    agg.built.push({ slug: job.slug, id: top.rootId, w: top.root.w, h: top.root.h, mode: 'full', sections: kids.length, drift: agg.drift.texts ? { texts: agg.drift.texts, off: agg.drift.off, worst: agg.drift.worst } : undefined });
  } catch (e) {
    agg.errors.push({ slug: job.slug, error: String(e && e.message || e).slice(0, 300) });
  }
}
return {
  built: agg.built, next: i, done: i >= plan.jobs.length, total: plan.jobs.length, ms: Date.now() - t0,
  images: Object.values(agg.images.reduce((g, im) => { const k = im.file || im.src || im.id; (g[k] = g[k] || { src: im.src ? im.src.slice(-90) : '', file: im.file || undefined, kind: im.kind, fit: im.fit || undefined, w: Math.round(im.w), h: Math.round(im.h), ids: [] }).ids.push(im.id); return g; }, {})), // grouped by source: one entry per picture, with every placeholder id
  missingFonts: [...agg.missingFonts], approximated: [...agg.approximated], deviations: agg.deviations, stats: agg.stats, errors: agg.errors,
};
