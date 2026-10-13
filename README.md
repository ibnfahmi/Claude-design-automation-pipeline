# 📄 README

# Design automation pipeline

```▄▄▄▄▄▄▄▄     ▄▄▄▄▄▄     ▄▄▄▄▄▄   ▄▄▄▄▄   ▄▄▄▄▄▄▄▄ ▄▄▄▄▄▄▄        
█▓▒░    ▀▄ ▄▀▒░    ▀▄ ▄▀▒░    ▀▄ █▓▒░▓ ▄▀▒░     ▓ █▓▒░   ▀▄      
█▒░ ▄▀▄  █ █▒░ ▓▀░  ░ █▒░ █▀▄  ▓ █▒░ ▒ █▒░ ▓▀▒  ▒ █▒░ █▀▄  ▓     
█░  ▒ ▒  █ █░  ▒ ▀▀▀▀ █░  ▒ ▒▄▄▓ █░  ░ █░  ▒ ▀▀▀▀ █░  █ ░  ▒     
█   ░ █  ▓ █   ▀▀▀▓   █   ▓▄▄▄   █   █ █   ▀▀▀▀▀▓ █   █ ▒  ░     
▓   ▓ ▓  ▒ ▓   ▄▄▄▒    ▀▄▄    ▀▄ ▓   █ ▓   █▄▄  ░ ▓   █ ▓  █     
▒   ▓ ░  ░ ▒   ░ ▄▄▄▄     ▀▀░  ░ ▒   ▓ ▒   ▓ ░  ░ ▒   ▓ █  ▓     
░   ▒ ▒  ▒ ░   ▒ ▒  ▒ ▓▀▀▀▒ ▒  ▒ ░   ▒ ░   ▒ ▒  ▒ ░   ▒ ▓  ▒     
█   ░▄▀ ░░ █   ░▄░ ░░ ▒▒░ ░▄▓ ░░ █  ░░ █   ░▄▀ ░░ █  ░░ ▒ ░░     
█      ░▓▀ ▀▄     ░▓█ ░      ░▒█ █ ░▒  ▀▄     ░▓█ █ ░▒█ ░░▒█     
▀▀▀▀▀▀▀▀     ▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀   ▀▀▀▀▀▀▀▀ ▀▀▀▀▀ ▀▀▀▀     
  ▄▄▄▄▄▄   ▄▄▄▄▄ ▄▄▄▄ ▄▄▄▄▄▄▄▄▄   ▄▄▄▄▄▄   ▄▄▄▄▄▄ ▄▄      ▄▄▄▄▄▄   ▄▄▄▄▄▄▄▄▄ ▄▄▄▄▄   ▄▄▄▄▄▄   ▄▄▄▄▄▄▄   
▄▀▒░    ▀▄ █▓▒░▓ ▓▓▒▓ █▓▒░    ▒ ▄▀▒░    ▀▄ █▓▒░  ▀▀ ▀▄  ▄▀▒░    ▀▄ █▓▒░    ▒ █▓▒░▓ ▄▀▒░    ▀▄ █▓▒░   ▀▄ 
█▒░ ▄▀▄  ▓ █▒░ ▄ ▒▒░█ ▀▀█   █▀▀ █▒░ ▄▀▄  █ █▒░ █▀▄▀▄  ▓ █▒░ ▄▀▄  ▓ ▀▀█   █▀▀ █▒░ ▒ █▒░ ▄▀▄  █ █▒░ █▀▄  ▓
█░  ▒ ▒  ▓ █░  ▒ ▒░ █   █   █   █░  ▒ ▒  █ █░  █ ▓ ░  ▒ █░  ▒ ▒  ▓   █   █   █░  ░ █░  ▒ ▒  █ █░  █ ░  ▒
█   ░▄▀  ▒ █   ░ █  ▓   █   █   █   ░ █  ▓ █   █ ▒ ▒  ░ █   ░▄▀  ▒   █   █   █   █ █   ░ █  ▓ █   █ ▒  ░
▓        ▒ ▓   ▓ ▓  ▒   ▓   █   ▓   ▓ ▓  ▒ ▓   █ ▓ ▓  █ ▓        ▒   ▓   █   ▓   █ ▓   ▓ ▓  ▒ ▓   █ ▓  █
▒   ▓▀░  ░ ▒   ▓ ░  ░   ▒   ▓   ▒   ▓ ░  ░ ▒   ▓   █  ▓ ▒   ▓▀░  ░   ▒   ▓   ▒   ▓ ▒   ▓ ░  ░ ▒   ▓ █  ▓
░   ░ ▒  ▒ ░   ▒ ▒  ▒   ░   ▒   ░   ▒ ▒  ▒ ░   ▒   ▓  ▒ ░   ░ ▒  ▒   ░   ▒   ░   ▒ ░   ▒ ▒  ▒ ░   ▒ ▓  ▒
█  ░░ ▓ ░░ █   ░▄▀ ░░   █  ░░   █   ▀▄▀ ░░ █  ░░   ▒ ░░ █  ░░ ▓ ░░   █  ░░   █  ░░ █   ▀▄▀ ░░ █  ░░ ▒ ░░
█ ░▒█ ▓░▒█ ▀▄     ░▓▀   █ ░▒    ▀▄     ░▓▀ █ ░▒█   ░░▒█ █ ░▒█ ▓░▒█   █ ░▒    █ ░▒  ▀▄     ░▓▀ █ ░▒█ ░░▒█
▀▀▀▀▀ ▀▀▀▀   ▀▀▀▀▀▀     ▀▀▀▀▀     ▀▀▀▀▀▀   ▀▀▀▀▀   ▀▀▀▀ ▀▀▀▀▀ ▀▀▀▀   ▀▀▀▀▀   ▀▀▀▀▀   ▀▀▀▀▀▀   ▀▀▀▀▀ ▀▀▀▀
                                      ▄▄▄▄▄▄▄▄   ▄▄▄▄▄ ▄▄▄▄▄▄▄▄     ▄▄▄▄▄▄   ▄▄▄▄▄      ▄▄▄▄▄ ▄▄▄▄▄▄▄      ▄▄▄▄▄▄  
                                    █▓▒░    ▀▄ █▓▒░▓ █▓▒░    ▀▄ ▄▀▒░    ▀▄ █▓▒░▓      █▓▒░▓ █▓▒░   ▀▄  ▄▀▒░    ▀▄
                                  █▒░ ▓▀░  ▓ █▒░ ▒ █▒░ ▓▀░  ▓ █▒░ ▓▀░  ░ █▒░ ▒      █▒░ ▒ █▒░ █▀▄  ▓ █▒░ ▓▀░  ░
                                  █░  ▒ ░  ▒ █░  ░ █░  ▒ ░  ▒ █░  ▒ ▀▀▀▀ █░  ░      █░  ░ █░  █ ░  ▒ █░  ▒ ▀▀▀▀
                                  █   ▀▀▀  █ █   █ █   ▀▀▀  █ █   ▀▀▀▓   █   █      █   █ █   █ ▒  ░ █   ▀▀▀▓  
                                  ▓   ▄▄▄▄▀  ▓   █ ▓   ▄▄▄▄▀  ▓   ▄▄▄▒   ▓   █      ▓   █ ▓   █ ▓  █ ▓   ▄▄▄▒  
                                  ▒   ░      ▒   ▓ ▒   ░      ▒   ░ ▄▄▄▄ ▒   ▓      ▒   ▓ ▒   ▓ █  ▓ ▒   ░ ▄▄▄▄
                                  ░   ▒      ░   ▒ ░   ▒      ░   ▒ ▒  ▒ ░   ▒      ░   ▒ ░   ▒ ▓  ▒ ░   ▒ ▒  ▒
                                  █  ░░      █  ░░ █  ░░      █   ░▄░ ░░ █   ░▄▄▄▄▄ █  ░░ █  ░░ ▒ ░░ █   ░▄░ ░░
                                  █ ░▓█      █ ░▒  █ ░▓█      ▀▄     ░▓█ █     ░▒▓▓ █ ░▒  █ ░▒█ ░░▒█ ▀▄     ░▓█
                                  ▀▀▀▀▀      ▀▀▀▀▀ ▀▀▀▀▀        ▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀ ▀▀▀▀▀ ▀▀▀▀▀ ▀▀▀▀   ▀▀▀▀▀▀▀ 
         <- Claude Code plugin ~ brief > journeys > design > audit > code > Figma ->
```


