# Platform profiles

A profile describes one kind of product (mobile app, dashboard, landing page, kiosk and so on). It is a set of **rules that apply automatically** once the platform is chosen: required screens and states, design guidance, audit checks and reference files. It also declares the **settings** for that platform. During preflight the user clicks which platforms are in scope and the screen sizes; every other setting (sections, CTA, pages, chart types, languages, hardware, dark mode and so on) is read from the brief or BRD by the Brief Agent and confirmed in the spec. The result is saved as `scope` in `design-pipeline-state.json` and drives the whole run:

| Consumer | Uses |
|---|---|
| Orchestrator | `options` with `ask: "preflight"` (the screen-size questions) and `preview_screen` (what the style preview shows) |
| Brief Agent | `options` with `ask: "brief"` (content-level settings it reads from the source), plus `required_screens` and `required_states` (added to the spec, marked `source: profile`) |
| Journey Agent | the scope, to write user flows for every platform and the journeys that cross platforms |
| Design Agent | chosen viewports (artboard sizes), `design_guidance`, and the files in `auditor.references` plus `grounding.md`, read before building |
| Design System Agent | `grounding.md`, for measuring tokens from a reference |
| Handoff Agent | `handoff-spec.md` and `polish.md`, for annotations and motion notes |
| Auditor | `auditor.checks` and `auditor.references` (including `polish.md`, which it applies as a minor-only polish pass) |
| Coverage Agent | the chosen viewports, so "Missing" can say "checkout is not designed at 375" |

## Adding a platform

Add `profiles/<id>/profile.json` and list the `id` in `profiles/index.json`. No other file needs to change.

## `profile.json` format

```json
{
  "id": "mobile-app",
  "label": "Mobile app (iOS / Android)",
  "summary": "One line shown next to the label in the scope question.",
  "options": [
    {
      "id": "device_frames",
      "question": "Which device frames should be designed?",
      "type": "single | multi | text",
      "choices": [{"value": "iphone-16", "label": "iPhone 16 (393x852)", "size": [393, 852]}],
      "default": "iphone-16",
      "viewport": true
    }
  ],
  "preview_screen": "What the style preview should show for this platform.",
  "derive_when_silent": "Optional. How the Brief Agent drafts this platform's requirements from the product when the brief doesn't describe it.",
  "required_screens": ["Screens every product of this type needs, added to the spec as source: profile"],
  "required_states": ["States every product of this type needs"],
  "design_guidance": ["Short rules the Design Agent follows"],
  "auditor": {
    "references": ["_shared/references/interface-quality.md"],
    "checks": ["Platform checks the Auditor runs, each a testable statement"]
  }
}
```

- `ask` says how a setting is filled: `"preflight"` is asked as a clickable question (only the screen-size options use this), `"brief"` is read from the brief or BRD (with the `default` used when the source is silent), and `"auto"` has a single choice and is used without asking.
- `type: single` takes one value, `multi` takes a list, `text` takes free text.
- `viewport: true` marks the option whose choices carry a `size` ([width, height] in px). The chosen sizes become the artboard sizes. The **primary viewport** is the first chosen choice in the profile's own choice order, and every interaction state is designed there. Every screen is designed at every chosen size.
- `default` is used when the user picks the recommended sizes (for `preflight` options) or when the brief is silent (for `brief` options). Every option must have one.
- A `preflight` option shows its **first four** choices as clickable options (the question tool allows four), with the rest reachable through Other, so list the four most common first.
- `required_screens` and `required_states` are suggestions the Brief Agent adds to the spec when the brief doesn't already cover them. They are reported as "Added (profile standard)" and not as scope creep.
- `references` are paths relative to `profiles/`. The Auditor tests against them and the Design Agent builds to them, so they should read as quality bars. Load only the files a profile lists.
- Keep each `checks` entry specific enough that the Auditor can answer pass or fail.
