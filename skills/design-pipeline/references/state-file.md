# State file: `design-pipeline-state.json`

Written to the client project folder (the session's working directory) after every stage. It lets `/design-pipeline` resume a run in a later session.

```json
{
  "project": "Acme onboarding app",
  "stage": "review",
  "updated_at": "2026-10-03T10:30:00Z",
  "skip_stories": false,
  "starting_point": "brief | canvas",
  "canvas_source": "link, only when starting_point is canvas",
  "preflight": {
    "figma": "ok — signed in as name@company.com",
    "claude_design": "ok",
    "design_type_url": "https://claude.ai/artifact/…",
    "direction": "system | reference | creative | canvas",
    "design_system_name": "Acme Brand DS, or null",
    "design_system_url": "https://claude.ai/artifact/… or null",
    "design_system_created": false,
    "design_system_status": "none | building | ready | failed",
    "design_system_agent_id": "background build agent id, or null",
    "reference": ["brand-screens/home.png, a website URL, or a Figma link; empty unless direction is reference"],
    "preview": {
      "url": "https://claude.ai/artifact/… or null",
      "approved": true,
      "tokens": {"colours": {}, "type": {}, "spacing": [], "radii": [], "shadows": {}}
    }
  },
  "scope": {
    "platforms": ["mobile-app", "landing-page"],
    "other": null,
    "options": {
      "mobile-app": {"os": "both", "device_frames": ["iphone-16", "iphone-se"], "orientation": "portrait", "navigation": "decide", "dark_mode": "no", "screens": "From the brief"},
      "landing-page": {"breakpoints": ["desktop", "tablet", "mobile"], "conversion_goal": "Start free trial"}
    },
    "viewports": {
      "mobile-app": [{"label": "iPhone 16 (393x852)", "size": [393, 852], "primary": true}, {"label": "iPhone SE (375x667)", "size": [375, 667]}],
      "landing-page": [{"label": "Desktop 1440", "size": [1440, 900], "primary": true}]
    }
  },
  "brief_source_file": "brief-source.md",
  "spec_file": "design-spec.md",
  "requirements_count": 14,
  "stories_file": "user-stories.md or null",
  "stories_confirmed": false,
  "design_agent_id": "agent id, valid only in the session that started it",
  "design_url": "https://claude.ai/artifact/…",
  "interaction_list": [
    "Home → click notification icon → Home / Notifications open"
  ],
  "manifest_file": "design-manifest.json",
  "review_round": 2,
  "audits": [
    {"round": 1, "result": "pass with issues", "interactions": "11/12", "platform_checks": "9/10", "critical": 0, "major": 2, "minor": 5, "report": "audit-round-1.md"}
  ],
  "coverage": [
    {"round": 1, "requirements": {"done": 10, "partial": 1, "missing": 3, "total": 14}, "stories": "5/7", "added_profile": 4, "added_unrequested": 2, "report": "coverage-round-1.md"}
  ],
  "approved": false,
  "figma_destination": "new file | existing file URL",
  "figma_url": null,
  "notes": []
}
```

## `design-manifest.json`

Written by the Orchestrator after every design round from the Design Agent's ARTBOARDS list. It is the map from every artboard to the brief, used by the Coverage Agent and the Handoff Agent.

```json
{
  "design_url": "https://claude.ai/artifact/…",
  "round": 2,
  "artboards": [
    {
      "name": "Home / Notifications open",
      "kind": "state",
      "platform": "mobile-app",
      "viewport": "iPhone 16 (393x852)",
      "covers_requirements": ["R-4"],
      "covers_stories": ["US-2"],
      "source": "brief | profile | canvas",
      "code_file": null
    }
  ]
}
```

`code_file` is reserved for a later version, where a code output folder can be linked to the canvas. Leave it `null`.

## `stage` values

| Value | Meaning | Resume at |
|---|---|---|
| `preflight` | Checks, scope or direction not finished | Stage 1 |
| `brief` | Waiting for or building the spec | Stage 2 |
| `stories` | Stories being written or reviewed | Stage 2b |
| `design` | Design Agent running | Stage 3 (restart the round) |
| `audit` | Auditor and Coverage Agent running | Stage 3b (rerun both) |
| `review` | Waiting for the user's review | Stage 4, step "When the user returns" |
| `handoff` | Approved; Figma build started | Stage 5 (re-check), then Stage 6 |
| `done` | Figma file delivered | Offer to start a new run |

Always re-run the tool checks (Figma, Claude Design) when resuming in a new session, because connections may have changed. Keep the saved scope, starting point and design direction instead of asking again, but tell the user which are in use and let them change them. If `design_system_status` is `building`, check whether the system now exists (list Design System artifacts) before deciding it failed.
