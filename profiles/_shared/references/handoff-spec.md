# Handoff notes for developers

Used by the Handoff Agent. Distilled from the `handoff-spec` skill in Owl-Listener's `designer-skills` and the motion values in Jakub Krehel's `better-ui` (both MIT). See `NOTICE.md`.

Annotate **behaviour, not just appearance**, and cover every state, not only the happy path. Use design tokens and variable names, not raw values.

The Figma file is laid out as a **Specs & Guidelines page** plus **one page per feature**, with a label card above every screen and rows of screens per screen size (see `handoff-agent.md`). The specs page carries the file-wide rules; the feature pages carry the screens.

For each screen and component, the Figma file should let a developer find:

- **Visual:** spacing and sizing (tokens or exact values), colour tokens, type style (name, size, weight, line height), radius, shadow, opacity, and behaviour at each breakpoint or viewport.
- **Interaction:** every state (default, hover, focus, pressed, disabled, loading, error, empty), tab and keyboard order, shortcuts, and gesture behaviour (swipe, drag, pinch) with its tap alternative.
- **Motion notes** (a static design can't play them, so write them as annotations next to the trigger): the duration, easing and property for each transition, using the values in `polish.md` unless the design system specifies others. Include the reduced-motion alternative, and say which element must keep a static cue.
- **Content:** character limits and truncation, dynamic content rules (min and max), localisation notes (text expansion, RTL, locale formats), and the copy for empty, loading and error states.
- **Assets:** icons as SVG using the current colour (named consistently), images with resolution, format and responsive variants, fonts with source.
- **Edge cases:** minimum and maximum content, behaviour at each breakpoint, device-specific considerations, and accessibility requirements (names, roles, keyboard, screen-reader announcements).
- **Implementation notes:** reusable components, data assumptions, API dependencies, performance considerations.
- **Traceability:** the requirement IDs and journey steps each frame covers.
