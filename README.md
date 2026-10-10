# 📄 README

# Design automation pipeline

A Claude Code plugin that takes a raw design brief (or an existing code project or Figma file) to a **working code project**, with an optional Figma export:

**Preflight (Node check, brief, platforms, screen sizes) → Brief Agent → User journeys (your review) → Style direction and live preview → Design Agent builds the code → Auditor + Coverage report on the running app ⇄ your review → production check → optional Figma export**

See *Design Automation Multi-Agent Blueprint v2* for the full design.


## 🆕 v0.6.0 — Code first

The output is now a **working code project** in `code/` (in the stack you choose per project: React + Vite + Tailwind, Next.js, plain HTML, or your own; some platforms have their own target: an extension, HTML emails, a TV or kiosk stage), not a Claude Design canvas. The style preview is a real route of that project, every screen and state is a frame you can open at `/frames`, journeys can be walked at `/journeys`, and the Auditor and Coverage Agent test the running app. Figma is an optional export at the end. See [CHANGELOG.md](CHANGELOG.md) for the full notes and [profiles/README.md](profiles/README.md) to add a platform.

## 📦 What’s inside

```
.claude-plugin/
  plugin.json            plugin manifest
  marketplace.json       lets the team install it from this repo
skills/
  design-pipeline/       /design-pipeline — the Orchestrator
    SKILL.md
    references/
      preflight.md       tool checks, starting point and brief, platform scope and screen sizes
      direction.md       style direction (design system, reference or creative) and the style preview
      state-file.md      design-pipeline-state.json and design-manifest.json formats, resume rules
agents/
  design-system-agent.md reference (image, screenshot, URL, Figma) → tokens fast, then a design-system folder
  brief-agent.md         brief, BRD, existing code or Figma → spec with numbered requirements and interaction states
  journey-agent.md       spec → user journeys as user flows (every platform, cross-platform paths), for your review
  design-agent.md        scaffold and style preview; spec and journeys → a working, responsive code project with a frame registry
  design-auditor.md      tests the running app: heuristics, WCAG AA, platform checks, code checks and every interaction
  coverage-agent.md      brief/BRD vs design → Done, Missing, Added
  handoff-agent.md       optional: approved app → Figma file with a frame per screen and state
profiles/
  index.json             the platform list
  <platform>/profile.json  questions, required screens and states, audit checks (16 platforms)
  _shared/references/    distilled guidance used by the profiles (see NOTICE.md)
NOTICE.md                attributions for the open-source guidance
```



## 🛠️ Requirements

- Claude Code (for example the Claude desktop app's Code tab, which also gives the built-in browser pane the pipeline uses to preview and test the app)
- **Node.js 20 or newer** and npm, because the output is a real code project
- Optional, only for the Figma export or a Figma reference: the Figma connector, signed in
  1. Open a terminal (PowerShell) and start Claude Code: `claude`
  2. If Figma isn't set up yet, exit, add it, then start claude again:

```
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

  3. Inside the claude session, type `/mcp`, pick figma (or figma-desktop), choose Authenticate, and finish signing in when your browser opens.
- Optional: a saved design-system folder (in `~/.claude/design-systems/`), or a reference (image, screenshot, website URL or Figma file) to take the look from
- The Figma plugin for Claude Code (recommended for the export, for the `figma-use` and `figma-generate-design` skills)

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
3. Pass the Node check, then choose:
   - **where to start**: a brief or BRD, an existing code project, or a Figma file;
   - **the platforms** (one or several), the **screen sizes** and the **code stack** (React + Vite + Tailwind, Next.js, plain HTML, or your own, each with a short note on when to use it), by clicking;
   - then paste the brief (or point to the BRD files).
4. Answer any questions, and confirm the numbered requirements.
5. Review the **user journeys** in `user-journeys.md`: flows with screens, decisions, error paths and exits, for every platform and across platforms (skip with `/design-pipeline --skip-journeys`).
6. Choose the **style**: a saved design system, a reference (image, screenshot, website URL or Figma file) with a live preview of your product in that look, or no design system.
7. The Design Agent builds the project in `code/`. After each round the Auditor tests the running app (Nielsen's heuristics, WCAG 2.1 AA, platform checks, code checks, a click-through of every interaction) and saves `audit-round-<n>.md`. The Coverage Agent compares the app with your brief and saves `coverage-round-<n>.md` (Done / Missing / Added).
8. Try the app in the browser pane (frames at `/frames`, journeys at `/journeys`), and tell Claude what to change, or edit the code yourself: your edits are kept. Say which issues to fix and which unrequested additions to keep or remove.
9. Reply **done** to send changes back, or say **approved** to finish. Unfixed critical audit issues and missing must-have requirements need an explicit "approve anyway". After approval you can optionally export the app to a Figma file.

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
