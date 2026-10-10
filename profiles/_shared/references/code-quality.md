# Code quality bar

The Design Agent builds to this, and the Auditor checks the source and the running app against it. Distilled from Emil Kowalski's `mobile-native` skill and Jakub Krehel's `better-accessibility`, `better-layout`, `better-typography` and `better-ui` skills (all MIT). See `NOTICE.md`. A design system's or reference's own conventions win where they differ, and a deliberate, consistent project convention is a preference, not a finding.

## Semantics and accessibility

- Native elements first: `<button>` for actions, `<a href>` for navigation, `<input>` with a `<label>`. Never `<div onClick>`. A real link supports Cmd/Ctrl and middle click.
- Visible focus with `:focus-visible` (never bare `outline: none` without a replacement). A sticky header must not hide the focused element (`scroll-padding-top` equal to its height).
- Every input has a label; errors are inline, tied with `aria-describedby`, and the first invalid field is focused on submit. Don't disable submit until the form is valid.
- Icon-only buttons have an `aria-label`. Decorative icons are `aria-hidden`. Images have meaningful `alt` (or `alt=""` if decorative).
- Dialogs use `<dialog>` with `showModal()` (or `inert` on the background plus `role="dialog"` and `aria-modal`), move focus inside on open and return it on close. Escape closes overlays.
- Tab order follows the visual order. Composite widgets (tabs, menus) use roving `tabindex` with arrow keys. Never positive `tabindex`.
- Status updates use `role="status"` (polite) and urgent errors `role="alert"`, rendered as empty regions first.
- Don't convey meaning by colour alone. Respect `prefers-reduced-motion`. Don't set `maximum-scale=1` or `user-scalable=no`.

## Layout and responsiveness

- Logical properties for anything that mirrors (`margin-inline-start`, `padding-inline-end`, `text-align: start`). Keep RTL in mind when RTL is in scope.
- `min-height` and `max-width` for text containers, never a fixed height or width on text. Let rows wrap.
- `100dvh` for an app shell, `100svh` for a hero, never `100vh` for bottom-pinned UI. `width: 100%`, not `100vw`.
- Grid and flex children holding long text: `minmax(0, 1fr)` and `min-width: 0`.
- Breakpoints come from the content and the platform's chosen viewports. Hold the layout until it breaks, then collapse.
- Fixed bars pad for safe areas with `env(safe-area-inset-*)`, and the viewport meta includes `viewport-fit=cover` so the values aren't zero.
- Hint at hidden content (a peeking next item, a disclosure control). Truncated text has a way to the full value.

## Touch and pointer

- Hover styles only inside `@media (hover: hover) and (pointer: fine)`. Touch has no hover, so every pressed state also works through `:active`.
- Targets at least 24x24 (WCAG 2.5.8), 44x44 on touch layouts, with no overlapping hit areas. Extend a small visible icon's hit area with a pseudo-element on its wrapper.
- `-webkit-tap-highlight-color: transparent`, and `touch-action: manipulation` on buttons and links.
- Inputs at least 16px so iOS doesn't zoom. Use the right `type`, `inputmode`, `autocomplete` and `enterkeyhint`.
- `overscroll-behavior: contain` on scrollable dialogs, drawers and sheets; `none` on the root of an app-like layout.
- `user-select: none` on controls only (never on `body`). `touch-action: pan-y` on horizontal carousels, `none` only on surfaces that handle every gesture.
- `theme-color` per colour scheme, and `color-scheme` meta.
- Every drag has a single-pointer alternative.

## Type and surfaces

- A type scale from tokens. Body at least 14px (16px preferred), wrapping text at line height 1.4 or more, headings balanced (`text-wrap: balance`) and body wrapped to avoid orphans (`text-wrap: pretty`).
- Concentric radii: outer radius = inner radius + padding (+ border width), for evenly padded nested surfaces.
- Shadows for elevation, borders for structure; keep `border: 1px solid transparent` under a shadow ring so forced-colors mode still draws an edge. Content images get a 1px inset outline in pure black or white at 10%.
- Icons use `currentColor`, one library per surface, stroke matched to the text weight; outline as default and fill for the active state.

## Motion

- Transitions (not keyframes) for interactive state, so they can reverse mid-flight. Name the properties (`transition-property: opacity, translate`), never `all`.
- Press scale 0.96 over 150ms ease-out, not on disabled controls. High-frequency interactions (typing, row hover, tab switches) get no animation, or 150ms or less on opacity or background.
- Gate movement, scale and blur behind `prefers-reduced-motion: no-preference`; under reduced motion use an opacity cross-fade.
- Stagger only infrequent entrances (100ms apart, 12px up, 4px blur, 300ms). Exits are shorter and smaller than enters. Every animated change leaves a static cue.
- `will-change` only after you see stutter, naming the property. Suppress transitions during a theme switch. Never listen to `scroll` for reveals: use `IntersectionObserver`.

## Source checks the Auditor runs

| Look for in the source | Problem |
|---|---|
| `onClick` on a `div` or `span` | Use a button or link |
| `outline: none` / `outline-none` with no `focus-visible` style | No visible focus |
| `:hover` outside a `hover: hover` query | Sticky hover on touch |
| `100vh` on a mobile shell or bottom-pinned UI | Use `dvh` or `svh` |
| `transition: all` / `transition-all` | Name the properties |
| `maximum-scale=1` or `user-scalable=no` | Blocks zoom |
| An `<input>` under 16px on mobile layouts | iOS zoom |
| Raw hex colours or pixel font sizes in components | Use tokens |
| `animation:` on a toggled class | Use a transition |
| Movement or scale animation with no reduced-motion guard | Gate it |
| `width: 100vw`, or a fixed `height` on a text box | Overflow or clipping |
| `tabIndex` above 0 | Breaks tab order |
| `<img>` with no `alt` | Missing alt |

Report findings as in `interface-quality.md`: critical when it blocks a task or fails WCAG on primary content, major when it makes an interaction harder, minor for polish.
