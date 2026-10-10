# Dark mode

Used by every profile that offers a dark theme. Distilled from the `dark-mode-design` skill in Owl-Listener's `designer-skills` and the surface rules in Jakub Krehel's `better-ui` (both MIT). See `NOTICE.md`. The values are working defaults; a design system's own dark tokens win.

Dark mode is a redesign of the surfaces, not an inversion.

- **Elevation through lighter surfaces, not shadows.** Background darkest (for example `#121212`), then a slightly lighter surface for cards, lighter again for modals and dropdowns, lightest for tooltips and menus. Where a card needs an edge, use one thin ring at low-opacity white.
- **Desaturate bright colours** by roughly 10-20% so they don't vibrate on dark. Re-check error and warning colours for contrast.
- **Text:** off-white (for example `#E0E0E0`), not pure white. Borders are subtle, low-opacity white.
- **Contrast:** body text still reaches 4.5:1; UI boundaries 3:1. Measure again in dark, don't assume.
- **Images and media:** dim bright images slightly, avoid large bright areas, and provide light-on-dark logos and dark-variant illustrations where needed. Image outlines switch to pure white at 10%.
- **Semantic tokens** (text-primary, surface-raised) make the two themes switch cleanly.
- **Show it:** design every key screen and state in dark, not only a hero. Provide a manual toggle alongside following the system setting.
