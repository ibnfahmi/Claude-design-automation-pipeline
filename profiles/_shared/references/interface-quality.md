# Interface quality checklist

Used by the Design Agent (while building) and the Auditor (while testing). Cite the WCAG 2.2 criterion for accessibility findings. Anything that is a convention and not a criterion is a recommendation, never critical.

Distilled from Jakub Krehel's `better-accessibility`, `better-layout` and `better-typography` skills (MIT). See `NOTICE.md`.

## Accessibility (WCAG 2.2 A/AA)

| Check | Threshold |
|---|---|
| Text contrast (1.4.3) | 4.5:1; large text (24px, or 18.67px bold) 3:1 |
| UI component boundaries, states, meaningful graphics (1.4.11) | 3:1 |
| Target size (2.5.8) | 24x24px minimum. Aim for 44x44 on touch and 40x40 on desktop where density allows. The visible element may be smaller than its hit area. |
| Focus visible (2.4.7) and not obscured (2.4.11) | Every interactive element has a visible focus state. A sticky header must not hide the focused element. |
| Colour alone (1.4.1) | Status needs a second cue: icon, text or underline |
| Drag (2.5.7) | Every drag has a single-pointer alternative (buttons or a menu) |
| Reflow and resize (1.4.10, 1.4.4) | Layout holds at 320px width and 200% text size with no horizontal scroll |
| Moving content (2.2.2) | Anything moving over 5 seconds has a pause control; toasts with an action or error stay until dismissed |

Also check:
- Every input has a visible label. A placeholder is not a label.
- Errors are inline, specific, and tied to the field. Validate on submit; don't disable submit until the form is valid.
- Icon-only buttons have an accessible name. Visible label text appears in the accessible name.
- Native elements first: buttons for actions, links for navigation.
- Motion has a reduced-motion alternative (crossfade instead of slide or scale).

## Layout

- **Group with space, not lines.** The gap between groups is at least 2x the gap within one (8px inside, 16px or more between).
- **Controls look like controls.** A background shape, border, underline or a consistent zone (toolbar). Never style a control like the static text beside it.
- **One primary action per view.** Move secondary actions into a menu past three.
- **Hint at hidden content.** Off-screen or collapsed content has a visible cue (the next item peeking 16-32px, or a disclosure control). Truncated values have a way to the full text.
- **Content bleeds, controls float.** Backgrounds and media run to the edge. Controls and text stay inside the margins and safe areas.
- **Order by importance.** Important content sits near the top and the leading edge; actions trail.
- **Plan for growth.** Translated strings grow, and short ones grow most. A one-word button label is the riskiest element on the screen. Size text boxes with min-height and max-width, not fixed height.
- **Mirror cleanly.** If RTL is in scope, leading and trailing swap; check icons with direction (arrows, back).
- **Breakpoints come from content.** Keep the expanded layout until it breaks, then collapse.

## Typography

| Role | Size | Line height | Weight |
|---|---|---|---|
| Display | 36px | 1.1 | 600 |
| Title | 24px | 1.2 | 600 |
| Heading | 18px | 1.3 | 600 |
| Body | 16px | 1.5 | 400 |
| Caption | 13px | 1.4 | 400 |

These are a starting point when there is no design system; a design system's own scale wins.
- Wrapping text gets body line height (1.4 or more). Heading leading on a paragraph is a defect.
- Emphasis is one weight step up, not a size change.
- Inputs are at least 16px on mobile layouts (smaller makes iOS zoom the page).
- Avoid orphaned single words on the last line of headings and short paragraphs.
- Body text is at least 14px (16px preferred).

## Severity

- **Critical:** blocks a task, hides content from assistive technology, clips an action at a supported viewport, or fails WCAG AA on primary content.
- **Major:** makes an interaction meaningfully harder, or weakens hierarchy or reading order.
- **Minor:** isolated alignment, spacing or copy polish.
