/* Spec extractor: reads the rendered page and returns a compact layout spec for Figma.
 * Runs in the page (Playwright `page.evaluate`, or the built-in browser's `javascript_tool`).
 * It only reads the page, except that it temporarily turns ::before and ::after pseudo-elements into
 * real elements so they can be measured, and removes them again before it returns.
 * Usage: evaluate the whole file as an expression; it returns { v, viewport, page, root, fonts }.
 * Run it AFTER the page is in its final state (document.fonts.ready, capture mode ready).
 */
(() => {
  const MAX_NODES = 4000;
  let count = 0;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'HEAD', 'TITLE', 'BASE', 'DATALIST']);
  const INLINE_OK = new Set(['A', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'CODE', 'SMALL', 'MARK', 'U', 'S', 'SUB', 'SUP', 'ABBR', 'TIME', 'LABEL']);
  const SX = scrollX, SY = scrollY;
  const r1 = n => Math.round(n * 10) / 10;
  const px = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const fonts = {};

  // ---- pseudo-elements become real elements while we measure
  const injected = [], marked = [];
  const style = document.createElement('style');
  style.textContent = '.__np::before,.__np::after{content:none!important;display:none!important}';
  document.head.appendChild(style);
  function injectPseudo(el, which) {
    const cs = getComputedStyle(el, which);
    const c = cs.content;
    if (!c || c === 'none' || c === 'normal' || cs.display === 'none') return null;
    const w = px(cs.width), h = px(cs.height);
    const text = /^["']/.test(c) ? c.slice(1, -1) : '';
    if (!text && (w <= 0 || h <= 0)) return null;
    const s = document.createElement('span');
    s.setAttribute('data-pseudo', which);
    for (const p of cs) { try { s.style.setProperty(p, cs.getPropertyValue(p)); } catch (e) {} }
    s.style.setProperty('content', 'none');
    s.textContent = text;
    return s;
  }
  [...document.body.querySelectorAll('*')].forEach(el => {
    if (SKIP.has(el.tagName) || el.closest('svg')) return;
    const b = injectPseudo(el, '::before'), a = injectPseudo(el, '::after');
    if (b || a) { el.classList.add('__np'); marked.push(el); }
    if (b) { el.insertBefore(b, el.firstChild); injected.push(b); }
    if (a) { el.appendChild(a); injected.push(a); }
  });

  function colorAlpha(c) {
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return c && c !== 'transparent' ? 1 : 0;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean);
    return p.length > 3 ? parseFloat(p[3]) : 1;
  }
  function nameOf(el) {
    if (el.dataset && el.dataset.pseudo) return 'Pseudo ' + el.dataset.pseudo.replace('::', '');
    const dc = el.getAttribute && (el.getAttribute('data-component') || el.getAttribute('data-frame'));
    if (dc) return dc;
    const al = el.getAttribute && el.getAttribute('aria-label');
    if (al) return al.slice(0, 40);
    if (el.id) return el.id;
    const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).find(c => /^[A-Za-z][\w-]{2,}$/.test(c) && !/^(flex|grid|block|relative|absolute|container|wrapper|row|col)$/i.test(c));
    return cls || el.tagName.toLowerCase();
  }
  function typo(cs) {
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const o = { ff: fam, fs: px(cs.fontSize), fw: parseInt(cs.fontWeight, 10) || 400, lh: cs.lineHeight === 'normal' ? 0 : px(cs.lineHeight), col: cs.color };
    const ls = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing); if (ls) o.ls = r1(ls);
    if (cs.fontStyle === 'italic') o.it = 1;
    if (cs.textTransform !== 'none') o.tt = cs.textTransform;
    if (cs.textDecorationLine !== 'none') o.td = cs.textDecorationLine;
    if (cs.textAlign && !/^(start|left)$/.test(cs.textAlign)) o.ta = cs.textAlign;
    const key = fam + '|' + o.fw + '|' + (o.it ? 'italic' : 'normal');
    fonts[key] = (fonts[key] || 0) + 1;
    return o;
  }
  function rectOf(range) {
    const rs = [...range.getClientRects()].filter(q => q.width > 0 && q.height > 0);
    if (!rs.length) return null;
    const x0 = Math.min(...rs.map(q => q.left)), y0 = Math.min(...rs.map(q => q.top));
    const x1 = Math.max(...rs.map(q => q.right)), y1 = Math.max(...rs.map(q => q.bottom));
    const tops = new Set(rs.map(q => Math.round(q.top / 4)));
    return { x: x0 + SX, y: y0 + SY, w: x1 - x0, h: y1 - y0, lines: tops.size };
  }
  function isInlineFlow(el) {
    let any = false;
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3) { if (ch.textContent.trim()) any = true; continue; }
      if (ch.nodeType !== 1) continue;
      if (ch.tagName === 'BR') continue;
      const d = getComputedStyle(ch).display;
      if (!INLINE_OK.has(ch.tagName) || !/^inline/.test(d) || d.includes('flex') || d.includes('grid') || ch.querySelector('img,svg,video,canvas,input,button,select,textarea')) return false;
      if (ch.textContent.trim()) any = true;
    }
    return any;
  }
  function runsOf(el) {
    const runs = [];
    (function w(n, inherited) {
      for (const ch of n.childNodes) {
        if (ch.nodeType === 3) {
          const t = ch.textContent.replace(/\s+/g, ' ');
          if (t) runs.push({ txt: t, ...typo(getComputedStyle(n)) });
        } else if (ch.nodeType === 1) {
          if (ch.tagName === 'BR') runs.push({ txt: '\n', ...typo(getComputedStyle(n)) });
          else w(ch);
        }
      }
    })(el);
    if (runs.length) { runs[0].txt = runs[0].txt.replace(/^\s+/, ''); runs[runs.length - 1].txt = runs[runs.length - 1].txt.replace(/\s+$/, ''); }
    return runs.filter(r => r.txt.length);
  }

  function visual(cs, o) {
    const bg = cs.backgroundColor; if (colorAlpha(bg) > 0) o.bg = bg;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') o.bgi = cs.backgroundImage.slice(0, 600);
    const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px);
    if (bw.some(Boolean) && cs.borderTopStyle !== 'none') {
      o.bd = { w: bw, c: [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor], s: cs.borderTopStyle };
    }
    const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px);
    if (rad.some(Boolean)) o.rad = rad;
    if (cs.boxShadow && cs.boxShadow !== 'none') o.sh = cs.boxShadow;
    if (+cs.opacity < 1) o.op = +cs.opacity;
    if (cs.filter && cs.filter !== 'none') o.fl = cs.filter;
    if (cs.backdropFilter && cs.backdropFilter !== 'none') o.bf = cs.backdropFilter;
    if (/hidden|clip/.test(cs.overflowX + cs.overflowY)) o.ov = 1;
    if (cs.transform && cs.transform !== 'none') o.tf = cs.transform;
  }
  function layout(cs, o) {
    const d = cs.display;
    const L = { d: d.includes('flex') ? 'flex' : d.includes('grid') ? 'grid' : d.startsWith('inline') ? 'inline' : 'block' };
    if (d.startsWith('inline') && L.d !== 'inline') L.inl = 1;
    if (L.d === 'flex') {
      L.dir = cs.flexDirection.startsWith('column') ? 'col' : 'row';
      if (cs.flexDirection.endsWith('reverse')) L.rev = 1;
      if (cs.flexWrap !== 'nowrap') L.wrap = 1;
      L.jc = cs.justifyContent; L.ai = cs.alignItems;
    }
    if (L.d === 'flex' || L.d === 'grid') { L.gap = [px(cs.rowGap), px(cs.columnGap)]; }
    if (L.d === 'grid') { L.cols = cs.gridTemplateColumns; L.rows = cs.gridTemplateRows; L.ai = cs.alignItems; L.jc = cs.justifyContent; }
    const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
    if (pad.some(Boolean)) L.pad = pad;
    if (cs.position === 'absolute' || cs.position === 'fixed' || cs.position === 'sticky') L.pos = cs.position;
    if (cs.zIndex !== 'auto') L.z = +cs.zIndex;
    o.L = L;
  }
  function childFlex(cs, o) {
    const f = {};
    if (+cs.flexGrow) f.g = +cs.flexGrow;
    if (cs.alignSelf !== 'auto' && cs.alignSelf !== 'normal') f.as = cs.alignSelf;
    if (cs.whiteSpace === 'nowrap') f.nw = 1;
    if (Object.keys(f).length) o.F = f;
  }

  function walk(el, parentBox) {
    if (count > MAX_NODES) return [];
    if (el.nodeType === 3) return [];
    if (el.nodeType !== 1 || SKIP.has(el.tagName) || el.hasAttribute('data-da-ui') || el.hasAttribute('data-capture-skip')) return [];
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return [];
    if (cs.display === 'contents') return [].concat(...[...el.childNodes].map(c => walk(c, parentBox)));
    const br = el.getBoundingClientRect();
    const box = { x: br.left + SX, y: br.top + SY, w: br.width, h: br.height };
    if (+cs.opacity === 0) return [];
    const rel = [r1(box.x - parentBox.x), r1(box.y - parentBox.y), r1(box.w), r1(box.h)];
    const tag = el.tagName;
    count++;

    if (tag === 'IMG' || tag === 'VIDEO' || tag === 'CANVAS' || tag === 'PICTURE') {
      if (box.w <= 0 || box.h <= 0) return [];
      const o = { k: 'i', n: nameOf(el), r: rel, kind: tag.toLowerCase() };
      const im = tag === 'PICTURE' ? el.querySelector('img') : el;
      if (tag === 'IMG' || im) { o.src = (im.currentSrc || im.src || '').slice(0, 400); o.alt = (im.alt || '').slice(0, 80); o.nw = im.naturalWidth; o.nh = im.naturalHeight; }
      if (tag === 'VIDEO') o.src = (el.poster || el.currentSrc || '').slice(0, 400);
      o.fit = cs.objectFit; visual(cs, o); childFlex(cs, o); layout(cs, o);
      return [o];
    }
    if (tag === 'svg' || tag === 'SVG') {
      if (box.w <= 0 || box.h <= 0) return [];
      const clone = el.cloneNode(true);
      clone.setAttribute('width', r1(box.w)); clone.setAttribute('height', r1(box.h));
      let markup = clone.outerHTML.replace(/currentColor/g, cs.color);
      const o = { k: 's', n: nameOf(el), r: rel };
      if (markup.length <= 24000) o.svg = markup; else o.kind = 'svg-too-large';
      visual(cs, o); childFlex(cs, o); layout(cs, o);
      return [o];
    }

    const o = { k: 'f', n: nameOf(el), r: rel };
    if (el.dataset && el.dataset.pseudo) o.pseudo = el.dataset.pseudo;
    if (/^H[1-6]$/.test(tag)) o.h = +tag[1];
    if (tag === 'BUTTON' || tag === 'A' || el.getAttribute('role') === 'button') o.act = tag === 'A' ? 'link' : 'button';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { o.inp = (el.type || tag.toLowerCase()); o.ph = el.placeholder || el.value || ''; Object.assign(o, { tp: typo(cs) }); }
    visual(cs, o); layout(cs, o); childFlex(cs, o);

    // inline formatting context -> one rich text node
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && isInlineFlow(el)) {
      const range = document.createRange(); range.selectNodeContents(el);
      const tr = rectOf(range);
      const runs = runsOf(el);
      if (tr && runs.length) {
        const base = typo(cs);
        const t = { k: 't', n: (runs.map(r => r.txt).join('').slice(0, 30)) || o.n, r: [r1(tr.x - box.x), r1(tr.y - box.y), r1(tr.w), r1(tr.h)], lines: tr.lines, ...base };
        if (runs.length > 1 || runs.some(r => r.fw !== base.fw || r.col !== base.col || r.fs !== base.fs || r.ff !== base.ff || r.td !== base.td || r.it !== base.it)) t.runs = runs;
        else t.txt = runs[0].txt;
        if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') t.clamp = +cs.webkitLineClamp;
        if (cs.textOverflow === 'ellipsis') t.ell = 1;
        if (cs.whiteSpace === 'nowrap') t.nw = 1;
        if (t.clamp || o.ov || /hidden|clip/.test(cs.overflowY)) { // only the visible part of clipped text counts
          t.r[3] = r1(Math.min(t.r[3], Math.max(0, box.h - t.r[1])));
          if (t.clamp) t.lines = Math.min(t.lines, t.clamp);
        }
        const hasBox = o.bg || o.bgi || o.bd || o.sh || o.rad || o.L.pad || o.act || o.op;
        if (!hasBox && !o.ov) { // a plain text block: the text node stands for the element
          t.r = rel.slice(0, 2).concat([r1(Math.max(box.w, tr.w)), r1(Math.max(box.h, tr.h))]);
          t.n = o.n === tag.toLowerCase() ? t.n : o.n;
          if (o.F) t.F = o.F; if (o.L.pos) t.L = { pos: o.L.pos };
          if (o.h) t.h = o.h;
          return [t];
        }
        o.c = [t];
        return [o];
      }
    }

    // children (elements and loose text nodes)
    const kids = [];
    for (const ch of el.childNodes) {
      if (ch.nodeType === 1) kids.push(...walk(ch, box));
      else if (ch.nodeType === 3 && ch.textContent.trim()) {
        const range = document.createRange(); range.selectNodeContents(ch);
        const tr = rectOf(range); if (!tr) continue;
        count++;
        const t = { k: 't', n: ch.textContent.trim().slice(0, 30), r: [r1(tr.x - box.x), r1(tr.y - box.y), r1(tr.w), r1(tr.h)], lines: tr.lines, txt: ch.textContent.replace(/\s+/g, ' ').trim(), ...typo(cs) };
        if (cs.whiteSpace === 'nowrap') t.nw = 1;
        if (cs.textOverflow === 'ellipsis') t.ell = 1;
        kids.push(t);
      }
    }
    if (kids.length) o.c = kids;
    if (!kids.length && !o.bg && !o.bgi && !o.bd && !o.sh && !o.inp && !o.pseudo && !(o.L && o.L.pos)) { if (box.w < 1 || box.h < 1) return []; }

    // flatten a pure wrapper: one child, same size, no look of its own
    if (kids.length === 1 && !o.bg && !o.bgi && !o.bd && !o.sh && !o.rad && !o.op && !o.ov && !o.fl && !o.bf && !o.act && !o.h && !(o.L && o.L.pos)) {
      const k = kids[0];
      if (Math.abs(k.r[2] - rel[2]) <= 1 && Math.abs(k.r[3] - rel[3]) <= 1 && !k.L?.pos) {
        k.r = [r1(rel[0] + k.r[0]), r1(rel[1] + k.r[1]), k.r[2], k.r[3]];
        if (o.F && !k.F) k.F = o.F;
        return [k];
      }
    }
    return [o];
  }

  const bodyBox = { x: 0, y: 0, w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight };
  const bs = getComputedStyle(document.body), hs = getComputedStyle(document.documentElement);
  const root = { k: 'f', n: 'Page', r: [0, 0, bodyBox.w, bodyBox.h] };
  const bg = colorAlpha(bs.backgroundColor) > 0 ? bs.backgroundColor : (colorAlpha(hs.backgroundColor) > 0 ? hs.backgroundColor : 'rgb(255, 255, 255)');
  root.bg = bg;
  layout(bs, root);
  root.c = [].concat(...[...document.body.childNodes].map(c => c.nodeType === 1 ? walk(c, bodyBox) : []));
  if (root.L && root.L.d === 'block') root.L.d = 'block';

  // restore the page
  injected.forEach(s => s.remove());
  marked.forEach(e => e.classList.remove('__np'));
  style.remove();

  const fontList = Object.entries(fonts).map(([k, n]) => {
    const [family, weight, st] = k.split('|');
    let loaded = null; try { loaded = document.fonts.check(`${st === 'italic' ? 'italic ' : ''}${weight} 16px "${family}"`); } catch (e) {}
    return { family, weight: +weight, style: st, count: n, loaded };
  }).sort((a, b) => b.count - a.count);

  return { v: 1, url: location.href, title: document.title, viewport: { w: innerWidth, h: innerHeight }, page: { w: bodyBox.w, h: bodyBox.h }, nodes: count, truncated: count > MAX_NODES, fonts: fontList, root };
})()
