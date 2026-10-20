/* Figma builder: turns one SECTION of an extracted spec into native, auto-layout Figma nodes.
 *
 * This is a template for the `use_figma` tool. The Handoff Agent replaces the three JSON placeholders in the three
 * `const` lines just below this comment (the tokens written with double underscores) with JSON literals, and sends the whole
 * text as the `code` of one use_figma call (one section per call, so each call stays small and safe to retry). It follows the
 * figma-use rules: top-level await and return, auto layout for related children, append before HUG/FILL, resize before sizing,
 * fonts loaded before text is written, every node id returned.
 *
 *   SPEC     the section: { node: <spec node>, parentId: "<figma node id to append to, or null to create a top-level frame>",
 *                           x, y: page position for a new top-level frame, name: "<frame name>", pageId: "<page id>",
 *                           hash: "<hash of the frame's spec>" }   (the top-level frame is tagged as built from the spec)
 *   FONTMAP  { "Family|weight|normal|italic": { family: "IBM Plex Sans", style: "SemiBold" }, ... }   (the pinned fonts)
 *   OPTS     { scale: [0,4,8,12,16,24,32,40,48,64,80,96,128], spaceVars: { "8": "VariableID:..." },
 *              colorVars: { "rgb(16, 42, 99)": "VariableID:..." }, fixedContainers: true,
 *              components: { "Button|1a2b3c": { id: "12:34" } } }   (library first: a node whose `comp|sig` is listed becomes an instance)
 *   SPEC.cloneOf     "<figma node id of an already-built frame>": an overlay state is made by CLONING that frame instead of building the page
 *                    again; SPEC.cropHeight (the state frame's height) resizes the clone and clips its content, and SPEC.add is the list of
 *                    overlay nodes (from state-delta.mjs, positions in the page's coordinates) built on top of it as absolute children.
 *   SPEC.overlayOnly true: the frame holds ONLY the overlay (the scrim and the dialog): a transparent, clipped frame of SPEC.width x
 *                    SPEC.cropHeight with SPEC.add built inside it, and no page behind it (the cheapest way to export an overlay state).
 *   SPEC.asComponent  { name: "Button / Primary" }: the built top-level frame is turned into a Figma component (library build)
 */
const SPEC = __SPEC__;
const FONTMAP = __FONTMAP__;
const OPTS = __OPTS__;

const SCALE = OPTS.scale || [0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 128];
const stats = { frames: 0, texts: 0, images: 0, svgs: 0, autoLayout: 0, absolute: 0, plainFrames: 0, gridRows: 0, instances: 0 };
let OX = 0, OY = 0; const TEXTS = []; // spec-absolute origin of the node being built, and every text built with its spec position (the drift check)
const createdIds = [], images = [], bgImages = [], missingFonts = new Set(), approximated = new Set(), deviations = [];
const loaded = new Set();
const varCache = {};

// ---------- small helpers ----------
const snap = (v) => { let best = SCALE[0], d = Infinity; for (const s of SCALE) { const dd = Math.abs(s - v); if (dd < d || (dd === d && s > best)) { best = s; d = dd; } } return v > SCALE[SCALE.length - 1] ? Math.round(v / 8) * 8 : best; };
const snapGap = (v, what, where) => { const s = snap(v); if (Math.abs(s - v) >= 3) deviations.push({ where, what, code: Math.round(v * 10) / 10, figma: s }); return s; };
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const near = (a, b, t = 1.5) => Math.abs(a - b) <= t;
const pretty = (n) => { const m = { div: 'Group', span: 'Group', section: 'Section', header: 'Header', footer: 'Footer', nav: 'Nav', a: 'Link', ul: 'List', ol: 'List', li: 'List item', p: 'Paragraph', main: 'Main', article: 'Article', aside: 'Aside', form: 'Form', label: 'Label', button: 'Button', img: 'Image', svg: 'Icon', Page: 'Page' }; if (m[n]) return m[n]; const s = String(n || 'Group').replace(/[-_]+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };

function parseColor(str) {
  if (!str) return null; str = String(str).trim();
  if (str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  let m = /^rgba?\(([^)]+)\)$/.exec(str);
  if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p.length > 3 ? p[3] : 1 }; }
  m = /^#([0-9a-f]{3,8})$/i.exec(str);
  if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map(c => c + c).join(''); return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255, a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 }; }
  return null;
}
const solid = (str, mul = 1) => { const c = parseColor(str); if (!c || c.a * mul <= 0) return null; return { type: 'SOLID', color: { r: c.r, g: c.g, b: c.b }, opacity: c.a * mul }; };
function splitTop(s) { const out = []; let depth = 0, cur = ''; for (const ch of s) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }

