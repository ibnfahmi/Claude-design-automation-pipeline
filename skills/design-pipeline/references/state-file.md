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
    "design_system_url": "https://claude.ai/artifact/… or null"
  },
  "spec_file": "design-spec.md",
  "design_agent_id": "agent id, valid only in the session that started it",
  "design_url": "https://claude.ai/artifact/…",
  "interaction_list": [
    "Home → click notification icon → Home / Notifications open"
  ],
  "review_round": 2,
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
| `review` | Waiting for the user's review | Stage 4, step "When the user returns" |
| `handoff` | Approved; Figma build started | Stage 5 (re-check), then Stage 6 |
| `done` | Figma file delivered | Offer to start a new run |

Always re-run preflight when resuming in a new session, because connections may have changed.
