# Reference capture: everything a website does, not only how it looks

When the user gives a **website URL** as the reference, take **the whole experience**: the style, the interactions, the animations, the transitions between states and pages, the scroll effects, the responsive behaviour and the intro, so the new product can feel like it. The Design System Agent does this in `tokens` mode with the built-in browser; the Design Agent then rebuilds what is found in its own code.

Rules that never change: use only what the public page itself shows (no login, no paywalled areas); describe and re-create, never copy: **no scripts, stylesheets, copy, images, illustrations, 3D models, logos or brand marks are taken from the site**. Behaviour is re-implemented with your own CSS and JavaScript. Say honestly what could not be captured.

How far to go: the page given, plus **up to three internal pages** reached from its main navigation (to see page transitions and a second layout). Ask before capturing more. This capture takes several minutes, so tell the user it is running.

## 1. Baseline

Wait for the real page, not the loader (see `design-system-agent.md`). Screenshot the first screen at about 1440 and 390 wide, and record the **intro or loader sequence** if there is one: what shows, for how long, how it hands over to the page (a wipe, a fade, a split, a scale), with timings from screenshots at 0, 0.5, 1, 2 seconds and then at the end.

## 2. Inventory (run once per page)

Run this with `javascript_tool`. It only reads the page.

```js
(() => {
  const out = { libs: [], keyframes: [], transitions: {}, animations: [], scroll: {}, stuck: [] };
  const names = ['gsap', 'ScrollTrigger', 'Lenis', 'LocomotiveScroll', 'THREE', 'lottie', 'Swiper', 'AOS', 'anime', 'barba', 'Webflow', 'Splide', 'Flickity'];
  names.forEach(n => { if (window[n]) out.libs.push(n); });
  const has = s => document.querySelector(s);
  if (has('[data-framer-name],[data-framer-component-type]')) out.libs.push('Framer');
  if (has('.lenis,.lenis-smooth') || document.documentElement.classList.contains('lenis')) out.libs.push('Lenis smooth scroll');
  if (has('[data-scroll],[data-scroll-container]')) out.libs.push('Locomotive-style data-scroll');
  if (has('.swiper,.splide,.flickity-enabled')) out.libs.push('carousel library');
  if (has('canvas')) out.libs.push('canvas x' + document.querySelectorAll('canvas').length);
  if (has('video')) out.libs.push('video x' + document.querySelectorAll('video').length);
  out.libs = [...new Set(out.libs)];
  for (const ss of document.styleSheets) {
    try { for (const r of ss.cssRules) if (r.type === CSSRule.KEYFRAMES_RULE) out.keyframes.push({ name: r.name, css: r.cssText.slice(0, 300) }); } catch (e) {}
  }
  out.keyframes = out.keyframes.slice(0, 40);
  document.querySelectorAll('body *').forEach(el => {
    const s = getComputedStyle(el);
    if (s.transitionDuration && s.transitionDuration !== '0s') {
      const k = [s.transitionProperty, s.transitionDuration, s.transitionTimingFunction].join(' | ');
      out.transitions[k] = (out.transitions[k] || 0) + 1;
    }
    const pos = s.position;
    if ((pos === 'sticky' || pos === 'fixed') && out.stuck.length < 12) {
      const r = el.getBoundingClientRect();
      out.stuck.push({ node: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''), position: pos, top: s.top, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] });
    }
  });
  out.animations = document.getAnimations().slice(0, 40).map(a => {
    const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
    const tg = a.effect && a.effect.target;
    return { name: a.animationName || a.transitionProperty || 'script (WAAPI)', target: tg ? tg.tagName.toLowerCase() + (typeof tg.className === 'string' && tg.className ? '.' + tg.className.trim().split(/\s+/)[0] : '') : '', duration: t.duration, delay: t.delay, easing: t.easing, iterations: t.iterations, state: a.playState };
  });
  const de = document.documentElement, cs = getComputedStyle(de);
  out.scroll = { height: de.scrollHeight, viewport: innerHeight, snap: cs.scrollSnapType, behavior: cs.scrollBehavior, scrollTimeline: CSS.supports('animation-timeline: scroll()'), viewTransition: !!(window.CSSViewTransitionRule || document.startViewTransition) };
  out.transitions = Object.entries(out.transitions).sort((a, b) => b[1] - a[1]).slice(0, 20);
  return out;
})()
```

Read the resource and script names too (`performance.getEntriesByType('resource')`) for engines and libraries. A library on the list means the effect exists; the next steps find out what it does.

## 3. Hover, focus and pressed states

For each element family (primary button, secondary button, nav link, card, image or tile, input, footer link, icon button, tab, accordion header): read its resting style, then **hover it** (`computer` hover), read it again, then focus it with the keyboard and press it. Use a helper to diff:

```js
(sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { color: s.color, background: s.backgroundColor, border: s.borderColor + ' ' + s.borderWidth, shadow: s.boxShadow, transform: s.transform, opacity: s.opacity, filter: s.filter, outline: s.outlineStyle + ' ' + s.outlineColor, decoration: s.textDecorationLine, transition: s.transitionProperty + ' ' + s.transitionDuration + ' ' + s.transitionTimingFunction }; }
```

Record each change (what property, from, to) and the transition timing. Note extra effects the style can't show: a cursor that changes or follows, magnetic buttons, ripples, image zoom, a sliding underline, an arrow that slides in.