function invert(m00, m01, m10, m11, tx, ty) { const det = m00 * m11 - m01 * m10 || 1; const a = m11 / det, b = -m01 / det, c = -m10 / det, d = m00 / det; return [[a, b, -(a * tx + b * ty)], [c, d, -(c * tx + d * ty)]]; }
// CSS lists the top layer first, Figma's fill array starts with the bottom one; every gradient layer is kept
function gradientPaints(str, w, h) {
  const out = [];
  for (const l of splitTop(str)) {
    const s = l.trim();
    if (!/gradient\(/.test(s)) continue;
    const p = /^radial-gradient/.test(s) ? radialPaint(s, w, h) : /^(repeating-)?linear-gradient/.test(s) ? linearPaint(s, w, h) : (approximated.add('conic gradient skipped'), null);
    if (p) out.push(p);
  }
  return out.reverse();
}
function gradientPaint(str, w, h) { const a = gradientPaints(str, w, h); return a.length ? a[a.length - 1] : null; } // text fills take one paint
function gradientStops(parts, radiusPx) {
  const stops = []; const raw = parts;
  raw.forEach((p, k) => { const cm = /^(rgba?\([^)]+\)|#[0-9a-f]{3,8}|transparent)\s*([\d.]+(?:%|px))?/i.exec(p); if (!cm) return; const c = parseColor(cm[1]); if (!c) return; let pos = raw.length > 1 ? k / (raw.length - 1) : 0; if (cm[2]) pos = /px$/.test(cm[2]) ? (radiusPx ? parseFloat(cm[2]) / radiusPx : 0) : parseFloat(cm[2]) / 100; stops.push({ color: { r: c.r, g: c.g, b: c.b, a: c.a }, position: Math.max(0, Math.min(1, pos)) }); });
  // a fully transparent stop (the keyword transparent is black with no opacity) takes the colour of the nearest visible stop, so the fade does not pass through grey
  stops.forEach((s, k) => { if (s.color.a === 0) { const o = stops.slice(k + 1).concat(stops.slice(0, k).reverse()).find(x => x.color.a > 0); if (o) s.color = { r: o.color.r, g: o.color.g, b: o.color.b, a: 0 }; } });
  return stops;
}
function radialPaint(str, w, h) {
  const m = /^radial-gradient\((.*)\)$/.exec(str); if (!m) return null;
  const parts = splitTop(m[1]);
  let cfg = '';
  if (parts.length && !/^(rgba?\(|#|transparent)/i.test(parts[0])) cfg = parts.shift();
  let cx = w / 2, cy = h / 2, circle = false, size = 'farthest-corner', ex = null;
  const at = /\bat\s+(.*)$/.exec(cfg);
  if (at) {
    const tk = at[1].trim().split(/\s+/);
    const pos = (v, len) => { if (v === 'left' || v === 'top') return 0; if (v === 'right' || v === 'bottom') return len; if (v === 'center') return len / 2; if (/%$/.test(v)) return parseFloat(v) / 100 * len; if (/px$/.test(v)) return parseFloat(v); return len / 2; };
    let a = tk[0], b2 = tk[1];
    if (a === 'top' || a === 'bottom') [a, b2] = [b2 || 'center', a]; // "top left" is the same as "left top"
    cx = pos(a, w); cy = pos(b2 === undefined ? 'center' : b2, h);
    if (tk.length === 1 && (tk[0] === 'top' || tk[0] === 'bottom')) { cx = w / 2; cy = pos(tk[0], h); }
    cfg = cfg.replace(/\bat\s+.*$/, '');
  }
  if (/\bcircle\b/.test(cfg)) circle = true;
  const kw = /(closest-side|farthest-side|closest-corner|farthest-corner)/.exec(cfg); if (kw) size = kw[1];
  const lens = (cfg.match(/-?[\d.]+(?:px|%)/g) || []);
  if (lens.length) { if (lens.length === 1) circle = true; ex = lens.map((v, i) => /%$/.test(v) ? parseFloat(v) / 100 * (lens.length === 1 ? Math.max(w, h) : (i === 0 ? w : h)) : parseFloat(v)); }
  const dl = cx, dr = w - cx, dt = cy, db = h - cy;
  let rx, ry;
  if (ex) { rx = ex[0]; ry = circle ? ex[0] : ex[1]; }
  else if (size === 'closest-side') { if (circle) rx = ry = Math.min(dl, dr, dt, db); else { rx = Math.min(dl, dr); ry = Math.min(dt, db); } }
  else if (size === 'farthest-side') { if (circle) rx = ry = Math.max(dl, dr, dt, db); else { rx = Math.max(dl, dr); ry = Math.max(dt, db); } }
  else if (size === 'closest-corner') { if (circle) rx = ry = Math.hypot(Math.min(dl, dr), Math.min(dt, db)); else { rx = Math.min(dl, dr) * Math.SQRT2; ry = Math.min(dt, db) * Math.SQRT2; } }
  else { if (circle) rx = ry = Math.hypot(Math.max(dl, dr), Math.max(dt, db)); else { rx = Math.max(dl, dr) * Math.SQRT2; ry = Math.max(dt, db) * Math.SQRT2; } }
  rx = Math.max(1, rx); ry = Math.max(1, ry);
  const stops = gradientStops(parts, rx);
  if (stops.length < 2) return stops[0] ? { type: 'SOLID', color: stops[0].color, opacity: stops[0].color.a } : null;
  // node space (0..1 of the box) to gradient space (the unit circle centred at 0.5, radius 0.5)
  const gt = [[w / (2 * rx), 0, 0.5 - cx / (2 * rx)], [0, h / (2 * ry), 0.5 - cy / (2 * ry)]];
  return { type: 'GRADIENT_RADIAL', gradientTransform: gt, gradientStops: stops };
}
function linearPaint(str, w, h) {
  const m = /^(repeating-)?linear-gradient\((.*)\)$/.exec(str.trim());
  if (!m) { approximated.add('non-linear gradient'); const c = /rgba?\([^)]+\)/.exec(str); return c ? solid(c[0]) : null; }
  const parts = splitTop(m[2]); let angle = 180, i = 0;
  const first = parts[0];
  if (/^-?[\d.]+deg$/.test(first)) { angle = parseFloat(first); i = 1; }
  else if (/^to /.test(first)) { const d = first.slice(3).trim(); angle = { top: 0, right: 90, bottom: 180, left: 270, 'top right': 45, 'right top': 45, 'bottom right': 135, 'right bottom': 135, 'bottom left': 225, 'left bottom': 225, 'top left': 315, 'left top': 315 }[d] ?? 180; i = 1; }
  const stops = gradientStops(parts.slice(i), 0);
  if (stops.length < 2) return stops[0] ? { type: 'SOLID', color: stops[0].color, opacity: stops[0].color.a } : null;
  const th = angle * Math.PI / 180, dx = Math.sin(th), dy = -Math.cos(th);
  const Lc = Math.abs(w * Math.sin(th)) + Math.abs(h * Math.cos(th)) || 1;
  const Sx = 0.5 - (Lc / 2) * dx / w, Sy = 0.5 - (Lc / 2) * dy / h, Ex = 0.5 + (Lc / 2) * dx / w, Ey = 0.5 + (Lc / 2) * dy / h;
  const Px = -dy * Lc / w, Py = dx * Lc / h;
  const tx = Sx - 0.5 * Px, ty = Sy - 0.5 * Py;
  const gt = invert(Ex - Sx, Px, Ey - Sy, Py, tx, ty);
  return { type: 'GRADIENT_LINEAR', gradientTransform: gt, gradientStops: stops };
}
function shadows(str) {
  const out = []; if (!str || str === 'none') return out;
  for (const part of splitTop(str)) {
    const inset = /\binset\b/.test(part); const cm = /rgba?\([^)]+\)/.exec(part); if (!cm) continue;
    const rest = part.replace(cm[0], '').replace('inset', ''); const n = (rest.match(/-?[\d.]+px/g) || []).map(parseFloat);
    const c = parseColor(cm[0]); if (!c) continue;
    out.push({ type: inset ? 'INNER_SHADOW' : 'DROP_SHADOW', color: { r: c.r, g: c.g, b: c.b, a: c.a }, offset: { x: n[0] || 0, y: n[1] || 0 }, radius: n[2] || 0, spread: n[3] || 0, visible: true, blendMode: 'NORMAL' });
  }
  return out;
}
const blurPx = (s, fn) => { const m = new RegExp(fn + '\\(([\\d.]+)px\\)').exec(s || ''); return m ? parseFloat(m[1]) : 0; };

// ---------- fonts ----------
async function ensureFont(fn) { const k = fn.family + '|' + fn.style; if (loaded.has(k)) return; await figma.loadFontAsync(fn); loaded.add(k); }
function fontFor(ff, fw, it) {
  const key = `${ff}|${fw}|${it ? 'italic' : 'normal'}`;
  const hit = FONTMAP[key] || FONTMAP[`${ff}|${fw}|normal`];
  if (hit) return hit;
  missingFonts.add(key);
  return { family: 'Inter', style: it ? 'Italic' : (fw >= 700 ? 'Bold' : fw >= 600 ? 'Semi Bold' : fw >= 500 ? 'Medium' : 'Regular') };
}

// ---------- variables ----------
async function getVar(id) { if (!id) return null; if (!(id in varCache)) { try { varCache[id] = await figma.variables.getVariableByIdAsync(id); } catch (e) { varCache[id] = null; } } return varCache[id]; }
async function bindSpace(node, field, value) { const id = OPTS.spaceVars && OPTS.spaceVars[String(value)]; const v = await getVar(id); if (v) { try { node.setBoundVariable(field, v); } catch (e) {} } }
async function bindFill(node, cssColor, paint) { const id = OPTS.colorVars && OPTS.colorVars[cssColor]; const v = await getVar(id); if (!v || !paint) return paint; try { return figma.variables.setBoundVariableForPaint(paint, 'color', v); } catch (e) { return paint; } }

// ---------- visuals ----------
async function applyVisual(node, n, w, h) {
  const fills = [];
  if (n.bg) { let p = solid(n.bg); if (p) { p = await bindFill(node, n.bg, p); fills.push(p); } }
  if (n.bgfile) { images.push({ id: node.id, src: '', file: n.bgfile, kind: 'css-picture', fit: 'fill', w, h }); fills.push({ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 }, opacity: 1 }); }
  else if (n.bgi) {
    if (/gradient\(/.test(n.bgi)) { for (const g of gradientPaints(n.bgi, w, h)) fills.push(g); }
    else { const u = /url\(["']?([^"')]+)["']?\)/.exec(n.bgi); if (u) { bgImages.push({ id: node.id, url: u[1] }); fills.push({ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 }, opacity: 1 }); } else approximated.add('background-image'); }
  }
  try { node.fills = fills; } catch (e) {}
  if (n.bd) {
    const [t, r, b, l] = n.bd.w; const cols = n.bd.c; const c0 = solid(cols[0]) || solid(cols.find(x => parseColor(x) && parseColor(x).a > 0));
    if (c0) {
      node.strokes = [c0]; node.strokeAlign = 'INSIDE';
      if (t === r && r === b && b === l) node.strokeWeight = t;
      else { node.strokeTopWeight = t; node.strokeRightWeight = r; node.strokeBottomWeight = b; node.strokeLeftWeight = l; }
      if (n.bd.s === 'dashed' || n.bd.s === 'dotted') node.dashPattern = n.bd.s === 'dotted' ? [t, t * 2] : [t * 3, t * 2];
    }
  }
  if (n.rad) { const [a, b, c, d] = n.rad.map(v => Math.min(v, Math.min(w, h) / 2)); if (a === b && b === c && c === d) node.cornerRadius = a; else { node.topLeftRadius = a; node.topRightRadius = b; node.bottomRightRadius = c; node.bottomLeftRadius = d; } }
  const fx = shadows(n.sh); const lb = blurPx(n.fl, 'blur'), bb = blurPx(n.bf, 'blur');
  if (lb) fx.push({ type: 'LAYER_BLUR', radius: lb, visible: true });
  if (bb) fx.push({ type: 'BACKGROUND_BLUR', radius: bb, visible: true });
  if (n.fl && !lb) approximated.add('css filter'); if (n.bf && !bb) approximated.add('backdrop-filter');
  if (fx.length) node.effects = fx;
  if (n.op !== undefined) node.opacity = n.op;
  if (n.ov) node.clipsContent = true; else if (node.type === 'FRAME') node.clipsContent = false;
  if (n.tf) approximated.add('css transform');
}

// ---------- text ----------
async function makeText(t, parentInfo) {
  const tx = figma.createText();
  const runs = t.runs || [{ txt: t.txt, ff: t.ff, fs: t.fs, fw: t.fw, lh: t.lh, ls: t.ls, col: t.col, it: t.it, tt: t.tt, td: t.td }];
  const fonts = runs.map(r => fontFor(r.ff, r.fw, r.it));
  for (const f of fonts) await ensureFont(f);
  tx.fontName = fonts[0];
  tx.characters = runs.map(r => r.txt).join('');
  tx.name = (t.n || tx.characters).slice(0, 40);
  tx.fontSize = t.fs || runs[0].fs;
  tx.lineHeight = t.lh ? { unit: 'PIXELS', value: t.lh } : { unit: 'AUTO' };
  tx.letterSpacing = { unit: 'PIXELS', value: t.ls || 0 };
  const tcase = { uppercase: 'UPPER', lowercase: 'LOWER', capitalize: 'TITLE' }[t.tt]; if (tcase) tx.textCase = tcase;
  if (t.td && /underline/.test(t.td)) tx.textDecoration = 'UNDERLINE'; else if (t.td && /line-through/.test(t.td)) tx.textDecoration = 'STRIKETHROUGH';
  tx.textAlignHorizontal = { center: 'CENTER', right: 'RIGHT', end: 'RIGHT', justify: 'JUSTIFIED' }[t.ta] || 'LEFT';
  const p = solid(t.col || (runs[0] && runs[0].col)); tx.fills = p ? [await bindFill(tx, t.col, p)] : [];
  if (t.runs) {
    let pos = 0;
    for (let i = 0; i < runs.length; i++) {
      const r = runs[i], a = pos, b = pos + r.txt.length; pos = b; if (b <= a) continue;
      tx.setRangeFontName(a, b, fonts[i]); tx.setRangeFontSize(a, b, r.fs);
      tx.setRangeLineHeight(a, b, r.lh ? { unit: 'PIXELS', value: r.lh } : { unit: 'AUTO' });
      tx.setRangeLetterSpacing(a, b, { unit: 'PIXELS', value: r.ls || 0 });
      const rp = solid(r.col); if (rp) tx.setRangeFills(a, b, [rp]);
      tx.setRangeTextDecoration(a, b, r.td && /underline/.test(r.td) ? 'UNDERLINE' : r.td && /line-through/.test(r.td) ? 'STRIKETHROUGH' : 'NONE');
      const rc = { uppercase: 'UPPER', lowercase: 'LOWER', capitalize: 'TITLE' }[r.tt]; tx.setRangeTextCase(a, b, rc || 'ORIGINAL');
    }
  }
  if (t.grad) { const g = gradientPaint(t.grad, t.r[2], t.r[3]); if (g) { try { tx.fills = [g]; } catch (e) {} } }
  stats.texts++;
  return tx;
}
function sizeText(tx, t, parent, pinfo) {
  // append first, then size (figma-use rules 12 and 12c)
  const w = t.r[2], one = (t.lines || 1) <= 1;
  const inAuto = pinfo && pinfo.auto;
  if (t.clamp || t.ell) { tx.textTruncation = 'ENDING'; tx.maxLines = t.clamp || 1; }
  if (one && !t.ell && !t.clamp) { tx.textAutoResize = 'WIDTH_AND_HEIGHT'; if (inAuto) tx.layoutSizingHorizontal = 'HUG'; return; }
  tx.resize(Math.max(1, w + (one ? 0 : 4)), Math.max(1, t.r[3])); tx.textAutoResize = 'HEIGHT'; // 4 px of slack so a wrapped line does not break mid-word
  if (t.clamp || t.ell) {
    // clamped (line-clamp) or ellipsised text keeps the height of the lines the page shows: with an automatic height Figma would grow the box to show every line
    const n = t.clamp || 1, lhpx = t.lh || t.r[3] / Math.max(1, t.lines || 1);
    tx.textAutoResize = 'NONE'; tx.resize(Math.max(1, w + (one ? 0 : 4)), Math.max(1, t.r[3], lhpx * n)); tx.textTruncation = 'ENDING'; tx.maxLines = n;
  }
  if (inAuto && pinfo.contentW && near(w, pinfo.contentW, 2) && pinfo.dir === 'VERTICAL') tx.layoutSizingHorizontal = 'FILL';
  else if (inAuto && pinfo.dir === 'HORIZONTAL' && t.F && t.F.g) tx.layoutSizingHorizontal = 'FILL';
}

// ---------- paint order (CSS stacking) ----------
// [class, z, page order]: negative z-index -1; non-positioned 0; positioned with z auto or 0 is 1; positive z-index 2
const stackKey = (c, dom) => { const L = c.L || {}; const positioned = L.pos && L.pos !== 'static'; const hasZ = L.z !== undefined; if (hasZ && L.z < 0) return [-1, L.z, dom]; if (positioned || hasZ) return L.z > 0 ? [2, L.z, dom] : [1, 0, dom]; return [0, 0, dom]; };
const cmpKey = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// ---------- uneven gaps ----------
// Siblings with different gaps (margins) cannot share one auto-layout spacing: a median gap makes every row below drift. The exact gap of each pair
// is returned when they differ (null when they are even, overlap, or the layout spaces its items by itself)
function unevenGaps(lay) {
  if (!lay || lay.mode === 'NONE' || lay.wrap || lay.grid || lay.pj === 'SPACE_BETWEEN' || (lay.order || []).length < 3) return null;
  const mainH = lay.mode === 'HORIZONTAL', o = lay.order;
  if (o.some(c => c.F && c.F.ma)) return null;
  const gs = []; for (let i = 1; i < o.length; i++) { const a = o[i - 1], b = o[i]; gs.push(mainH ? b.r[0] - (a.r[0] + a.r[2]) : b.r[1] - (a.r[1] + a.r[3])); }
  if (gs.some(g => g < -0.5)) return null;
  const m = median(gs); if (!gs.some(g => Math.abs(g - m) > 1.5)) return null;
  return gs.map(g => Math.max(0, Math.round(g * 2) / 2));
}

// siblings that overlap along the main axis (a negative margin pulls one over the other) have no auto-layout equivalent: Figma has no margins, and a spacer cannot be negative
function overlappingSiblings(lay) {
  if (!lay || lay.mode === 'NONE' || lay.wrap || lay.grid || lay.pj === 'SPACE_BETWEEN' || (lay.order || []).length < 2) return false;
  const mainH = lay.mode === 'HORIZONTAL', o = lay.order;
  if (o.some(c => c.F && c.F.ma)) return false;
  // a first child that starts before the padding (a negative margin-top on it) cannot be placed by auto layout either
  const pad = lay.pad || [0, 0, 0, 0], first = o[0];
  if ((mainH ? first.r[0] - pad[3] : first.r[1] - pad[0]) < -2) return true;
  for (let i = 1; i < o.length; i++) {
    const a = o[i - 1], b = o[i];
    // the measured box of a text is the font's content area, which is taller than its line: a text may overlap a neighbour by part of its height without any negative margin
    const tol = (a.k === 't' || b.k === 't') ? 0.4 * Math.min(mainH ? a.r[2] : a.r[3], mainH ? b.r[2] : b.r[3]) : 2;
    if ((mainH ? b.r[0] - (a.r[0] + a.r[2]) : b.r[1] - (a.r[1] + a.r[3])) < -tol) return true;
  }
  return false;
}

// ---------- layout inference ----------
const inFlow = (c) => !(c.L && (c.L.pos === 'absolute' || c.L.pos === 'fixed'));
const AL = { 'flex-start': 'MIN', start: 'MIN', normal: 'MIN', stretch: 'MIN', 'self-start': 'MIN', center: 'CENTER', 'flex-end': 'MAX', end: 'MAX', 'self-end': 'MAX', baseline: 'MIN' };
function inferLayout(n) {
  const kids = (n.c || []).filter(inFlow); const L = n.L || {}; const [w, h] = [n.r[2], n.r[3]];
  if (L.d === 'grid' && kids.length) return { mode: 'VERTICAL', gap: L.gap ? L.gap[0] : 0, pad: L.pad || [0, 0, 0, 0], pj: 'MIN', ca: 'MIN', order: [], stretch: true, grid: true };
  if (L.d === 'flex' && kids.length) {
    const dir = L.dir === 'col' ? 'VERTICAL' : 'HORIZONTAL';
    const gapMain = dir === 'HORIZONTAL' ? (L.gap ? L.gap[1] : 0) : (L.gap ? L.gap[0] : 0);
    const ord = [...kids].sort((a, b) => dir === 'HORIZONTAL' ? a.r[0] - b.r[0] : a.r[1] - b.r[1]);
    const gaps = []; for (let i = 1; i < ord.length; i++) gaps.push(dir === 'HORIZONTAL' ? ord[i].r[0] - (ord[i - 1].r[0] + ord[i - 1].r[2]) : ord[i].r[1] - (ord[i - 1].r[1] + ord[i - 1].r[3]));
    const byOrder = [...kids].map((k, i) => [k, i]).sort((a, b) => ((a[0].F && a[0].F.o) || 0) - ((b[0].F && b[0].F.o) || 0) || a[1] - b[1]).map(x => x[0]); // CSS order, then page order
    const spaced = /space-/.test(L.jc || '');
    let gap = spaced ? 0 : (gaps.length && Math.abs(median(gaps) - gapMain) > 1 ? Math.max(0, median(gaps)) : gapMain);
    const pad = L.pad || [0, 0, 0, 0];
    return { mode: dir, gap, wrap: !!L.wrap && (dir !== 'HORIZONTAL' || new Set(kids.map(k => Math.round(k.r[1] / 4))).size > 1), crossGap: L.gap ? (dir === 'HORIZONTAL' ? L.gap[0] : L.gap[1]) : 0, pad, pj: spaced ? 'SPACE_BETWEEN' : (/center/.test(L.jc || '') ? 'CENTER' : /end/.test(L.jc || '') ? 'MAX' : 'MIN'), ca: AL[L.ai] || 'MIN', stretch: !L.ai || L.ai === 'normal' || L.ai === 'stretch', order: L.rev ? [...byOrder].reverse() : byOrder, approx: /around|evenly/.test(L.jc || '') };
  }
  if (!kids.length) return null;
  // block-like: infer a stack from the children's positions
  const ord = [...kids].sort((a, b) => a.r[1] - b.r[1] || a.r[0] - b.r[0]);
  const vertical = ord.every((c, i) => i === 0 || c.r[1] >= ord[i - 1].r[1] + ord[i - 1].r[3] - 1);
  const byX = [...kids].sort((a, b) => a.r[0] - b.r[0]);
  const horizontal = !vertical && byX.every((c, i) => i === 0 || c.r[0] >= byX[i - 1].r[0] + byX[i - 1].r[2] - 1);
  if (!vertical && !horizontal) return { mode: 'NONE', pad: [0, 0, 0, 0], order: kids };
  const seq = vertical ? ord : byX; const dir = vertical ? 'VERTICAL' : 'HORIZONTAL';
  const gaps = []; for (let i = 1; i < seq.length; i++) gaps.push(vertical ? seq[i].r[1] - (seq[i - 1].r[1] + seq[i - 1].r[3]) : seq[i].r[0] - (seq[i - 1].r[0] + seq[i - 1].r[2]));
  const minX = Math.min(...seq.map(c => c.r[0])), minY = Math.min(...seq.map(c => c.r[1]));
  const maxR = Math.max(...seq.map(c => c.r[0] + c.r[2])), maxB = Math.max(...seq.map(c => c.r[1] + c.r[3]));
  const pad = [Math.max(0, minY), Math.max(0, w - maxR), Math.max(0, h - maxB), Math.max(0, minX)];
  let ca = 'MIN';
  if (vertical) { const cs = seq.map(c => (c.r[0] + c.r[2] / 2) - w / 2); if (seq.length && cs.every(x => near(x, 0, 2)) && !seq.every(c => near(c.r[2], w - pad[1] - pad[3], 2))) ca = 'CENTER'; else if (seq.every(c => near(c.r[0] + c.r[2], w - pad[1], 2)) && !seq.every(c => near(c.r[0], pad[3], 2))) ca = 'MAX'; }
  else { const cs = seq.map(c => (c.r[1] + c.r[3] / 2) - h / 2); if (cs.every(x => near(x, 0, 2))) ca = 'CENTER'; else if (seq.every(c => near(c.r[1] + c.r[3], h - pad[2], 2))) ca = 'MAX'; }
  return { mode: dir, gap: Math.max(0, median(gaps)), pad, pj: 'MIN', ca, order: seq, varGaps: gaps.length && Math.max(...gaps) - Math.min(...gaps) > 1 };
}

// ---------- sizing inside an auto-layout parent (frames and instances) ----------
function fitsContent(n) {
  const kids = (n.c || []).filter(inFlow);
  if (!kids.length) return true;
  const pad = (n.L && n.L.pad) || [0, 0, 0, 0];
  const minX = Math.min(...kids.map(k => k.r[0])), maxX = Math.max(...kids.map(k => k.r[0] + k.r[2]));
  const minY = Math.min(...kids.map(k => k.r[1])), maxY = Math.max(...kids.map(k => k.r[1] + k.r[3]));
  return near(n.r[2], pad[1] + pad[3] + (maxX - minX), 4) && near(n.r[3], pad[0] + pad[2] + (maxY - minY), 4);
}
function applySizing(f, n, pinfo, auto, w, h) {
  if (!(pinfo && pinfo.auto)) return;
  const fixed = OPTS.fixedContainers !== false;
  // a button or inline-flex box hugs its content only when its measured box really is the content plus padding; an icon button of 44 x 44 around a 24 px icon keeps its size
  const hug = (!!(n.L && n.L.inl) || n.act === 'button') && fitsContent(n);
  const mainH = pinfo.dir === 'HORIZONTAL';
  if (n.L && n.L.pos === 'absolute') { /* handled by the caller */ }
  else if (hug && auto) { f.layoutSizingHorizontal = 'HUG'; f.layoutSizingVertical = 'HUG'; }
  else {
    const growMain = n.F && n.F.g;
    const crossMatches = pinfo.stretch && (mainH ? near(h, pinfo.contentH, 1.5) : near(w, pinfo.contentW, 1.5));
    const fillCross = (crossMatches || (n.F && n.F.as === 'stretch'));
    if (mainH) { if (growMain) f.layoutSizingHorizontal = 'FILL'; if (fillCross && pinfo.contentH) f.layoutSizingVertical = 'FILL'; }
    else { if (growMain) f.layoutSizingVertical = 'FILL'; if (fillCross && pinfo.contentW) f.layoutSizingHorizontal = 'FILL'; }
    if (!fixed && auto && !growMain && !fillCross) { f.layoutSizingHorizontal = 'HUG'; f.layoutSizingVertical = 'HUG'; }
  }
}

// ---------- library first: a node that matches a built component becomes an instance of it ----------
const specLeaves = (n, k) => { const out = []; (function w(x) { if (x.k === k) out.push(x); (x.c || []).forEach(w); })(n); return out; };
const textOf = (t) => t.runs ? t.runs.map(r => r.txt).join('') : (t.txt || '');
async function loadNodeFonts(tx) {
  const fns = tx.fontName === figma.mixed ? tx.getStyledTextSegments(['fontName']).map(s => s.fontName) : [tx.fontName];
  for (const fn of fns) await ensureFont(fn);
}
async function instantiate(n, entry, parent, pinfo) {
  const main = await figma.getNodeByIdAsync(entry.id);
  if (!main || main.type !== 'COMPONENT') { approximated.add('component not found: ' + n.comp); return null; }
  const texts = specLeaves(n, 't'), imgs = specLeaves(n, 'i');
  const inst = main.createInstance();
  const tNodes = inst.findAll(x => x.type === 'TEXT');
  const iNodes = inst.findAll(x => x.type === 'RECTANGLE' && x.name.startsWith('Image /'));
  if (tNodes.length !== texts.length || iNodes.length !== imgs.length) { inst.remove(); approximated.add('component mismatch, built as a frame: ' + n.comp); return null; }
  for (let i = 0; i < texts.length; i++) {
    const want = textOf(texts[i]);
    if (tNodes[i].characters !== want) { await loadNodeFonts(tNodes[i]); tNodes[i].characters = want; }
  }
  imgs.forEach((im, i) => images.push({ id: iNodes[i].id, src: im.src || '', kind: im.kind, fit: im.fit || 'fill', w: im.r[2], h: im.r[3] }));
  parent.appendChild(inst);
  const w = Math.max(1, n.r[2]), h = Math.max(1, n.r[3]);
  inst.resize(w, h);
  inst.name = n.comp;
  applySizing(inst, n, pinfo, main.layoutMode && main.layoutMode !== 'NONE', w, h);
  if (!pinfo || !pinfo.auto) { inst.x = n.r[0]; inst.y = n.r[1]; }
  stats.instances++; stats.texts += texts.length; createdIds.push(inst.id);
  return inst;
}

// ---------- building ----------
async function build(n, parent, pinfo, where) {
  if (n.k === 't') {
    const tx = await makeText(n, pinfo); parent.appendChild(tx); sizeText(tx, n, parent, pinfo);
    if (!pinfo || !pinfo.auto) { tx.x = n.r[0]; tx.y = n.r[1]; }
    createdIds.push(tx.id); TEXTS.push({ tx, x: OX + n.r[0], y: OY + n.r[1], w: n.r[2], h: n.r[3], l: n.lines || 1, lh: n.lh || 0, fs: n.fs || 0 }); return tx;
  }
  if (n.k === 'i') {
    const r = figma.createRectangle(); r.name = 'Image / ' + (n.alt || (n.src || '').split('/').pop().split('?')[0] || n.kind || 'image').slice(0, 40);
    r.resize(Math.max(1, n.r[2]), Math.max(1, n.r[3]));
    r.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }];
    if (n.rad) { const [a, b, c, d] = n.rad; if (a === b && b === c && c === d) r.cornerRadius = a; else { r.topLeftRadius = a; r.topRightRadius = b; r.bottomRightRadius = c; r.bottomLeftRadius = d; } }
    parent.appendChild(r); if (!pinfo || !pinfo.auto) { r.x = n.r[0]; r.y = n.r[1]; }
    images.push({ id: r.id, src: n.src || '', kind: n.kind, fit: n.fit || 'fill', w: n.r[2], h: n.r[3], file: n.file || undefined }); stats.images++; createdIds.push(r.id); return r; // file: pixels saved by extract-spec.mjs for a video or canvas (upload that file instead of the src)
  }
  if (n.k === 's') {
    if (!n.svg) { const r = figma.createRectangle(); r.name = 'Icon (too large)'; r.resize(n.r[2], n.r[3]); parent.appendChild(r); approximated.add('svg too large'); return r; }
    const s = figma.createNodeFromSvg(n.svg); s.name = 'Icon'; s.resize(Math.max(1, n.r[2]), Math.max(1, n.r[3])); parent.appendChild(s);
    if (!pinfo || !pinfo.auto) { s.x = n.r[0]; s.y = n.r[1]; } stats.svgs++; createdIds.push(s.id); return s;
  }
  // library first: an instance of an already built component
  const compKey = n.comp && n.sig ? n.comp + '|' + n.sig : null;
  if (compKey && OPTS.components && OPTS.components[compKey] && !(SPEC.asComponent && n === SPEC.node)) {
    const inst = await instantiate(n, OPTS.components[compKey], parent, pinfo);
    if (inst) return inst;
  }
  // frame
  let lay = inferLayout(n);
  if (overlappingSiblings(lay)) { approximated.add('negative margins: children keep their measured positions'); lay = { mode: 'NONE', pad: [0, 0, 0, 0], order: lay.order }; }
  const w = Math.max(1, n.r[2]), h = Math.max(1, n.r[3]);
  const auto = lay && lay.mode !== 'NONE';
  const f = auto ? figma.createAutoLayout(lay.mode) : figma.createFrame();
  f.name = (n.pseudo ? pretty('Decoration ' + n.pseudo.replace('::', '')) : n.h ? 'Heading ' + n.h : n.act === 'button' ? 'Button' : pretty(n.n));
  stats.frames++;
  if (auto) {
    stats.autoLayout++;
    const sp = snapGap(lay.gap || 0, 'gap', where + ' / ' + f.name);
    f.itemSpacing = sp; await bindSpace(f, 'itemSpacing', sp);
    const pad = (lay.pad || [0, 0, 0, 0]).map((v, i) => snapGap(v, 'padding', where + ' / ' + f.name));
    [f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft] = pad;
    f.primaryAxisAlignItems = lay.pj || 'MIN'; f.counterAxisAlignItems = lay.ca || 'MIN';
    if (lay.wrap && lay.mode === 'HORIZONTAL') { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = snap(lay.crossGap || 0); }
    if (lay.approx) approximated.add('space-around/evenly');
    if (lay.varGaps && !unevenGaps(lay)) approximated.add('uneven gaps between siblings (median used)');
  } else { stats.plainFrames++; if (lay && lay.mode === 'NONE' && (n.c || []).length > 1) approximated.add('overlapping children kept as absolute'); }
  f.resize(w, h);
  // gradient-clipped text (background-clip: text with a transparent colour): the gradient is the colour of the glyphs, not a box behind them
  if (n.bgi && /gradient\(/.test(n.bgi) && (n.c || []).length && (n.c || []).every(t => t.k === 't' && /^(rgba\(0, 0, 0, 0\)|transparent)$/.test(String(t.col || '').trim()))) { for (const t of n.c) t.grad = n.bgi; n = { ...n, bgi: '' }; }
  await applyVisual(f, n, w, h);
  parent.appendChild(f);
  applySizing(f, n, pinfo, auto, w, h);
  if (!pinfo || !pinfo.auto) { f.x = n.r[0]; f.y = n.r[1]; }
  createdIds.push(f.id);
  // children
  const isGrid = n.L && n.L.d === 'grid' && (n.c || []).some(inFlow);
  const dom = (c) => (n.c || []).indexOf(c);
  const kidsAbs = (n.c || []).filter(c => !inFlow(c)).sort((a, b) => cmpKey(stackKey(a, dom(a)), stackKey(b, dom(b))));
  const flow = []; // the in-flow children's Figma nodes with their paint order (a grid row stands for its items)
  const px = OX, py = OY; OX += n.r[0]; OY += n.r[1];
  if (isGrid) { for (const g of await buildGrid(n, f, where + ' / ' + f.name)) flow.push({ node: g.node, key: g.items.map(c => stackKey(c, dom(c))).sort(cmpKey).pop() }); }
  else if (auto) {
    const mainH = lay.mode === 'HORIZONTAL';
    const cinfo = { auto: true, dir: lay.mode, stretch: lay.stretch, contentW: w - (f.paddingLeft + f.paddingRight), contentH: h - (f.paddingTop + f.paddingBottom) };
    // an auto margin (margin-left: auto in a row) takes all the free space on that side: a growing empty frame stands for it
    const spacer = () => { const s = figma.createFrame(); s.name = 'spacer'; s.fills = []; s.clipsContent = false; f.appendChild(s); s.resize(1, 1); if (mainH) s.layoutSizingHorizontal = 'FILL'; else s.layoutSizingVertical = 'FILL'; };
    const gp = unevenGaps(lay); // exact gap of each pair of siblings when they differ: transparent fixed spacers, with the item spacing at 0
    if (gp) { f.itemSpacing = 0; stats.gapSpacers = (stats.gapSpacers || 0) + gp.filter(g => g >= 0.5).length; }
    const gapSpacer = (g) => { const s = figma.createFrame(); s.name = 'gap'; s.fills = []; s.clipsContent = false; f.appendChild(s); s.resize(mainH ? g : 1, mainH ? 1 : g); };
    let gi = 0;
    for (const c of lay.order) {
      if (gp && gi > 0 && gp[gi - 1] >= 0.5) gapSpacer(gp[gi - 1]);
      gi++;
      const ma = (!lay.wrap && c.F && c.F.ma) || '';
      if (ma.includes(mainH ? 'l' : 't')) spacer();
      const ch = await build(c, f, cinfo, where + ' / ' + f.name); if (ch) flow.push({ node: ch, key: stackKey(c, dom(c)) });
      if (ma.includes(mainH ? 'r' : 'b')) spacer();
    }
  } else {
    for (const c of (n.c || []).filter(inFlow)) { const ch = await build(c, f, { auto: false }, where + ' / ' + f.name); if (ch) flow.push({ node: ch, key: stackKey(c, dom(c)) }); }
  }
  for (const c of kidsAbs) {
    const ch = await build(c, f, { auto: false }, where); placeAbsolute(ch, c, f, w, h);
    // paint order is CSS's: positioned elements paint above non-positioned ones in page order, z-index decides among them, and
    // negative z-index goes behind. The absolute node was appended last (on top); move it below the first in-flow node that paints above it
    if (ch) { const above = flow.find(fl => fl.node.parent === f && cmpKey(fl.key, stackKey(c, dom(c))) > 0); if (above) f.insertChild(f.children.indexOf(above.node), ch); }
  }
  OX = px; OY = py;
  // the value or placeholder of an input, textarea or select (the spec holds it as n.ph, with the field's typography in n.tp)
  if (n.inp && n.ph && n.tp && !/^(checkbox|radio|range|color|file|hidden|image|reset)$/.test(n.inp)) {
    const pad = (n.L && n.L.pad) || [0, 12, 0, 12], bw = (n.bd && n.bd.w) || [0, 0, 0, 0];
    const pl = (pad[3] || 0) + (bw[3] || 0), pr = (pad[1] || 0) + (bw[1] || 0);
    const multi = n.inp === 'textarea';
    const tw = Math.max(10, w - pl - pr);
    const lines = multi ? Math.max(1, Math.round((h - (pad[0] || 0) - (pad[2] || 0)) / (n.tp.lh || n.tp.fs * 1.4 || 20))) : 1;
    const tspec = Object.assign({ k: 't', n: 'Input text', txt: n.ph, r: [pl, 0, tw, n.tp.lh ? n.tp.lh * lines : h], lines, ell: multi ? 0 : 1, nw: multi ? 0 : 1 }, n.tp);
    const tx = await makeText(tspec, { auto: false });
    f.appendChild(tx); sizeText(tx, tspec, f, { auto: false });
    if (auto) { try { tx.layoutPositioning = 'ABSOLUTE'; } catch (e) {} }
    tx.x = pl; tx.y = multi ? (pad[0] || 0) + (bw[0] || 0) : Math.max(0, Math.round((h - tx.height) / 2));
    createdIds.push(tx.id); stats.inputTexts = (stats.inputTexts || 0) + 1;
  }
  return f;
}
function placeAbsolute(node, c, parent, pw, ph) {
  if (!node) return;
  if ('layoutPositioning' in node && parent.layoutMode && parent.layoutMode !== 'NONE') { node.layoutPositioning = 'ABSOLUTE'; stats.absolute++; }
  node.x = c.r[0]; node.y = c.r[1];
  if ('constraints' in node) {
    const l = c.r[0], r = pw - (c.r[0] + c.r[2]), t = c.r[1], b = ph - (c.r[1] + c.r[3]);
    node.constraints = { horizontal: near(l, r, 2) ? 'CENTER' : (r < l ? 'MAX' : 'MIN'), vertical: near(t, b, 2) ? 'CENTER' : (b < t ? 'MAX' : 'MIN') };
  }
}
async function buildGrid(n, f, where) {
  // f is a vertical auto-layout frame we created from the grid container: rows become horizontal frames
  const kids = (n.c || []).filter(inFlow); const rows = []; const tol = 3;
  const L = n.L; const colGap = L.gap ? L.gap[1] : 0, rowGap = L.gap ? L.gap[0] : 0;
  // an item belongs to the row TRACK that holds its vertical centre: items of one row do not share a top edge when align-items centres them (a bar between two lines of text)
  const tracks = String(L.rows || '').split(/\s+/).map(parseFloat);
  if (tracks.length && tracks.every(Number.isFinite)) {
    let y0 = L.pad ? L.pad[0] : 0; const ranges = tracks.map(h => { const r = [y0, y0 + h]; y0 += h + rowGap; return r; });
    const byTrack = new Map();
    for (const c of [...kids].sort((a, b) => a.r[1] - b.r[1] || a.r[0] - b.r[0])) {
      const cy = c.r[1] + c.r[3] / 2; let ti = ranges.findIndex(r => cy >= r[0] - 0.5 && cy <= r[1] + 0.5);
      if (ti < 0) ti = ranges.reduce((best, r, i) => Math.abs(cy - (r[0] + r[1]) / 2) < Math.abs(cy - (ranges[best][0] + ranges[best][1]) / 2) ? i : best, 0);
      if (!byTrack.has(ti)) byTrack.set(ti, { y: c.r[1], items: [] }); byTrack.get(ti).items.push(c);
    }
    for (const ti of [...byTrack.keys()].sort((a, b) => a - b)) rows.push(byTrack.get(ti));
  } else {
    [...kids].sort((a, b) => a.r[1] - b.r[1] || a.r[0] - b.r[0]).forEach(c => { const row = rows.find(r => Math.abs(r.y - c.r[1]) <= tol); if (row) row.items.push(c); else rows.push({ y: c.r[1], items: [c] }); });
  }
  f.itemSpacing = snap(rowGap); await bindSpace(f, 'itemSpacing', snap(rowGap));
  const cw = n.r[2] - (L.pad ? L.pad[1] + L.pad[3] : 0);
  const trackH = String(L.rows || '').split(/\s+/).map(parseFloat); // the used row track heights (px)
  const out = [];
  const ALIGN = (v) => /^center$/.test(v || '') ? 'CENTER' : /^(end|flex-end|right|self-end)$/.test(v || '') ? 'MAX' : 'MIN';
  for (const [ri, row] of rows.entries()) {
    const rf = figma.createAutoLayout('HORIZONTAL'); rf.name = 'Row'; rf.fills = []; stats.gridRows++; // a new frame is white by default
    const items = row.items.sort((a, b) => a.r[0] - b.r[0]);
    rf.itemSpacing = snap(colGap); await bindSpace(rf, 'itemSpacing', snap(colGap));
    // where the items sit comes from the grid's own properties: align-items (up and down), justify-items or the item's justify-self (across)
    rf.counterAxisAlignItems = ALIGN((items.length === 1 && items[0].F && items[0].F.as) || L.ai);
    rf.primaryAxisAlignItems = ALIGN((items.length === 1 && items[0].F && items[0].F.js) || L.ji);
    f.appendChild(rf); rf.layoutSizingHorizontal = 'FILL'; rf.layoutSizingVertical = 'HUG';
    // a row track taller than its items keeps its height, so align-items has room to centre or end them inside it
    const track = trackH[ri]; const tallest = Math.max(...items.map(c => c.r[3]));
    if (Number.isFinite(track) && track > tallest + 1 && /^(center|end|flex-end|self-end)$/.test(String((items.length === 1 && items[0].F && items[0].F.as) || L.ai || ''))) { rf.resize(Math.max(1, cw), track); rf.layoutSizingHorizontal = 'FILL'; }
    const equal = items.every(c => near(c.r[2], items[0].r[2], 2));
    const rowH = Math.max(...items.map(c => c.r[3]));
    let holder = false; // the row hugs its items, so one item at the row's height must stay at that height (a tile with an absolutely placed picture and a short caption would collapse to the caption); the others follow it
    for (const c of items) {
      const ch = await build(c, rf, { auto: true, dir: 'HORIZONTAL', stretch: true, contentW: cw, contentH: rowH }, where);
      if (ch && ch.type === 'FRAME' && equal && items.length > 1) { ch.layoutSizingHorizontal = 'FILL'; }
      if (ch && ch.type === 'FRAME' && near(c.r[3], rowH, 1.5)) { if (!holder) { holder = true; try { const hz = ch.layoutSizingHorizontal; ch.resize(ch.width, Math.max(1, c.r[3])); /* resize makes both directions fixed */ if (hz === 'FILL') ch.layoutSizingHorizontal = 'FILL'; } catch (e) {} } else { try { ch.layoutSizingVertical = 'FILL'; } catch (e) {} } }
    }
    createdIds.push(rf.id);
    out.push({ node: rf, items });
  }
  return out;
}

// ---------- run ----------
const sec = SPEC; const root = sec.node || {};
let parent;
if (sec.parentId) { parent = await figma.getNodeByIdAsync(sec.parentId); }
else { const page = sec.pageId ? await figma.getNodeByIdAsync(sec.pageId) : figma.currentPage; if (sec.pageId) await figma.setCurrentPageAsync(page); parent = page; }
const pinfo = (parent && parent.layoutMode && parent.layoutMode !== 'NONE') ? { auto: true, dir: parent.layoutMode, stretch: true, contentW: parent.width, contentH: parent.height } : { auto: false };
let built;
if (sec.overlayOnly) {
  built = figma.createFrame(); stats.overlayOnly = 1;
  built.fills = []; built.clipsContent = true; built.resize(sec.width, sec.cropHeight);
  parent.appendChild(built);
  for (const a of (sec.add || [])) {
    const ch = await build(a, built, { auto: false }, a.n || 'Overlay');
    if (!ch) continue;
    if (a.r) { ch.x = a.r[0]; ch.y = a.r[1]; }
    stats.overlays = (stats.overlays || 0) + 1;
  }
} else if (sec.cloneOf) {
  const src = await figma.getNodeByIdAsync(sec.cloneOf);
  if (!src) throw new Error('cloneOf: the base frame ' + sec.cloneOf + ' was not found');
  built = src.clone(); stats.cloned = 1;
  parent.appendChild(built);
  if (sec.cropHeight) { built.clipsContent = true; built.resize(built.width, sec.cropHeight); }
  const pi = (built.layoutMode && built.layoutMode !== 'NONE') ? { auto: true, dir: built.layoutMode, stretch: true, contentW: built.width, contentH: built.height } : { auto: false };
  for (const a of (sec.add || [])) {
    const ch = await build(a, built, pi, a.n || 'Overlay');
    if (!ch) continue;
    if (pi.auto) { try { ch.layoutPositioning = 'ABSOLUTE'; } catch (e) {} }
    if (a.r) { ch.x = a.r[0]; ch.y = a.r[1]; }
    stats.overlays = (stats.overlays || 0) + 1;
  }
} else {
  built = await build(root, parent, pinfo, sec.name || root.n || 'Frame');
}
if (built && sec.name) built.name = sec.name;
// a page is built top-level child by top-level child, in page order; CSS paints a fixed header (z-index) above the content that follows it,
// so a section goes where CSS paints it among the siblings already built (their keys are kept in plugin data)
if (built && sec.parentId && typeof sec.dom === 'number') {
  const mine = stackKey(root, sec.dom); built.setSharedPluginData('pipeline', 'stack', JSON.stringify(mine));
  const keyOf = (n) => { try { return JSON.parse(n.getSharedPluginData('pipeline', 'stack')); } catch (e) { return null; } };
  let idx = 0; for (const s of parent.children) { if (s !== built && cmpKey(keyOf(s) || [0, 0, 0], mine) <= 0) idx++; }
  parent.insertChild(idx, built);
}
if (built && !sec.parentId && typeof sec.x === 'number') { built.x = sec.x; built.y = sec.y; }
if (built && sec.asComponent && !sec.parentId) { const c = figma.createComponentFromNode(built); c.name = sec.asComponent.name || built.name; c.setSharedPluginData('pipeline', 'component', root.comp || ''); c.setSharedPluginData('pipeline', 'sig', root.sig || ''); built = c; }
if (built && !sec.parentId) { if (!sec.overlayOnly) built.clipsContent = true; built.setSharedPluginData('pipeline', 'source', 'spec'); if (sec.cloneOf) built.setSharedPluginData('pipeline', 'clonedFrom', String(sec.cloneOf)); if (sec.hash) built.setSharedPluginData('pipeline', 'hash', String(sec.hash)); }
// drift: where each text was built against where the page measured it (a free check of the layout; no screenshot needed)
let drift = null;
try {
  const origin = (sec.parentId ? parent : built);
  if (origin && origin.absoluteTransform && TEXTS.length) {
    const ox = origin.absoluteTransform[0][2], oy = origin.absoluteTransform[1][2];
    const ds = TEXTS.filter(t => t.tx.absoluteTransform).map(t => ({ n: (t.tx.name || '').slice(0, 30), dx: Math.round(t.tx.absoluteTransform[0][2] - ox - t.x), dy: Math.round(t.tx.absoluteTransform[1][2] - oy - t.y) }));
    // height: a text whose built height differs from the measured one has wrapped onto another number of lines, or has another line height; these push everything below it
    const hs = TEXTS.filter(t => t.tx.height !== undefined && Math.abs(t.tx.height - t.h) > 3).map(t => ({ n: (t.tx.name || '').slice(0, 24), sw: Math.round(t.w), bw: Math.round(t.tx.width), sh: Math.round(t.h), bh: Math.round(t.tx.height), l: t.l, lh: t.lh, fs: t.fs }));
    drift = { heights: { count: hs.length, first: hs.slice(0, 6) }, texts: ds.length, off: ds.filter(d => Math.abs(d.dx) > 8 || Math.abs(d.dy) > 8).length, worst: ds.sort((a, b) => Math.max(Math.abs(b.dx), Math.abs(b.dy)) - Math.max(Math.abs(a.dx), Math.abs(a.dy))).slice(0, 3) };
  }
} catch (e) {}
return { drift, createdNodeIds: createdIds, rootId: built && built.id, root: built && { name: built.name, w: Math.round(built.width), h: Math.round(built.height) }, stats, images, bgImages, missingFonts: [...missingFonts], approximated: [...approximated], deviations: deviations.slice(0, 60), deviationCount: deviations.length };
