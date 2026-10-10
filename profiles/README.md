# Platform profiles

A profile describes one kind of product (mobile app, dashboard, landing page, kiosk and so on). The Orchestrator asks the user which platforms are in scope during preflight, then asks each selected platform's option questions. The answers are saved as `scope` in `design-pipeline-state.json` and drive the whole run:

| Consumer | Uses |
|---|---|
| Orchestrator | `options` (the preflight questions), `preview_screen` (what the style preview shows) |
| Brief Agent | `required_screens`, `required_states` (added to the spec, marked `source: profile`) |
| Story Agent | the scope, to write platform-specific stories and acceptance criteria |
| Design Agent | chosen viewports (artboard sizes), `design_guidance`, and the files in `auditor.references` plus `grounding.md`, read before building |
| Design System Agent | `grounding.md`, for measuring tokens from a reference |
| Auditor | `auditor.checks` and `auditor.references` |
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
  "required_screens": ["Screens every product of this type needs, added to the spec as source: profile"],
  "required_states": ["States every product of this type needs"],
  "design_guidance": ["Short rules the Design Agent follows"],
  "auditor": {
    "references": ["_shared/references/interface-quality.md"],
    "checks": ["Platform checks the Auditor runs, each a testable statement"]
  }
}
```

- `type: single` takes one value, `multi` takes a list, `text` takes free text.
- `viewport: true` marks the option whose choices carry a `size` ([width, height] in px). The chosen sizes become the artboard sizes. The first chosen size is the **primary viewport**, where every interaction state is designed. Every screen is designed at every chosen size.
- `default` is used when the user picks "Use defaults". Every option must have one.
- `required_screens` and `required_states` are suggestions the Brief Agent adds to the spec when the brief doesn't already cover them. They are reported as "Added (profile standard)" and not as scope creep.
- `references` are paths relative to `profiles/`. The Auditor tests against them and the Design Agent builds to them, so they should read as quality bars. Load only the files a profile lists.
- Keep each `checks` entry specific enough that the Auditor can answer pass or fail.