A Claude Code plugin that takes a raw design brief (or an existing code project or Figma file) to a **working code project**, with an optional Figma export:

**Preflight (Node check, brief, platforms, screen sizes) → Brief Agent → User journeys (your review) → Style direction and live preview → Design Agent builds the code → Auditor + Coverage report on the running app ⇄ your review → production check → optional Figma export**

See *Design Automation Multi-Agent Blueprint v2* for the full design.


Release notes are in [CHANGELOG.md](CHANGELOG.md). To add a platform, see [profiles/README.md](profiles/README.md).

## 📦 What’s inside

```
.claude-plugin/
  plugin.json            plugin manifest
  marketplace.json       lets the team install it from this repo
skills/
  design-pipeline/       /design-pipeline — the Orchestrator
  design-journeys/       /design-journeys — create user journeys on demand
  design-audit/          /design-audit — audit a running app or project on demand
    SKILL.md
    references/
      preflight.md       tool checks, starting point and brief, platform scope and screen sizes
      direction.md       style direction (design system, reference or creative) and the style preview
      state-file.md      design-pipeline-state.json and design-manifest.json formats, resume rules
      gitlab.md          hosting the code project on GitLab (ask once, push after each round)
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



## 🎯 Built-in enhancements

**Code and design accuracy**

- **Numbered requirements, traced end to end.** The brief becomes numbered requirements; every frame lists the requirements and journey steps it covers, and a Coverage Agent reports Done, Missing and Added against the original brief or BRD after every round.
- **A working app, not a mockup.** The output is code with real interactions, design tokens as CSS variables and a registry of every screen and state, so what is reviewed is what ships.
- **Tested in the running app.** The Auditor resizes to each chosen screen size, clicks through every interaction and journey, reads the console and network, runs the build, and checks UI defects, accessibility, polish and code quality. Worst-case data stress tests are available on request.
- **Look before build.** A quick style preview of your real product (a saved design system, or a reference such as a website, image or Figma file) is approved before the slow work runs. Website references are measured, including interactions, animations, transitions and scrolling effects.
- **User journeys reviewed first.** Flows (with branches, errors and exits) are agreed before any design is built.
- **One representative screen per type**, with all its states, instead of copies of every template instance.
- **Quality gates** before delivery: clean build and lint, no console errors on any screen, a fresh install, and a double-click `share/` file that is tested from disk.
- **Documents read as exact text.** Word, Excel, PowerPoint and PDF briefs are converted to markdown first, so values and wording are not guessed.
- **Your edits are kept.** Revision rounds read `git diff` first and keep what you changed by hand; comments on the review page are applied automatically.
- **Figma built from measurement.** Screens are measured from the settled page (final animation state, pinned fonts, spacing on a scale, layout grids), built as real auto layout and compared with a screenshot of the original.

**Model and token usage**

- **The right model per job.** Opus 5.5 for the brief, the audit, coverage and design-system extraction (mistakes there carry forward); Sonnet 5.5 for journeys, the build and the Figma export (see `MODEL-OPTIMIZATION.md`).
- **Optional steps say what they cost.** User journeys and the audit are optional, with a note that they use many tokens; stress tests and the Figma export only run when asked.
- **Build in phases.** Large projects are split by feature, so you judge a working first phase before the rest is built.
- **Less to read, less to build.** Briefs are converted before agents read them, one screen per type is built, the design-system build runs in the background (or "tokens only" for a lighter one), and the preview is the start of the real project, not throwaway work.
- **Time estimate before the build**, then the actual time against it.

## 🧩 Platform profiles

A profile is what the pipeline knows about one kind of product, so the same steps fit a kiosk and a landing page. You pick the platforms in preflight (one or several); each profile supplies:

- the **questions** worth asking for that platform and a **preview screen** for the style step
- the **code target** (for example a responsive app in device frames, a Manifest V3 extension, HTML email, a fixed-size TV or kiosk stage)
- the **required screens and states**, **design guidance** (sizes, safe zones, touch or focus rules) and the **audit checks** the Auditor runs

16 platforms in 4 groups:

| Group | Platforms |
|---|---|
| Websites and web apps | Web app, Dashboard, Landing page, E-commerce |
| Mobile, tablet, desktop and extensions | Mobile app, Tablet app, Desktop app, Browser extension |
| Content and marketing | Email, Presentation deck, Social media, Docs / help center |
| Public screens, systems and flows | Smart TV, Kiosk, Design system library, Flow (onboarding, checkout) |

Anything else can be typed in as a free-text platform; it gets the web app checks. To add a platform, see [profiles/README.md](profiles/README.md).

## 🧪 Distilled from external skills

Some guidance is rewritten (not copied) from open-source skills, all MIT licensed. Full attributions are in `NOTICE.md`.

| Source | What it adds to the pipeline |
|---|---|
| Emil Kowalski: `mobile-native`, `break-ui`, `emil-design-eng` | Native feel on phones, the worst-case stress test, component-feel and reflow checks in the audit |
| Jakub Krehel: `better-accessibility`, `better-layout`, `better-typography`, `better-ui` | Accessibility, layout and type rules, hit areas, polish and motion values, the code-quality checks |
| Owl-Listener `designer-skills` (MC Dean) | Visual critique, states and feedback, forms, data viz, dark mode, localisation and RTL, handoff specs, user-flow and journey structure |
| Elaya: `landing-page-design` | Landing page and e-commerce page structure |
| codeswithroh: Tastemaker | Grounding a look in real references instead of guessing |
| ConardLi: `web-design-engineer` | Design-engineering and data-viz guidance, dashboard rules |

## 🛠️ Requirements

- Claude Code (for example the Claude desktop app's Code tab, which also gives the built-in browser pane the pipeline uses to preview and test the app)
- **Node.js 20 or newer** and npm, because the output is a real code project
- Git install https://git-scm.com/install/
- Optional, only for the Figma export or a Figma reference: the Figma connector, signed in
  1. Open a terminal (PowerShell) and start Claude Code: `claude`
  2. If Figma isn't set up yet, exit, add it, then start claude again:

```
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

  3. Inside the claude session, type `/mcp`, pick figma (or figma-desktop), choose Authenticate, and finish signing in when your browser opens.
- Optional: a saved design system (a folder in `~/.claude/design-systems/`, or a Design System artifact in your account), or a reference (image, screenshot, website URL or Figma file) to take the look from
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
   - **the platforms** (one or several), the **screen sizes** by clicking (the code is plain HTML, CSS and JS by default; ask for a conversion to React, Next.js or another stack whenever you want one);
   - then paste the brief (or point to the BRD files).
4. Answer any questions, and confirm the numbered requirements.
5. Review the **user journeys** in `user-journeys.md`: flows with screens, decisions, error paths and exits, for every platform and across platforms (optional: the pipeline asks whether you want them, or pass `/design-pipeline --skip-journeys` to skip the question). The audit after each round is optional too (`--skip-audit`); both can use a lot of tokens.
6. Choose the **style**: a saved design system (folder or artifact), a reference (image, screenshot, website URL or Figma file) with a live preview of your product in that look, or no design system.
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
