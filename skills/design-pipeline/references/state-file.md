# State file: `design-pipeline-state.json`

Written to the client project folder (the session's working directory) after every stage. It lets `/design-continue` or `/design-pipeline` resume a run in a later session.

```json
{
  "project": "Acme onboarding app",
  "stage": "review",
  "updated_at": "2026-09-26T10:30:00Z",
  "preflight": {
    "figma": "ok — signed in as name@company.com",
    "claude_design": "ok",
    "design_type_url": "https://claude.ai/artifact/…",
    "direction": "system | reference | creative",
    "design_system_name": "Acme Brand DS, or null",
    "design_system_url": "https://claude.ai/artifact/… or null",
    "design_system_created": false,
    "reference": ["brand-screens/home.png or a Figma link; empty unless direction is reference"]
  },
  "spec_file": "design-spec.md",
  "design_agent_id": "agent id, valid only in the session that started it",
  "design_url": "https://claude.ai/artifact/…",
  "interaction_list": [
    "Home → click notification icon → Home / Notifications open"
  ],
  "review_round": 2,
  "audits": [
    {"round": 1, "result": "pass with issues", "interactions": "11/12", "critical": 0, "major": 2, "minor": 5, "report": "audit-round-1.md"}
  ],
  "approved": false,
  "figma_destination": "new file | existing file URL",
  "figma_url": null,
  "notes": []
}
```

## `stage` values

| Value | Meaning | Resume at |
|---|---|---|
| `preflight` | Checks not passed yet | Stage 1 |
| `brief` | Waiting for or building the spec | Stage 2 |
| `design` | Design Agent running | Stage 3 (restart the round) |
| `audit` | Auditor running | Stage 3b (rerun the audit) |
| `review` | Waiting for the user's review | Stage 4, step "When the user returns" |
| `handoff` | Approved; Figma build started | Stage 5 (re-check), then Stage 6 |
| `done` | Figma file delivered | Offer to start a new run |

Always re-run preflight when resuming in a new session, because connections may have changed. When resuming a run that is past the brief stage, keep the saved design direction instead of asking again, but tell the user which one is in use (and which design system or reference) and let them change it.