## 4. Interactions

Click through every kind of control once and record the trigger, the result, the motion and the way back: primary and secondary buttons, menus and mega-menus, dropdowns, modals and drawers (open, close, Escape, backdrop), tabs, accordions, carousels and sliders (arrows, dots, drag, autoplay), toggles, forms (focus, validation messages, success state), cookie banners, search, filters, copy buttons, tooltips. Walk the main flow for up to six steps as `design-system-agent.md` describes. Take screenshots at 0, 250, 500 and 1000 ms after a trigger for any transition you want to describe precisely.

## 5. Scroll effects

Scroll the whole page from top to bottom in steps of about 0.75 of the viewport height (`scrollTo`, wait about 700 ms for each), and **at each step take a screenshot and run the sampler**. Compare consecutive samples to see what changes with scroll.

```js
(() => { const els = [...document.querySelectorAll('header,nav,section,main > *,h1,h2,h3,img,video,canvas,[class*="reveal"],[class*="parallax"],[class*="sticky"],[data-scroll],[data-aos]')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > -200 && r.top < innerHeight + 200; }).slice(0, 60); return { y: Math.round(scrollY), items: els.map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { n: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : ''), top: Math.round(r.top), op: s.opacity, tf: s.transform === 'none' ? '' : s.transform, pos: s.position, vis: s.visibility, clip: s.clipPath === 'none' ? '' : s.clipPath, filter: s.filter === 'none' ? '' : s.filter }; }) }; })()
```

Classify what you see:
- **Reveal on scroll:** an element's opacity, transform or clip changes as it enters; note the direction, distance, duration, easing, the **stagger** between siblings, whether it plays once or each time, and the trigger point (how far into the viewport).
- **Parallax:** layers whose `top` moves at different rates from the scroll; note the ratio.
- **Pinned or sticky sections:** an element stays while content changes or moves inside it; note how long it is pinned and what it does meanwhile (a scrubbed timeline: progress tied to scroll position).
- **Horizontal scroll sections:** vertical scroll turned into horizontal movement.
- **Header behaviour:** hides on scroll down and shows on scroll up, shrinks, changes background, blur or colour after the hero.
- **Progress indicators, counters, text effects:** a reading progress bar, numbers counting up, text split into lines or letters that animate.
- **Marquees and loops:** infinite horizontal tickers; speed and direction.
- **Scroll snap, smooth scrolling (Lenis or similar), scroll hijacking:** whether the scroll feels inertial, snaps to sections, or is taken over.
- **Video, canvas or 3D tied to scroll:** frames or camera moves that scrub with scroll.
- **Reverse scroll:** whether effects reverse when scrolling back up.

## 6. Page and state transitions

Click two or three internal links. Note whether the page reloads or the app swaps content, and what covers the change: a wipe, a fade, a curtain, a shared element that morphs, a loader. Record the exit and enter timings, the easing, and what stays put (the header, a persistent canvas). Do the same for any in-page state change that animates (a filter reordering a grid, a tab content swap).

## 7. Responsive behaviour

Repeat the baseline at **768 and 390 wide**: how the navigation turns into a menu (the open and close animation), what stacks or reorders, which scroll effects and hover effects are turned off, and any separate mobile hero.

## 8. Output

Return a `BEHAVIOUR` block with the tokens and signature (see `design-system-agent.md`). Keep each line to what a builder needs: the trigger, the effect, the numbers, and a classification.

```
BEHAVIOUR
libraries: gsap + ScrollTrigger, Lenis smooth scroll, three (canvas hero)
intro: logo draws 1.6s, then the page splits into two panels that slide away (0.9s cubic-bezier(0.76,0,0.24,1))
smooth_scroll: inertial (Lenis-like), lerp about 0.1; no snap
header: fixed; hides on scroll down, shows on scroll up (0.4s); gains a blurred dark background after 80px
motion_tokens: durations 150 / 300 / 600 / 1000 ms; easings out-quart cubic-bezier(0.25,1,0.5,1), in-out cubic-bezier(0.76,0,0.24,1)
hover:
  - primary button: background fills left to right in 0.35s, arrow slides 6px, text colour flips
  - nav link: underline grows from the left (0.25s)
  - card: lifts 6px, shadow deepens, image scales 1.06 (0.5s)
scroll_effects:
  - hero: heading letters rise and fade in on load, staggered 40 ms
  - section 2 (features): cards fade up 40px, stagger 100 ms, once, trigger at 80% of the viewport
  - section 3 (story): pinned for 3 viewport heights; background changes colour and the image swaps at 1/3 and 2/3 of the scroll
  - section 4 (logos): marquee, 40s linear loop, pauses on hover
  - parallax: the background image moves at 0.6x
interactions:
  - menu button: full-screen overlay slides down (0.7s), links stagger in
  - FAQ: accordion height animates 0.3s, plus icon rotates 45 degrees
page_transitions: internal links wipe a black curtain up (0.6s), new page fades in; the header stays put
responsive: below 768 the menu becomes the overlay, parallax and pinning are off, cards stack
reproducibility: reveal, hover, header, marquee, accordion, menu = reproducible (CSS and IntersectionObserver) | pinned story section = approximate (own scroll timeline) | smooth scroll = approximate | hero canvas = approximate (own 3D) | page curtain = reproducible
NOT_CAPTURED: logged-in areas, sound, anything behind a form submit
```
