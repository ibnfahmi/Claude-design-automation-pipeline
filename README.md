# README

# Design automation pipeline

A Claude Code plugin that takes a raw design brief to a client-ready Figma file:

**Preflight → Brief Agent → Design Agent (Claude Design) ⇄ your review → Figma re-check → Handoff Agent (Figma)**

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
      preflight.md       Figma, Claude Design, and design-system checks
      state-file.md      design-pipeline-state.json format and resume rules
  design-continue/       /design-continue — resume after a review round
agents/
  brief-agent.md         brief → structured spec, incl. interaction states
  design-agent.md        spec → Claude Design canvas + interaction list
  handoff-agent.md       approved design → native Figma file with state frames
```

## Requirements

- Claude Code with Artifacts / Claude Design available (for example, the Claude desktop app’s Code tab)
- The Figma connector, signed in
- A design system set up in Claude Design (recommended)
- The Figma plugin for Claude Code (recommended, for the `figma-use` and `figma-generate-design` skills)

## Install (each team member, once)

After this repo is pushed to your Git host:

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
3. Pass the preflight check and pick the design system for this project from the list of your Claude Design design systems. Then paste the brief and answer any questions.
4. Review the draft in Claude Design: edit the canvas and leave comments.
5. Run `/design-continue` to send changes back, or say **approved** to build the Figma file.

Progress is saved in `design-pipeline-state.json` in the client folder, so you can stop and run `/design-continue` in a later session.

## Recommended test order

1. **Brief Agent** — run it on a few real briefs and check the spec, especially the *Interactions and states* table.
2. **Design Agent + review loop** — confirm edits and comments made in Claude Design are read back correctly.
3. **Handoff Agent** — confirm each state becomes its own annotated frame and check whether prototype links are created.
4. **Full run** on a real brief.

## Open items

- How much of the Claude Design canvas can be edited by hand, and whether those edits read back — to be tested.
- Creating Figma prototype links through the connector — expected to work, not yet confirmed. The fallback is annotated state frames.
- Whether subagents can use the Artifact and Figma tools directly. If not, move those calls into the Orchestrator.
