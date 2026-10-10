# Visual critique and design QA

Used by the Auditor for every platform. Distilled from the `visual-critique` and `design-ops` skills in Owl-Listener's `designer-skills` (MIT). See `NOTICE.md`.

## Hierarchy (check on every screen)

For each of the four, write observation, problem, fix, and rate pass / minor / major.

- **Entry point:** the first element the eye lands on should be the most important one for this screen's goal. One dominant element, or attention scatters.
- **Eye flow:** a deliberate path (F-pattern, Z-pattern, or a clear reading order) that ends at the primary action. No dead ends or loops.
- **Weight:** a size difference of at least 1.5x between hierarchy levels. Bold is used sparingly so it keeps its signal. Fills, strokes and icons support the hierarchy, not fight it.
- **Emphasis:** exactly one primary emphasis zone per view. Colour, contrast or motion used everywhere cancels itself out.

Common failures: several competing primaries, flattened hierarchy (levels look the same), decorative elements outweighing functional ones, a CTA quieter than the content around it.

## Design QA checklist (use as the final pass)

- **Visual:** colours and type come from tokens; spacing, radii, shadows and opacity are consistent; icons are the right size and colour; images keep their aspect ratio.
- **Layout:** grid alignment; behaviour at each chosen breakpoint or viewport; content reflows; no overflow or clipping; minimum and maximum widths.
- **Interaction:** default, hover, focus, active and disabled all designed; targets large enough; keyboard order; visible focus.
- **Content:** realistic content fits; truncation behaves; empty, error and loading states exist.
- **Accessibility:** contrast; names and labels; reduced-motion alternative.
- **Cross-platform:** required devices, densities and text sizes.
