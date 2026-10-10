# State file: `design-pipeline-state.json`

Written to the client project folder (the session's working directory) after every stage. It lets `/design-pipeline` resume a run in a later session. The code itself lives in `code/` (a local git repository), which is the source of truth for the build.

```json
{
  "project": "Acme onboarding app",
  "stage": "review",
  "updated_at": "2026-10-03T10:30:00Z",
  "skip_journeys": false,
  "starting_point": "brief | code | figma",
  "existing_source": "folder path or Figma link, only when starting_point is code or figma",
  "preflight": {
    "node": "ok — node 20.x, npm 10.x",
    "direction": "system | reference | creative | existing",
    "design_system_name": "Acme Brand DS, or null",
    "design_system_path": "~/.claude/design-systems/acme-brand-ds or a folder path, or null",
    "design_system_status": "none | building | ready | failed",
    "design_system_agent_id": "background build agent id, or null",
    "reference": ["brand-screens/home.png, a website URL, or a Figma link; empty unless direction is reference"],
    "preview": {
      "route": "/style-preview",
      "approved": true,
      "tokens": {"colours": {}, "type": {}, "spacing": [], "radii": [], "shadows": {}},
      "signature": {"hero": "", "primary_button": "", "rendering": "html | svg | video | webgl", "motion": "", "interactions": [{"trigger": "click CTA", "result": "camera pans sideways, headline splits", "transition": "1.0s cubic-bezier(1,0,0,1)"}], "screenshots": [], "reproducibility": ""}
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
  "platform_coverage": {"dashboard": {"brief": 12, "derived": 1, "profile": 4}, "landing-page": {"brief": 0, "derived": 6, "profile": 2}},
  "journeys_file": "user-journeys.md or null",
  "journeys_confirmed": false,
  "code_dir": "code/",
  "stack": "react-vite-ts-tailwind | nextjs | html-css-js | other: <name>",
  "share_dir": "share/",
  "share_status": "pass | pass with issues | fail | not verified | not supported",
  "dev_port": 5173,
  "dev_url": "http://localhost:5173",
  "design_agent_id": "agent id, valid only in the session that started it",
  "interaction_list": [
    "Home → click notification icon → Home / Notifications open"
  ],
  "manifest_file": "design-manifest.json",
  "review_round": 2,
  "audits": [
    {"round": 1, "result": "pass with issues", "interactions": "11/12", "platform_checks": "9/10", "critical": 0, "major": 2, "minor": 5, "report": "audit-round-1.md"}
  ],
  "coverage": [
    {"round": 1, "requirements": {"done": 10, "partial": 1, "missing": 3, "total": 14}, "journeys": "5/7", "added_profile": 4, "added_unrequested": 2, "report": "coverage-round-1.md"}
  ],
  "approved": false,
  "figma_export": "no | yes",
  "figma_destination": "new file | existing file URL | null",
  "figma_url": null,
  "notes": []
}
```

`scope.options` holds the **confirmed Scope settings** from the spec (read from the brief, inferred, or defaulted), saved after the user confirms the spec. Screen sizes are saved earlier, under `scope.viewports`, from the preflight clicks.

## `design-manifest.json`

Written by the Orchestrator after every build round from the Design Agent's FRAMES list. It is the map from every frame to the brief, the journeys and the code, used by the Auditor, the Coverage Agent and the Handoff Agent.

```json
{
  "dev_url": "http://localhost:5173",
  "round": 2,
  "frames": [
    {
      "name": "Home / Notifications open",
      "kind": "state",
      "platform": "mobile-app",
      "viewport": "iPhone 16 (393x852)",
      "route": "/frames/home--notifications-open",
      "code_file": "src/platforms/mobile-app/pages/Home.tsx",
      "covers_requirements": ["R-4"],
      "covers_journeys": ["J1.2"],
      "source": "brief | profile | journey | existing"
    }
  ]
}
```

## `stage` values

| Value | Meaning | Resume at |
|---|---|---|
| `preflight` | Tool check, brief, platforms or screen sizes not finished | Stage 1 |
| `brief` | Waiting for or building the spec | Stage 2 |
| `journeys` | Journeys being written or reviewed | Stage 2b |
| `direction` | Choosing the style direction, scaffolding or previewing it | Stage 2c |
| `design` | Design Agent building | Stage 3 (restart the round) |
| `audit` | Auditor and Coverage Agent running | Stage 3b (rerun both) |
| `review` | Waiting for the user's review | Stage 4, step "When the user returns" |
| `handoff` | Approved; optional Figma export started | Stage 6 |
| `done` | Code (and optional Figma file) delivered | Offer to start a new run |

Always re-run the tool check (Node and npm) when resuming in a new session, and restart the dev server with the preview tool. Keep the saved scope, starting point and design direction instead of asking again, but tell the user which are in use and let them change them. If `design_system_status` is `building`, check whether the design-system folder now exists before deciding it failed.
