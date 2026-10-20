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

  // a component's signature: structure and look, not content or size (the text, the label length and the box size may differ per use)
  function sigOf(n) {
    const part = (x) => [
      x.k,
      x.k === 'i' || x.k === 's' ? Math.round(x.r[2]) + 'x' + Math.round(x.r[3]) : '',
      x.bg || '', x.bd ? x.bd.w.join() + x.bd.c[0] : '', x.rad ? x.rad.join() : '',
      x.k === 't' ? [x.ff, x.fs, x.fw, x.col].join() : '',
      x.L ? [x.L.d, x.L.dir, x.L.jc, x.L.ai, x.L.pad].join() : '',
      (x.c || []).map(part).join('|')
    ].join('~');
    const str = part(n); let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16);
  }

  // an <img> whose source is an SVG file (or data URL) cannot be filled into a Figma image placeholder, so read its markup and
  // return it as an inline svg node. Returns '' when the markup can't be read (the image stays a placeholder).
  // the transform that really applies: the individual properties translate, rotate and scale (a mirrored arrow written as `scale: -1 1`) come
  // before the transform property in CSS, and getComputedStyle(...).transform does not include them
  function effMatrix(cs) {
    let m = new DOMMatrix();
    const nums = (s) => String(s).split(/\s+/).map(parseFloat);
    if (cs.translate && cs.translate !== 'none') { const [x, y] = nums(cs.translate); m = m.translate(x || 0, y || 0); }
    if (cs.rotate && cs.rotate !== 'none') { const r = parseFloat(cs.rotate); if (Number.isFinite(r)) m = m.rotate(r); }
    if (cs.scale && cs.scale !== 'none') { const [sx, sy] = nums(cs.scale); m = m.scale(sx, Number.isFinite(sy) ? sy : sx); }
    if (cs.transform && cs.transform !== 'none') m = m.multiply(new DOMMatrix(cs.transform));
    return m;
  }
  function svgFromImg(el, box, cs) {
    const src = el.currentSrc || el.src || '';
    let markup = '';
    try {
      if (/^data:image\/svg\+xml/i.test(src)) { const m = /^data:image\/svg\+xml(;base64)?,([\s\S]*)$/i.exec(src); markup = m ? (m[1] ? atob(m[2]) : decodeURIComponent(m[2])) : ''; }
      else if (/\.svg(\?|#|$)/i.test(src)) { const x = new XMLHttpRequest(); x.open('GET', src, false); x.send(); if (x.status >= 200 && x.status < 300) markup = x.responseText || ''; }
    } catch (e) { return ''; }
    markup = markup.replace(/<\?xml[^>]*\?>/i, '').replace(/<!--[\s\S]*?-->/g, '').trim();
    if (!/<svg[\s>]/i.test(markup) || markup.length > 24000) return '';
    // a CSS filter such as brightness(0) invert(1) turns a dark icon white: apply it to the colours
    if (cs && /brightness\(0\)/.test(cs.filter || '') && /invert\((1|100%)\)/.test(cs.filter || '')) markup = markup.replace(/(fill|stroke)="(?!none)[^"]*"/g, '$1="#ffffff"').replace(/currentColor/g, '#ffffff');
    else markup = markup.replace(/currentColor/g, 'rgb(0, 0, 0)');
    let vb = null;
    markup = markup.replace(/<svg\b([^>]*)>/i, (m, attrs) => {
      const ow = /\swidth="([\d.]+)/.exec(attrs), oh = /\sheight="([\d.]+)/.exec(attrs);
      let a = attrs.replace(/\s(width|height)="[^"]*"/g, '');
      if (!/\sviewBox=/.test(a) && ow && oh) a += ` viewBox="0 0 ${ow[1]} ${oh[1]}"`;
      const v = /\sviewBox="([^"]+)"/.exec(a); if (v) vb = v[1].trim().split(/[\s,]+/).map(Number);
      return `<svg${a} width="${r1(box.w)}" height="${r1(box.h)}">`;
    });
    // a CSS transform that mirrors the image (a back arrow flipped for the other direction) is applied to the drawing itself
    const em = cs ? effMatrix(cs) : null;
    if (em && vb && vb.length === 4 && vb.every(Number.isFinite)) {
      const { a, b, c, d } = em;
      if (Math.abs(b) < 1e-6 && Math.abs(c) < 1e-6 && (a < 0 || d < 0)) {
        const [vx, vy, vw, vh] = vb;
        const t = `matrix(${a < 0 ? -1 : 1} 0 0 ${d < 0 ? -1 : 1} ${a < 0 ? 2 * vx + vw : 0} ${d < 0 ? 2 * vy + vh : 0})`;
        markup = markup.replace(/(<svg\b[^>]*>)([\s\S]*)(<\/svg>)/i, (m, o, inner, cl) => o + '<g transform="' + t + '">' + inner + '</g>' + cl);
      }
    }
    return markup;
  }

  function visual(cs, o) {
    const bg = cs.backgroundColor; if (colorAlpha(bg) > 0) o.bg = bg;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      // a gradient drawn as a hair-thin strip or at zero size (an animated link underline) is not a fill of the whole box
      const sz = (cs.backgroundSize || '').split(/\s+/);
      const strip = /gradient/.test(cs.backgroundImage) && (sz.some(v => /^0(px|%)?$/.test(v)) || (sz.length === 2 && /px$/.test(sz[1]) && parseFloat(sz[1]) <= 4));
      if (!strip) o.bgi = cs.backgroundImage.slice(0, 600);
    }
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
    { const m = effMatrix(cs); if (!m.isIdentity) o.tf = m.toString(); }
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
    if (L.d === 'grid') {
      L.cols = cs.gridTemplateColumns; L.rows = cs.gridTemplateRows; L.ai = cs.alignItems; L.jc = cs.justifyContent;
      // justify-items (place-items) decides where an item sits inside its column; without it a centred dialog or icon loses its centring
      if (cs.justifyItems && !/^(normal|stretch|legacy)$/.test(cs.justifyItems)) L.ji = cs.justifyItems.replace(/^(legacy|safe|unsafe)\s+/, '');
    }
    const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
    if (pad.some(Boolean)) L.pad = pad;
    if (cs.position !== 'static') L.pos = cs.position; // absolute, fixed, sticky AND relative: a positioned element paints above non-positioned ones, in page order
    if (cs.zIndex !== 'auto') L.z = +cs.zIndex;
    o.L = L;
  }
  function childFlex(cs, o, el) {
    const f = {};
    // CSS order changes the visual sequence of flex and grid items; an auto margin (margin-left: auto) pushes the item and what follows it to the far side.
    // The computed value of an auto margin is a number of pixels, so the keyword is read from the style map
    if (+cs.order) f.o = +cs.order;
    if (el && el.parentElement && /flex/.test(getComputedStyle(el.parentElement).display) && el.computedStyleMap) {
      let ma = ''; try { const sm = el.computedStyleMap(); for (const [k, ch] of [['margin-left', 'l'], ['margin-right', 'r'], ['margin-top', 't'], ['margin-bottom', 'b']]) if (String(sm.get(k)) === 'auto') ma += ch; } catch (e) {}
      if (ma) f.ma = ma;
    }
    if (+cs.flexGrow) f.g = +cs.flexGrow;
    if (cs.alignSelf !== 'auto' && cs.alignSelf !== 'normal') f.as = cs.alignSelf;
    if (cs.justifySelf && !/^(auto|normal|stretch|legacy)$/.test(cs.justifySelf)) f.js = cs.justifySelf.replace(/^(safe|unsafe)\s+/, ''); // grid item placed in its column by itself
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
      if (tag === 'IMG' && !el.getAttribute('data-np-file')) { const sv = svgFromImg(el, box, cs); if (sv) { const so = { k: 's', n: nameOf(el), r: rel, svg: sv }; visual(cs, so); childFlex(cs, so, el); layout(cs, so); return [so]; } }
      const o = { k: 'i', n: nameOf(el), r: rel, kind: tag.toLowerCase() };
      const mediaFile = el.getAttribute('data-np-file'); if (mediaFile) o.file = mediaFile; // pixels saved by extract-spec.mjs for a video or canvas
      const im = tag === 'PICTURE' ? el.querySelector('img') : el;
      if (tag === 'IMG' || im) { o.src = (im.currentSrc || im.src || '').slice(0, 400); o.alt = (im.alt || '').slice(0, 80); o.nw = im.naturalWidth; o.nh = im.naturalHeight; }
      if (tag === 'VIDEO') o.src = (el.poster || el.currentSrc || '').slice(0, 400);
      o.fit = cs.objectFit; visual(cs, o); childFlex(cs, o, el); layout(cs, o);
      return [o];
    }
    if (tag === 'svg' || tag === 'SVG') {
      if (box.w <= 0 || box.h <= 0) return [];
      const rasterFile = el.getAttribute('data-np-file');
      if (rasterFile) { const ro = { k: 'i', n: nameOf(el), r: rel, kind: 'svg-picture', file: rasterFile }; visual(cs, ro); return [ro]; } // an SVG Figma cannot import: its saved picture
      const clone = el.cloneNode(true);
      clone.setAttribute('width', r1(box.w)); clone.setAttribute('height', r1(box.h));
      let markup = clone.outerHTML.replace(/currentColor/g, cs.color);
      const o = { k: 's', n: nameOf(el), r: rel };
      if (markup.length <= 24000) o.svg = markup; else o.kind = 'svg-too-large';
      visual(cs, o); childFlex(cs, o, el); layout(cs, o);
      return [o];
    }

    const o = { k: 'f', n: nameOf(el), r: rel };
    if (el.dataset && el.dataset.pseudo) o.pseudo = el.dataset.pseudo;
    const compName = el.getAttribute('data-component'); if (compName) o.comp = compName;
    if (/^H[1-6]$/.test(tag)) o.h = +tag[1];
    if (tag === 'BUTTON' || tag === 'A' || el.getAttribute('role') === 'button') o.act = tag === 'A' ? 'link' : 'button';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { o.inp = (el.type || tag.toLowerCase());
      const val = tag === 'SELECT' ? ((el.selectedOptions && el.selectedOptions[0] && el.selectedOptions[0].text) || '') : (el.value || '');
      o.ph = el.type === 'password' && val ? '\u2022'.repeat(val.length) : (val || el.placeholder || '');
      let tp = typo(cs);
      if (!val && el.placeholder) { try { const pc = getComputedStyle(el, '::placeholder').color; if (pc) tp = { ...tp, col: pc }; } catch (e) {} } // the placeholder has its own colour
      o.tp = tp; }
    visual(cs, o); layout(cs, o); childFlex(cs, o, el);
    if (el.hasAttribute('data-np-css') && el.getAttribute('data-np-file')) { o.bgfile = el.getAttribute('data-np-file'); delete o.bgi; } // painted by something Figma cannot draw: its saved picture is the fill

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
        if (o.comp) o.sig = sigOf(o);
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
    if (o.comp) o.sig = sigOf(o);
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
