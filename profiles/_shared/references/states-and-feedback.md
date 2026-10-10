# Errors, loading and feedback states

Used by the Brief Agent's state lists, the Design Agent (what to draw) and the Auditor (what to test). Distilled from the `error-handling-ux`, `loading-states` and `feedback-patterns` skills in Owl-Listener's `designer-skills` (MIT). See `NOTICE.md`.

## Errors

Design the error path as carefully as the happy path.

1. **Prevent:** smart defaults, constrained inputs (date pickers, dropdowns), confirmation for destructive actions, auto-save, undo instead of "Are you sure?".
2. **Say it well:** what happened, why (if it helps), and what to do next, in plain language and never an error code. Never blame the user. "Something went wrong" is not specific enough.
3. **Place it near the source:** per-field inline for forms; a full-page error with retry and back for pages; a banner or toast with retry for network failures; a helpful empty state with suggestions for no results; for permissions, say what access is needed and how to get it.
4. **Recover:** keep the user's input, offer retry for transient failures, offer an alternative path, and say when the system will retry on its own.
5. **Persistence:** error messages stay until resolved or dismissed.

## Loading

| Wait | Design |
|---|---|
| Under 100ms | No indicator |
| 100ms to 1s | A subtle indicator (skeleton or opacity change) |
| 1 to 10s | A clear loading state, with progress if measurable |
| Over 10s | Detailed progress, a time estimate, and a way to continue in the background |

- Show something immediately; never a blank screen.
- **Skeletons match the real layout's shapes**; use them for known structure. Use a small spinner only for short, unknown waits, and a progress bar when progress is measurable.
- One loading indicator per area, not several competing ones. No layout shift when content arrives. Provide cancel or back on long loads.
- **Optimistic UI** (show the expected result, reconcile, roll back on failure) needs a designed failure state.
- A shimmer needs a reduced-motion fallback.
- Fade content in; don't pop it. Stagger only infrequent first-load entrances (see `polish.md`); don't stagger routine list refreshes.

## Feedback

Acknowledge every action, at the lowest level that fits: inline next to the action first, then within the component, then page-level (banner or toast), then system-level.

- Match the intensity to the importance of the action. Don't interrupt flow for minor confirmations.
- Offer **undo** for reversible actions instead of a confirmation dialog.
- **Toasts:** a plain success confirmation can dismiss itself after about 3-5 seconds. A toast that carries an action or an error stays until dismissed (WCAG 2.2.1).
- Status badges (pending, active, complete) persist while relevant. Badge counts for unread items.
- Feedback is never colour alone, and the timing should feel right: immediate for presses, brief for confirmations.
