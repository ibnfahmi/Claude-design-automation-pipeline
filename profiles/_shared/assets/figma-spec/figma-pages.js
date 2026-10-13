/* Figma pages: creates (or repairs) the page list in the right order, sets every page background, archives pages, and renames the file.
 *
 * A template for the `use_figma` tool, written to be idempotent: running it twice changes nothing the second time.
 * Replace the placeholder in the `const PLAN` line just below this comment with a JSON literal, and send the text as the
 * `code` of one use_figma call. It follows the figma-use rules (top-level await and return, pages loaded before use,
 * every id returned).
 *
 * PLAN = {
 *   fileName: "Shabab Masr — v1.2",
 *   background: { r: 0.153, g: 0.153, b: 0.153 },                          // #272727
 *   features: [ { id: "F-0", name: "Foundation" }, { id: "F-1", name: "Challenges" } ],   // built features, in order
 *   archive: [ { pageId: "12:3", fromVersion: "v1.0" } ]                    // pages to copy into the archive group, this run
 * }
 */
const PLAN = __PLAN__;

const DASH = '———';
const divider = (n) => `${DASH}  ${n}  ${DASH}`;
const BG = [{ type: 'SOLID', color: PLAN.background || { r: 0x27 / 255, g: 0x27 / 255, b: 0x27 / 255 } }];
const FIXED_TOP = ['Cover', divider('Overview'), 'Specs & Guidelines', 'Product Flows', 'Components', 'Handoff status', 'Changelog', divider('Features')];
const featureName = (f) => `${f.id} · ${f.name}`;
const ARCHIVE_DIVIDER = divider('Archive');
const isArchived = (name) => /^v\d+(\.\d+)* · /.test(name);
const isFeaturePage = (name) => /^F-\d+ · /.test(name);

const report = { created: [], renamed: [], moved: [], archived: [], backgrounds: 0, unknownPages: [], fileRenamed: null };
const pages = () => figma.root.children;
const byName = (n) => pages().find(p => p.name === n);

// ---- 1. make sure every required page exists (reuse the default empty page for the Cover)
const wanted = [...FIXED_TOP];
for (const f of PLAN.features) wanted.push(featureName(f));
wanted.push(ARCHIVE_DIVIDER, 'Archive');

if (!byName('Cover') && pages().length === 1 && pages()[0].children.length === 0 && /^Page \d+$/.test(pages()[0].name)) { report.renamed.push([pages()[0].name, 'Cover']); pages()[0].name = 'Cover'; }
for (const f of PLAN.features) { // a feature renamed in the spec keeps its page (match by the F-n prefix)
  const full = featureName(f);
  if (!byName(full)) { const old = pages().find(p => p.name.startsWith(f.id + ' · ')); if (old) { report.renamed.push([old.name, full]); old.name = full; } }
}
for (const name of wanted) { if (!byName(name)) { const p = figma.createPage(); p.name = name; report.created.push(name); } }

// ---- 2. archive copies (before the order is fixed, so the copies are placed with the archive group)
for (const a of (PLAN.archive || [])) {
  const src = await figma.getNodeByIdAsync(a.pageId);
  if (!src || src.type !== 'PAGE') { report.archived.push({ pageId: a.pageId, error: 'page not found' }); continue; }
  await src.loadAsync();
  const copy = src.clone();
  copy.name = `${a.fromVersion} · ${src.name}`;
  report.archived.push({ from: src.name, copy: copy.name, copyId: copy.id });
}

// ---- 3. order: fixed pages, features, archive group (index page, then archived copies newest first), then unknown pages
const archivedCopies = pages().filter(p => isArchived(p.name));
const known = new Set([...wanted, ...archivedCopies.map(p => p.name)]);
const unknown = pages().filter(p => !known.has(p.name) && !isFeaturePage(p.name));
const order = [];
for (const n of wanted) order.push(byName(n));
// archived copies: the ones made in this run first (newest), then the rest in their current order
const madeNow = new Set(report.archived.map(a => a.copyId));
const sortedCopies = [...archivedCopies.filter(p => madeNow.has(p.id)), ...archivedCopies.filter(p => !madeNow.has(p.id))];
for (const p of sortedCopies) order.push(p);
for (const p of unknown) { order.push(p); report.unknownPages.push(p.name); }
// feature pages that are no longer built (kept, after the features, so nothing is lost)
for (const p of pages().filter(p => isFeaturePage(p.name) && !order.includes(p))) { order.splice(order.indexOf(byName('Archive')) - 1, 0, p); report.unknownPages.push(p.name); }
order.forEach((p, i) => { if (pages().indexOf(p) !== i) { figma.root.insertChild(i, p); report.moved.push(p.name); } });

// ---- 4. background on every page
for (const p of pages()) {
  const cur = p.backgrounds;
  const same = cur && cur.length === 1 && cur[0].type === 'SOLID' && Math.abs(cur[0].color.r - BG[0].color.r) < 0.002 && Math.abs(cur[0].color.g - BG[0].color.g) < 0.002 && Math.abs(cur[0].color.b - BG[0].color.b) < 0.002;
  if (!same) { p.backgrounds = BG; report.backgrounds++; }
}

// ---- 5. file name
try { if (figma.root.name !== PLAN.fileName) figma.root.name = PLAN.fileName; report.fileRenamed = (figma.root.name === PLAN.fileName); }
catch (e) { report.fileRenamed = false; report.renameError = String(e && e.message || e); }

return { pages: pages().map((p, i) => ({ index: i, id: p.id, name: p.name })), ...report };
