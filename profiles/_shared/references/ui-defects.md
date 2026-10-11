# UI defects: what the Auditor looks for on screen

Usability and accessibility are covered elsewhere. This file is the **visual bug hunt**: things that look wrong, broken or sloppy in the rendered UI. The Auditor checks each frame at each chosen viewport, plus intermediate widths, with a measurement script and with its own eyes on screenshots.

## How to run it

1. **Widths to test:** every viewport the scope chose, plus **320, 768 and 1280** if they are not already among them (layouts break between breakpoints). Resize with `resize_window`, then reload the frame route.
2. **Measure first.** On each frame at each width run the script below with `javascript_tool`; it returns candidate defects as data. Every hit is a candidate: confirm it on a screenshot before reporting it (some overflow is deliberate, such as a horizontal carousel).
3. **Then look.** Take a screenshot of every frame at the **primary viewport** (scroll the full page, one screenshot per screen height) and of any frame where the script found something at the other widths. Judge what the script can't: alignment, spacing rhythm, balance, hierarchy, consistency between screens. Don't screenshot every frame at every width; that wastes tokens.
4. **Report** each defect as `[severity] UI: <Screen / State> @ <width> — <what is wrong and where> → <fix>`, grouped by the categories below.

## Categories

**Overflow and clipping**
- Horizontal page scroll that isn't intended (`scrollWidth > innerWidth`); elements wider than their container or the viewport.
- Text cut off without a way to read it (hidden overflow, `text-overflow` without a title or expansion); buttons whose label wraps badly or spills out.
- Content hidden under a fixed or sticky header, footer, cookie bar or bottom navigation; the last item unreachable.
- Dropdowns, menus and tooltips clipped by an `overflow: hidden` parent or cut off at the viewport edge.

**Overlap and stacking**
- Elements overlapping that shouldn't: text over text, text over images without enough contrast or a scrim, controls covered by other layers.
- Wrong `z-index`: modals under content, sticky elements over dialogs, toasts hidden.
- Fixed elements that cover interactive controls on small screens.

**Alignment and spacing**
- Things that should line up but don't: left edges, baselines of label and value, icon and text centring, columns, grid gutters.
- Inconsistent spacing: different gaps between the same kind of items, different padding on identical cards or buttons, uneven section rhythm, cramped or huge empty areas.
- Uneven card or row heights where the pattern calls for equal; unbalanced columns; orphaned single items on the last row.

**Typography**
- Sizes or weights outside the type scale; more than the system's font families; fallback font showing; missing glyphs (boxes) in Arabic or other scripts.
- Bad line length (over about 80 characters or under about 30 in body text), tight or loose line height, single-word last lines (orphans) in headings, long ALL-CAPS strings.
- Text too small to read (under 12px) or too large for its container.

**Colour, surfaces and effects**
- Colours outside the palette or tokens; inconsistent radii, shadows, borders or elevations between similar components.
- Disabled elements that look enabled (or the reverse); selected and unselected states that look alike.
- Dark mode (if present): unreadable text, images or logos that don't adapt, leftover light surfaces.

**Images and media**
- Broken or missing images (`naturalWidth` 0), placeholder boxes left in, wrong aspect ratio or stretched images, blurry images (rendered larger than their natural size), layout jumping when media loads, missing alt text.
- Icons of mixed sizes or stroke styles, or from two different sets; icons that don't align with text.
- Video or canvas/WebGL that is blank, mis-sized or not paused for reduced motion.

**Components and states**
- The same component looking different on different screens (button heights, input styles, card padding); two ways to do the same thing.
- Missing or inconsistent hover, focus, active, disabled, loading and error looks; forms with misaligned labels, hints and errors; error text pushing the layout around.
- Empty containers, empty states with no message, skeletons that don't match the loaded layout.

**Responsive behaviour**
- Layout breaking between breakpoints (check 320, 768, 1280 and the chosen widths); columns that never collapse; navigation that collides with the logo; touch targets packed too close on small screens (under 8px apart).
- A sticky header taking too much of a small viewport; modals taller than the screen with no scroll; fixed `px` widths or `100vh` shells that break on mobile browsers.

**Direction and localisation (when the scope has them)**
- RTL: layout mirrored, icons that show direction flipped (arrows, chevrons), text aligned to the start edge, numbers and mixed Arabic and Latin text reading correctly, no left-only padding or margins.
- Longer translations still fit; dates, numbers and currency formatted for the language.

**Content that shouldn't ship**
- `lorem ipsum`, `undefined`, `null`, `NaN`, `[object Object]`, `TODO`, raw translation keys, duplicate or obviously fake placeholder names repeated across rows, broken links (`#` that does nothing where a destination is expected), dead buttons.

**Load and motion glitches**
- Flash of unstyled or unthemed content, content that jumps as fonts or images load, animations that never settle or loop without purpose, transitions that stutter or cut, scroll that jerks, double scrollbars.

**Component feel (interaction polish)**
Distilled from Emil Kowalski's design-engineering guidance (see `NOTICE.md`). Check in the rendered app and in the CSS; report as minor unless noted.
- **Pressable elements react on press:** buttons and other pressable controls have a pressed state (a subtle `scale(0.95–0.98)` on `:active` with a short transition, or an equivalent). A control with no pressed feedback feels dead.
- **Nothing enters from `scale(0)`:** entrances start from about `scale(0.9–0.95)` combined with opacity, not from nothing.
- **Popovers, menus and tooltips grow from their trigger** (`transform-origin` at the trigger side), not from the centre. Modals are the exception and stay centred.
- **Hover effects only where hover exists:** hover styling and hover-only reveals are gated behind `@media (hover: hover) and (pointer: fine)`; nothing important is reachable only by hover.
- **Tooltips:** delay before the first one; the next tooltip next to it opens at once without the entrance animation.
- **Only `transform` and `opacity` move** in animations; layout properties (`width`, `height`, `top`, `left`, `margin`) are not animated, and `transition: all` is not used. Rapidly triggered UI uses transitions (which retarget) rather than keyframes (which restart).
- **Exits are faster than enters** for system responses (about 200ms out against 300ms or more in); deliberate, user-driven actions may be slower on press and quick on release.
- **Staggered lists** use a short stagger (about 30–80ms per item), not everything at once and not a slow cascade.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, movement and position animation is removed or replaced by a fade; opacity and colour changes that aid understanding stay. Large movement that ignores the setting is **major**.

