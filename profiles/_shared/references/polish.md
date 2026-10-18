# Visual polish values

Used by the Design Agent (apply while building), the Auditor (a final polish pass) and the Handoff Agent (motion notes). Distilled from Jakub Krehel's `better-ui` skill (MIT). See `NOTICE.md`.

**Priority.** Polish applies once the interaction is sound, and never outranks a broken interaction or an accessibility failure. A design system's or reference's own look wins: a deliberate, consistent convention (for example a style with no shadows) is a preference, not a finding. The same detail done two different ways within one design is a finding. The Auditor reports polish findings as **minor**, except a state change carried by motion alone with no static cue (colour, icon or label), which is **major**. The values below are exact starting points; the optical nudges are judged by eye.

## Surfaces

- **Concentric radius:** outer radius = inner radius + padding + border width. A card with 8px padding around a 12px-radius child gets a 20px radius. Same radius on both looks wrong. Past about 24px of padding, or with deliberately uneven padding, treat the layers as separate surfaces.
- **Optical alignment:** a button with text and an icon takes about 2px less padding on the icon side. A play triangle shifts about 2px toward its point. Fix asymmetric glyphs (stars, arrows, carets) in the artwork.
- **Shadows for elevation, borders for structure.** A border used only to create depth is replaced by layered soft shadows (a 1px ring at about 6% black, a small lift, an ambient layer). Keep real borders on dividers, table cells, selected states and form inputs (inputs need a 3:1 boundary).
- **Dark mode:** depth shadows vanish, so use one 1px ring at about 8% white, and lighter surfaces for elevation.
- **Image outlines:** content images get a 1px outline inset by 1px, in pure black at 10% (light) or pure white at 10% (dark). Never a tinted grey or the accent colour. Skip logos and transparent artwork.

## Icons

- Stroke tracks the text beside it: about 1.5px next to regular text, 2px next to medium or semibold, 2.5px next to bold. One icon set per surface.
- Size inline icons at 1em to 1.25em of the adjacent text. Check every icon at the smallest size it renders (often 16px).
- **Outline is the default state, fill marks active** (selected tab, saved bookmark, liked heart). Implement both states.
- Mirror an icon in RTL only if its meaning follows reading direction (back arrows, chevrons, list and indent glyphs). Logos, checkmarks, clocks and play controls stay.

## Motion (implement it in code; a Figma export carries it as motion notes)

| Case | Value |
|---|---|
| Press on a button | scale to 0.96 over 150ms ease-out. Disabled controls never scale. |
| High-frequency actions (typing, row hover, tab switch) | Minimal transition: 150ms or less on opacity or background only |
| Staged entrance (infrequent, such as a first load) | Split into chunks (title, description, actions); stagger 100ms; each fades in with 12px upward move and 4px blur over 300ms ease-out |
| Exit | Shorter and smaller than the enter: fade with a 12px move over 150ms. Slide fully out only when the destination carries meaning (a drawer closing). |
| Icon swap on an infrequent state change (play/pause, copy/copied) | Cross-fade: scale 0.25 to 1, blur 4px to 0, about 300ms, no bounce. Tab and navigation icons swap instantly. |
| Interactive state changes | Interruptible transitions that can reverse mid-flight, not fixed keyframes |
| Reduced motion | Replace movement, scale and blur with an opacity cross-fade; never remove the element abruptly |

Every animated change also leaves a **static cue** (colour, icon or label). Motion is never the only feedback.

## Motion baseline (always on)

Every output has motion, whatever the reference shows: the code project, the style preview, the share build and the review page's app.
- **Transitions on every interactive element:** hover (real-hover devices only), focus, pressed and disabled for buttons, links, cards, inputs, tabs, toggles and list rows.
- **Enter and exit motion** for menus, dropdowns, modals, drawers, sheets, toasts and accordions; interruptible, exits shorter than enters.
- **Route and page transitions** (cross-document View Transitions where supported, a plain load otherwise); in mobile, tablet, TV and kiosk profiles, screen-to-screen transitions in the platform's own style.
- **Content entrance:** sections and lists reveal on load or on scroll with `IntersectionObserver`; infrequent entrances staggered 100ms.
- **Feedback micro-interactions:** toggles, checkboxes, success and error, loading and skeleton-to-content, number and progress changes.
- **Each trigger animates its result** (navigation, forms, menus, tabs, dialogs), on top of the working interactions the Design Agent already builds.
- **Plain CSS and JavaScript** using the motion tokens (`--duration-*`, `--ease-*`). No animation library by default; vendor one only if the reference already uses one or the user asks.
- **Every effect has a reduced-motion version** (opacity cross-fade) and a static cue; keyboard use and 200% zoom keep working.
- **The reference wins on character.** Use its tempo, easing and effects where it shows them; the baseline fills only what the reference doesn't show, and never changes colours, fonts, icons or layout.
