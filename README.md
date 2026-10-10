# 📄 README

# Design automation pipeline

A Claude Code plugin that takes a raw design brief (or an existing canvas) to a client-ready Figma file:

**Preflight (platform scope, design direction, style preview) → Brief Agent → User stories (your review) → Design Agent (Claude Design) → Auditor + Coverage report ⇄ your review → Figma re-check → Handoff Agent (Figma)**

See *Design Automation Multi-Agent Blueprint v2* for the full design.


## 🆕 v0.4.5 — Platforms, stories and coverage

Click your platforms in preflight (web app, dashboard, landing page, mobile, tablet, TV, kiosk/ATM and 9 more) and the screen sizes; each platform's rules then apply automatically, and content details such as sections and CTA are read from your brief. See a quick **style preview** of your product before the slow design-system build, review **user stories** before design starts (`--skip-stories` to skip), and get a **Done / Missing / Added** coverage report against your brief or BRD after every round. `/design-continue` is removed: run `/design-pipeline` again to resume. See [CHANGELOG.md](CHANGELOG.md) for the full notes, [profiles/README.md](profiles/README.md) to add a platform, and [MODEL-OPTIMIZATION.md](MODEL-OPTIMIZATION.md) for the per-agent models.




## 📦 What’s inside

```
.claude-plugin/
  plugin.json            plugin manifest
  marketplace.json       lets the team install it from this repo
skills/
  design-pipeline/       /design-pipeline — the Orchestrator
    SKILL.md
    references/
      preflight.md       tool checks, starting point, platform scope, design direction and style preview
      state-file.md      design-pipeline-state.json and design-manifest.json formats, resume rules
agents/
  design-system-agent.md reference (image, screenshot, URL, Figma) → tokens fast, then Design System artifact
  brief-agent.md         brief, BRD or canvas → spec with numbered requirements and interaction states
  story-agent.md         spec → user stories with acceptance criteria, for your review
  design-agent.md        style preview; spec → Claude Design canvas at the chosen viewports
  design-auditor.md      usability heuristics, WCAG AA, platform checks and every interaction tested
  coverage-agent.md      brief/BRD vs design → Done, Missing, Added
  handoff-agent.md       approved design → native Figma file with state frames
profiles/
  index.json             the platform list
  <platform>/profile.json  questions, required screens and states, audit checks (16 platforms)
  _shared/references/    distilled guidance used by the profiles (see NOTICE.md)
NOTICE.md                attributions for the open-source guidance
```



## 🛠️ Requirements

- Claude Code with Artifacts / Claude Design available (for example, the Claude desktop app’s Code tab)
- Git install https://git-scm.com/install/
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



## 📀 Install (each team member, once)

In Claude code chat:

```
/plugin marketplace add https://github.com/ibnfahmi/Claude-design-automation-pipeline.git
```

Then:

```
/plugin install design-automation@design-team
```

Or just open the plugin and click install.



## 🧑‍💻 Use (per client project)

1. Create a new folder for the client and start a new Claude Code session in it.
2. Run `/design-pipeline`. (Plugin skills may also show as `/design-automation:design-pipeline`.)
3. Pass the preflight check, then choose:
   - **where to start**: a brief or BRD, or an existing Claude Design canvas or Figma file;
   - **the platforms** (one or several), and answer each platform's short questions (or take the defaults), such as device frames, breakpoints and navigation;
   - **the design direction**: a saved design system; a reference (image, screenshot, website URL or Figma file) with a quick style preview before the design system is built; or no design system, where the Design Agent chooses the look.
4. Paste the brief (or point to the BRD files) and answer any questions. Confirm the numbered requirements.
5. Review the **user stories** in `user-stories.md` (skip with `/design-pipeline --skip-stories`).
6. After each design round the Auditor tests the draft (Nielsen's heuristics, WCAG 2.1 AA, platform checks, a click-through of every interaction) and saves `audit-round-<n>.md`. The Coverage Agent compares the draft with your brief and saves `coverage-round-<n>.md` (Done / Missing / Added).
7. Review the draft, the audit and the coverage report in Claude Design: edit the canvas, leave comments, and say which issues to fix and which unrequested additions to keep or remove.
8. Reply **done** to send changes back, or say **approved** to build the Figma file. Unfixed critical audit issues and missing must-have requirements need an explicit "approve anyway".

Progress is saved in `design-pipeline-state.json` in the client folder, so you can stop and run `/design-pipeline` again in a later session to resume.



## ⬆️ Update plugin to recieve enhanced pipeline updates

In Claude code chat:
```
claude plugin marketplace update design-team
```

Then:
```
claude plugin update design-automation@design-team
```