**Reflow and zoom**
- At **200% browser zoom** (or a 400% equivalent at 320px width) content reflows without horizontal scrolling or loss of function, and nothing overlaps; fixed heights and `px` font sizes that clip enlarged text are findings (major).
- No keyboard trap: Tab can leave every component, and Escape closes dialogs and menus. A trap is **critical**.

## Severity

- **Critical:** content unreadable, hidden or unreachable; a control that can't be used because it is covered or off-screen; blank or broken primary screen.
- **Major:** horizontal scroll on mobile, overlapping text or controls, clipped content, broken images, layout broken at a chosen viewport, off-system look in a key place, placeholder or error strings visible.
- **Minor:** small misalignments and spacing inconsistencies, one-off size or colour drift, polish.

A deliberate, consistent convention that differs from the reference (or the design system's own value) is not a defect.

## Measurement script

Run on each frame at each width. It only reads the page.

```js
(() => {
  const out = { width: innerWidth, height: innerHeight, issues: [] };
  const add = (type, el, note) => {
    const r = el.getBoundingClientRect();
    out.issues.push({ type, node: (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 80), text: (el.innerText || el.alt || '').trim().slice(0, 40), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], note });
  };
  const vis = el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0 && r.width > 0 && r.height > 0; };
  const all = [...document.body.querySelectorAll('*')].filter(el => !el.closest('[data-da-ui]') && vis(el));

  if (document.documentElement.scrollWidth > innerWidth + 1) out.issues.push({ type: 'page-horizontal-scroll', note: 'scrollWidth ' + document.documentElement.scrollWidth + ' > ' + innerWidth });

  all.forEach(el => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if ((r.right > innerWidth + 1 || r.left < -1) && s.position !== 'fixed' && !el.closest('[class*="carousel"],[class*="slider"],[class*="scroll"],[style*="overflow"]')) add('outside-viewport', el, 'extends beyond the viewport width');
    if (el.scrollWidth > el.clientWidth + 1 && /hidden|clip/.test(s.overflowX) && el.innerText && el.innerText.trim()) add('clipped-text', el, 'content wider than its box, overflow hidden');
    if (el.scrollHeight > el.clientHeight + 2 && /hidden|clip/.test(s.overflowY) && el.innerText && el.children.length === 0) add('clipped-text-height', el, 'text taller than its box');
    if (el.tagName === 'IMG') {
      if (!el.complete || el.naturalWidth === 0) add('broken-image', el, 'image failed to load');
      else {
        const ar = el.naturalWidth / el.naturalHeight, rr = r.width / r.height;
        if (s.objectFit === 'fill' && Math.abs(ar - rr) / ar > 0.05) add('distorted-image', el, 'aspect ratio changed');
        if (r.width > el.naturalWidth * 1.5) add('blurry-image', el, 'rendered ' + Math.round(r.width) + 'px, natural ' + el.naturalWidth + 'px');
      }
      if (!el.hasAttribute('alt')) add('missing-alt', el, 'no alt attribute');
    }
    const fs = parseFloat(s.fontSize);
    if (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && fs < 12) add('tiny-text', el, fs + 'px');
    if (/^(a|button|input|select|textarea)$/i.test(el.tagName) || el.getAttribute('role') === 'button') {
      const min = innerWidth < 768 ? 44 : 24;
      if (r.width < min || r.height < min) add('small-target', el, Math.round(r.width) + 'x' + Math.round(r.height) + ' (min ' + min + ')');
    }
  });

  const text = document.body.innerText;
  const bad = text.match(/lorem ipsum|\bundefined\b|\bNaN\b|\[object Object\]|\bTODO\b|\{\{.*?\}\}/i);
  if (bad) out.issues.push({ type: 'placeholder-text', note: bad[0] });

  const fixed = all.filter(el => getComputedStyle(el).position === 'fixed' || getComputedStyle(el).position === 'sticky');
  const targets = all.filter(el => /^(a|button|input|select|textarea)$/i.test(el.tagName));
  fixed.forEach(f => {
    const fr = f.getBoundingClientRect();
    targets.forEach(t => {
      if (f.contains(t) || t.contains(f)) return;
      const tr = t.getBoundingClientRect();
      const ix = Math.max(0, Math.min(fr.right, tr.right) - Math.max(fr.left, tr.left)), iy = Math.max(0, Math.min(fr.bottom, tr.bottom) - Math.max(fr.top, tr.top));
      if (ix * iy > 0.3 * tr.width * tr.height) add('control-covered', t, 'covered by a fixed or sticky element');
    });
  });

  const fonts = new Set(all.slice(0, 400).map(el => getComputedStyle(el).fontFamily.split(',')[0].trim()));
  out.fontFamilies = [...fonts];
  out.counts = out.issues.reduce((a, i) => (a[i.type] = (a[i.type] || 0) + 1, a), {});
  out.issues = out.issues.slice(0, 40);
  return out;
})()
```

Read `fontFamilies` too: more than two or three families, or a generic fallback (`sans-serif`, `serif`) as the first family, is a finding.
