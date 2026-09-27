# README

# Design automation pipeline

A Claude Code plugin that takes a raw design brief to a client-ready Figma file:

**Preflight (design direction) → Brief Agent → Design Agent (Claude Design) → Auditor ⇄ your review → Figma re-check → Handoff Agent (Figma)**

See *Design Automation Multi-Agent Blueprint v2* for the full design.

## What’s inside

```
.claude-plugin/
  plugin.json            plugin manifest
  marketplace.json       lets the team install it from this repo

skills/
  design-pipeline/       /design-pipeline — the Orchestrator
    SKILL.md
    references/
      preflight.md       Figma and Claude Design checks, and the design direction
      state-file.md      design-pipeline-state.json format and resume rules
  design-continue/       /design-continue — resume after a review round

agents/
  design-system-agent.md reference image, screenshot or Figma file → Design System artifact
  brief-agent.md         brief → structured spec, incl. interaction states
  design-agent.md        spec → Claude Design canvas + interaction list
  design-auditor.md      usability heuristics, WCAG AA and every interaction tested
  handoff-agent.md       approved design → native Figma file with state frames
```

## Requirements

- Claude Code Desktop with paid plan.
- Git for desktop https://git-scm.com/install/
- The Figma connector, signed in
-/mcp server setup:
  1. Open a terminal (PowerShell) and start Claude Code:

  ```
  claude
  ```

  2. If Figma isn't set up yet, exit, add it, then start claude again:

  ```
  claude mcp add --transport http figma https://mcp.figma.com/mcp
  ```

  3. Inside the claude session, type:

  ```
  /mcp
  ```
  4. Pick figma (or figma-desktop) from the list, choose Authenticate, and finish signing in when your browser opens.
  - Optional: a Design System artifact in Claude Design, or a reference (image, screenshot or Figma file) to build one from
  - The Figma plugin for Claude Code (recommended, for the `figma-use` and `figma-generate-design` skills)

## Install (each team member, once)

In Claude code chat:

```
/plugin marketplace add https://github.com/ibnfahmi/Claude-design-automation-pipeline.git
```

Then:

```
/plugin install design-automation@design-team
```

Or just open the plugin and click install.

## Use (per client project)

1. Create a new folder for the client and start a new Claude Code session in it.
2. Run `/design-pipeline`. (Plugin skills may also show as `/design-automation:design-pipeline`.)
3. Pass the preflight check and choose the design direction:
   - **a saved design system**, picked from your Design System artifacts;
   - **a reference** (image, screenshot or Figma file), which can be turned into a new reusable design system;
   - **no design system**, and the Design Agent chooses the look.
4. Paste the brief and answer any questions.
5. After each design round the Auditor tests the draft: Nielsen's heuristics, WCAG 2.1 AA and a click-through of every interaction. Its report is saved as `audit-round-<n>.md`.
6. Review the draft and the audit in Claude Design: edit the canvas, leave comments, and say which audit issues to fix.
7. Run `/design-continue` to send changes back, or say **approved** to build the Figma file. Unfixed critical audit issues need an explicit "approve anyway".

Progress is saved in `design-pipeline-state.json` in the client folder, so you can stop and run `/design-continue` in a later session.

## Recommended test order

1. **Brief Agent** — run it on a few real briefs and check the spec, especially the *Interactions and states* table.
2. **Design Agent + Auditor + review loop** — confirm edits and comments made in Claude Design are read back correctly, and that the Auditor can click through the canvas's interactions.
3. **Handoff Agent** — confirm each state becomes its own annotated frame and check whether prototype links are created.
4. **Full run** on a real brief.

## Open items

- How much of the Claude Design canvas can be edited by hand, and whether those edits read back — to be tested.
- Creating Figma prototype links through the connector — expected to work, not yet confirmed. The fallback is annotated state frames.
- Whether subagents can use the Artifact, Figma and browser tools directly. If not, move those calls into the Orchestrator.
- Whether Claude Design canvases are clickable in the browser. If not, the Auditor checks each state's artboard instead of clicking through.
