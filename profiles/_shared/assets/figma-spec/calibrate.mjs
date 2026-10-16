#!/usr/bin/env node
// Calibrate the Figma builder from data: derive the corrections (text line-height and vertical offset, heading-to-paragraph gap,
// carousel start offset) by comparing the measured spec with where the built Figma nodes really ended up, then check on frames the
// fit did not see that the corrections help. See figma-capture.md, "Calibrate first".
//
//   node calibrate.mjs observe --spec a.json,b.json --probe pa.json,pb.json --out obs.json
//       spec = the extracted specs (<slug>@<w>.json); probe = what figma-probe.js returned for each built frame (same order).
//   node calibrate.mjs fit --obs obs.json [--prev figma-calibration.json] --out figma-calibration.json
//       Adds the measured residuals to the previous calibration (the builder already applied it), so each round moves closer.
//   node calibrate.mjs accept --before before.json --after after.json
//       before/after = arrays of whole-screen diff percentages of the HELD-OUT frames, built without and with the calibration.
//       Prints { accepted, medianBefore, medianAfter, thresholds }. Exit code 0 when accepted, 1 when not.
//
// The functions are exported for tests.

import fs from 'node:fs';

const round1 = (v) => Math.round(v * 10) / 10;
const round3 = (v) => Math.round(v * 1000) / 1000;
export const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const MIN_OBS = 3; // a parameter is only changed when at least this many nodes agree on it

// ---------- observe: spec nodes against built nodes ----------
export function observe(spec, probe) {
  const built = new Map((probe.nodes || []).map(n => [n.i, n]));
  const obs = { texts: [], headings: [], scroll: [] };
  (function walk(n, ox, oy, scrollParent) {
    const ax = ox + n.r[0], ay = oy + n.r[1];
    const b = n.i !== undefined ? built.get(n.i) : null;
    if (n.k === 't' && b) obs.texts.push({ font: (n.ff || '') + '|' + (n.fw || 400), dy: ay - b.y, hSpec: n.r[3], hBuilt: b.h });
    if (scrollParent && b) obs.scroll.push({ dx: ax - b.x });
    const kids = n.c || [];
    kids.forEach((c, k) => {
      if (c.k === 't' && c.h && kids[k + 1]) { // a heading and the block under it
        const next = kids[k + 1], bc = built.get(c.i), bn = built.get(next.i);
        if (bc && bn) obs.headings.push({ dGap: (next.r[1] - (c.r[1] + c.r[3])) - (bn.y - (bc.y + bc.h)) });
      }
      walk(c, ax, ay, !!n.sc);
    });
  })(spec.root, 0, 0, false);
  return obs;
}

export function mergeObs(list) {
  return list.reduce((acc, o) => ({ texts: acc.texts.concat(o.texts), headings: acc.headings.concat(o.headings), scroll: acc.scroll.concat(o.scroll) }), { texts: [], headings: [], scroll: [] });
}

// ---------- fit ----------
export function fit(obs, prev = {}) {
  const out = { version: 1, text: { ...(prev.text || {}) }, spacing: { ...(prev.spacing || {}) }, scroll: { ...(prev.scroll || {}) } };
  const byFont = {};
  for (const t of obs.texts || []) (byFont[t.font] = byFont[t.font] || []).push(t);
  for (const [font, list] of Object.entries(byFont)) {
    if (list.length < MIN_OBS) continue;
    const p = out.text[font] || { lineHeightScale: 1, yOffset: 0 };
    const ratio = median(list.filter(t => t.hBuilt > 0).map(t => t.hSpec / t.hBuilt));
    const scale = ratio && Math.abs(ratio - 1) > 0.005 ? clamp(round3((p.lineHeightScale || 1) * ratio), 0.9, 1.1) : (p.lineHeightScale || 1);
    out.text[font] = { lineHeightScale: scale, yOffset: round1((p.yOffset || 0) + median(list.map(t => t.dy))) };
  }
  if ((obs.headings || []).length >= MIN_OBS) out.spacing.headingGap = round1(clamp((out.spacing.headingGap || 0) + median(obs.headings.map(h => h.dGap)), -16, 32));
  if ((obs.scroll || []).length >= MIN_OBS) out.scroll.dx = round1(clamp((out.scroll.dx || 0) + median(obs.scroll.map(s => s.dx)), -200, 200));
  return out;
}

// how far the built nodes still are from the spec (for the report)
export function residuals(obs) {
  return {
    textDy: round1(median((obs.texts || []).map(t => Math.abs(t.dy)))),
    textHeightRatio: round3(median((obs.texts || []).filter(t => t.hBuilt > 0).map(t => t.hSpec / t.hBuilt)) || 1),
    headingGap: round1(median((obs.headings || []).map(h => Math.abs(h.dGap)))),
    scrollDx: round1(median((obs.scroll || []).map(s => Math.abs(s.dx)))),
  };
}

// ---------- accept: only keep a calibration that helps frames it was not fitted on ----------
export function accept(before, after) {
  const medianBefore = median(before), medianAfter = median(after);
  const improved = after.length > 0 && after.length === before.length && medianAfter <= medianBefore - 0.05;
  const noneWorse = after.every((v, i) => v <= before[i] + 0.5);
  const maxDiff = Math.max(2, round1(medianAfter + 1)); // whole-screen limit from the calibrated result, never below 2%
  return { accepted: improved && noneWorse, improved, noneWorse, medianBefore: round1(medianBefore), medianAfter: round1(medianAfter), thresholds: { maxDiff, maxCell: 10 } };
}

// ---------- CLI ----------
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop());
if (isMain) {
  const args = {};
  const cmd = process.argv[2];
  for (let i = 3; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true'; }
  const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  const write = (obj) => { const text = JSON.stringify(obj, null, 2); if (args.out) fs.writeFileSync(args.out, text); console.log(text); };
  if (cmd === 'observe') {
    const specs = String(args.spec || '').split(',').filter(Boolean), probes = String(args.probe || '').split(',').filter(Boolean);
    if (!specs.length || specs.length !== probes.length) { console.error('observe needs --spec a.json,b.json and --probe pa.json,pb.json (same count)'); process.exit(2); }
    const obs = mergeObs(specs.map((s, i) => observe(readJson(s), readJson(probes[i]))));
    write({ ...obs, residuals: residuals(obs) });
  } else if (cmd === 'fit') {
    if (!args.obs) { console.error('fit needs --obs obs.json'); process.exit(2); }
    write(fit(readJson(args.obs), args.prev ? readJson(args.prev) : {}));
  } else if (cmd === 'accept') {
    if (!args.before || !args.after) { console.error('accept needs --before before.json --after after.json'); process.exit(2); }
    const r = accept(readJson(args.before), readJson(args.after));
    write(r); process.exitCode = r.accepted ? 0 : 1;
  } else { console.error('Usage: calibrate.mjs observe|fit|accept ...'); process.exit(2); }
}
