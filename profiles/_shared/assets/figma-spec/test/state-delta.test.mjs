// node test/state-delta.test.mjs
import { stateDelta, planDeltas } from '../state-delta.mjs';

const errors = [];
const check = (name, ok, extra = '') => { if (!ok) errors.push(name); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

const T = (n, x, y, txt) => ({ k: 't', n, r: [x, y, 200, 24], txt });
const header = { k: 'f', n: 'Header', r: [0, 0, 1440, 80], bg: 'rgb(11, 27, 61)', c: [T('Logo', 40, 20, 'Brand'), T('Nav', 600, 20, 'Ideas')] };
const hero = { k: 'f', n: 'Hero', r: [0, 80, 1440, 600], c: [T('Title', 40, 40, 'Hello'), T('Sub', 40, 100, 'World')] };
const footer = { k: 'f', n: 'Footer', r: [0, 5000, 1440, 400], c: [T('Copy', 40, 40, 'Footer text')] };
const stickyHeader = { ...header, L: { pos: 'fixed' } };
const base = { k: 'f', n: 'Page', r: [0, 0, 1440, 6000], bg: 'rgb(255, 255, 255)', L: { d: 'block' }, c: [header, hero, footer] };
// the state frame: scroll-locked, so the page is viewport-sized and the footer is cut off
const cropped = (children) => ({ k: 'f', n: 'Page', r: [0, 0, 1440, 900], bg: 'rgb(255, 255, 255)', L: { d: 'block' }, c: children });
const dim = { k: 'f', n: 'Backdrop', r: [0, 0, 1440, 900], bg: 'rgba(0,0,0,0.5)', L: { pos: 'fixed' } };
const modal = { k: 'f', n: 'Modal', r: [440, 200, 560, 400], bg: 'rgb(255,255,255)', L: { pos: 'fixed' }, c: [T('T', 24, 24, 'Apply')] };

let r = stateDelta(base, cropped([header, hero, dim, modal]));
check('a dialog over the cropped page is reusable, with the page height as the crop', r.reusable && r.add.length === 2 && r.cropHeight === 900, r.reason);
check('overlay positions are in page coordinates', r.add[1].r[0] === 440 && r.add[1].r[1] === 200);

// an overlay nested inside the page content gets its position converted to the page's coordinates
const nested = { ...hero, c: [...hero.c, { k: 'f', n: 'Menu', r: [100, 60, 300, 200], bg: 'rgb(255,255,255)', L: { pos: 'absolute' } }] };
r = stateDelta(base, cropped([header, nested]));
check('a nested overlay is found and moved to page coordinates', r.reusable && r.add.length === 1 && r.add[0].r[0] === 100 && r.add[0].r[1] === 140, JSON.stringify(r.add && r.add[0].r));

r = stateDelta(base, cropped([{ ...header, c: [T('Logo', 40, 20, 'Brand'), T('Nav', 600, 20, 'Ideas'), T('User', 1200, 20, 'Signed in as Sara'), T('Bell', 1100, 20, '3 new'), T('Avatar', 1300, 20, 'SA'), T('Menu', 1350, 20, 'Menu'), T('Brand', 40, 20, 'Brand 2')] }, hero, dim, modal]));
check('a page that really differs behind the overlay is not reusable', !r.reusable && !r.near && /different screen/.test(r.reason), r.reason);

r = stateDelta(base, cropped([{ ...header, c: [T('Logo', 40, 20, 'Brand'), T('Nav', 600, 20, 'Ideas'), T('User', 1200, 20, 'Signed in as Sara'), T('Bell', 1100, 20, '3 new'), T('Avatar', 1300, 20, 'SA')] }, hero, dim, modal]));
check('a page that differs a little behind the overlay is near: export it on a cropped clone', !r.reusable && r.near === true && r.add.length === 2 && !!r.compareBox, r.reason);

r = stateDelta(base, cropped([header, hero]));
check('no overlay nodes means nothing to clone', !r.reusable && /no overlay/.test(r.reason), r.reason);

r = stateDelta(cropped([header, hero]), { ...base, c: [header, hero, dim, modal] });
check('a state taller than the base is not reusable', !r.reusable && /taller/.test(r.reason), r.reason);

// a sticky header that is in both pages is not an overlay to add; the compare box covers only the dialog
const baseSticky = { ...base, c: [stickyHeader, hero, footer] };
r = stateDelta(baseSticky, cropped([stickyHeader, hero, dim, modal]));
check('a fixed header the base already has is not added again', r.reusable && r.add.length === 2 && !r.add.some((a) => a.n === 'Header'), JSON.stringify(r.add && r.add.map((a) => a.n)));
check('the compare box covers the dialog, not the full-viewport scrim', JSON.stringify(r.compareBox) === JSON.stringify([440, 200, 560, 400]), JSON.stringify(r.compareBox));

const frames = [
  { slug: 'home-d', route: '/index.html', viewport: { w: 1440, h: 900 } },
  { slug: 'home-dialog-d', route: '/index.html?signin=1', viewport: { w: 1440, h: 900 } },
  { slug: 'home-m', route: '/index.html', viewport: { w: 390, h: 844 } },
  { slug: 'other-d', route: '/other.html', viewport: { w: 1440, h: 900 } },
];
const specs = { 'home-d': { root: base }, 'home-dialog-d': { root: cropped([header, hero, dim, modal]) } };
const plan = planDeltas(frames, (f) => specs[f.slug] || null);
check('only frames of the same page and width are paired, the base is never a clone', plan.length === 1 && plan[0].slug === 'home-dialog-d' && plan[0].base === 'home-d', JSON.stringify(plan.map((p) => [p.slug, p.base])));

// a page that does not lock its scroll behind a dialog keeps its full height in the state frame: the crop is still the viewport
const unlocked = { ...cropped([header, hero, dim, modal]), r: [0, 0, 1440, 5900] };
r = stateDelta(base, unlocked, 900);
check('a state frame as tall as the page is cropped to the viewport height, not to the page', r.reusable && r.cropHeight === 900, JSON.stringify([r.reusable, r.cropHeight, r.reason]));

if (errors.length) { console.error('\nFAILED:', errors.length); process.exit(1); }
console.log('\nALL OK');
