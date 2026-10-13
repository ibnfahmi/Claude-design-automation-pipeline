# Handoff notes for developers

Used by the Handoff Agent. Distilled from the `handoff-spec` skill in Owl-Listener's `designer-skills` and the motion values in Jakub Krehel's `better-ui` (both MIT). See `NOTICE.md`.

Annotate **behaviour, not just appearance**, and cover every state, not only the happy path. Use design tokens and variable names, not raw values.

The file is named `<Project> — v<version>` and its pages, dividers, archive and re-export rules are in `figma-structure.md`. The Figma file is laid out as a **Cover** page with the applied thumbnail, a **Specs & Guidelines page**, a **Product Flows page** (every flow with all its cases and states) and **one page per feature**, with a label card above every screen and a notes card under it, the flow running horizontally by step, each screen's states below it and the smaller screen sizes in blocks below (see `figma-structure.md`, "Feature page layout", and `handoff-agent.md`). The specs page carries the file-wide rules; the feature pages carry the screens.

Every page has the background #272727 and the file has the standard cover thumbnail (`figma-thumbnail.md`).

Frames are **built from a measured spec** of the settled page and compared with its screenshot (`figma-capture.md`), and show the **final state** of every animation, use real **auto layout**, and follow a **spacing scale and layout grids** (see `figma-capture.md`).

For each screen and component, the Figma file should let a developer find:

- **Visual:** spacing and sizing (tokens or exact values), colour tokens, type style (name, size, weight, line height), radius, shadow, opacity, and behaviour at each breakpoint or viewport.
- **Interaction:** every state (default, hover, focus, pressed, disabled, loading, error, empty), tab and keyboard order, shortcuts, and gesture behaviour (swipe, drag, pinch) with its tap alternative.
- **Motion notes** (a static design can't play them, so write them as annotations next to the trigger): the duration, easing and property for each transition, using the values in `polish.md` unless the design system specifies others. Include the reduced-motion alternative, and say which element must keep a static cue.
- **Content:** character limits and truncation, dynamic content rules (min and max), localisation notes (text expansion, RTL, locale formats), and the copy for empty, loading and error states.
- **Assets:** icons as SVG using the current colour (named consistently), images with resolution, format and responsive variants, fonts with source.
- **Edge cases:** minimum and maximum content, behaviour at each breakpoint, device-specific considerations, and accessibility requirements (names, roles, keyboard, screen-reader announcements).
- **Implementation notes:** reusable components, data assumptions, API dependencies, performance considerations.
- **Traceability:** the requirement IDs and journey steps each frame covers.
