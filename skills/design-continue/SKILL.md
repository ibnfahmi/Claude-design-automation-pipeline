---
name: design-continue
description: Continue the design pipeline after reviewing the draft in Claude Design. Use when the user runs /design-continue, or says they have finished editing or commenting on the design draft.
---

# Continue the design pipeline

The user has finished a review round in Claude Design (or is resuming a run in a new session).

1. Read `design-pipeline-state.json` in the current folder.
   - Not found → tell the user there's no pipeline run in this folder and suggest `/design-pipeline`.
   - Found → continue with the `design-pipeline` skill's instructions from the saved `stage`. Load that skill if its instructions aren't already in this conversation.
2. If `stage` is `review`, run the "When the user returns" steps of Stage 4: read the latest design, read the comments, then either send the changes back to the Design Agent or, only on explicit approval, move on to the Figma re-check and handoff.
3. If this is a new session, re-run the preflight checks first, and start a fresh Design Agent if one is needed (the old agent ID won't work here).

Anything the user typed with the command (for example `/design-continue approved`, or extra notes) counts as review feedback.
