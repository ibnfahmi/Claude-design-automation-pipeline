# Changelog

All notable changes to the design-automation plugin are documented here.

## [0.6.3] - 2026-10-11

### Added
- **Build large projects in phases.** The spec now lists the product's major features (`F-0 Foundation`, `F-1`…). For a large project (6 or more features, 30 or more requirements, or 25 or more frames) the pipeline asks whether to build in phases and lets you pick the features of Phase 1 with clickable choices, recommending the smallest working end-to-end slice. Only the chosen features get journeys, build, audit and coverage; unbuilt features show as disabled "Planned" navigation entries and count as "Deferred (later phase)", not Missing. When you approve a phase and write "continue" (or "continue building", "next phase", or anything with that meaning), the pipeline lists the remaining features for Phase 2, and so on until everything is built. New reference `references/phases.md`; the Design Agent has a new add-phase mode that extends the same project.

## [0.6.2] - 2026-10-11

### Changed
- **Plain HTML, CSS and JS is the default output, with no stack question.** The preflight stack question is gone. Every project is built as plain HTML, CSS and JS (an existing code project keeps its own stack).
- **Other stacks only on request.** When you ask to convert ("convert it to React", "make it Next.js"), the Design Agent builds a new `code-<stack>/` project next to `code/` from the finished HTML project, and the result is compared with the original. `code/` is left untouched. The delivery summary ends with a one-line reminder that you can ask for a conversion. New reference `references/convert.md` has the when-to-use guide for React + Vite + Tailwind, Next.js and other stacks.

## [0.6.1] - 2026-10-11

### Changed
- **The audit is optional.** After you confirm the spec, one question now asks about both optional steps, each with a short note that it might use a large number of tokens: write user journeys (yes/no), and run the audit after each round (yes/no). Skipping the audit leaves the coverage report against your brief running every round; you can say "run the audit" at any time for a full test of the current build. `--skip-audit` skips the question. When the audit is off, the Design Agent runs the share file-open test.

## [0.6.0] - 2026-10-10

### Changed
- **Review comments are applied automatically, like in a normal Claude Code artifact session.** A comment sent to Claude from the review page now arrives in the session as an `[Artifact comment sent to Claude]` message and is handled on the spot: the Design Agent changes the local `code/`, `share/` is rebuilt and committed (`Comment <thread id>: <summary>`), the page is republished to the same link, and the thread gets a one-line reply and is resolved. There is no "say done" step for comments, and comment fixes skip the full audit (the next full round covers them). Frames and components now carry `data-frame` and `data-component` attributes so a comment's anchor can be traced to its source file.

## [0.5.9] - 2026-10-10

### Added
- **Comment on the design, and Claude applies it.** The output is still code, but after the first build the pipeline offers to publish the `share/` build as a **private review page** (a claude.ai Artifact). You select what should change and leave a comment on the page, send the thread to Claude, and in the review step the pipeline reads the comments, applies them to the code in a revision round, republishes to the same link, and replies to and resolves the threads it fixed. The page can be shared from claude.ai so teammates can comment too. Declining keeps review local. New reference `references/review-page.md`; the Design Agent now returns a `COMMENT_RESULTS` block.

## [0.5.8] - 2026-10-10

### Added
- **The session is always named after the project.** At the start of a run the pipeline renames the session to the project's name (from your message, the brief, the existing code project or the Figma file). If there is no name yet, it uses a unique placeholder such as `Untitled amber-fox-4821`, and replaces it with the real name once the spec names the project. In sessions without the rename tool it skips silently.

## [0.5.7] - 2026-10-10

### Changed
- **The user journeys step is optional, and you choose each run.** After you confirm the spec, the pipeline asks "Write user journeys for you to review before design starts?" with two clickable options: Yes (recommended) or No, skip them. On No it goes straight to the style step, the app takes its flows from the spec, and coverage is checked against the requirements only. The `--skip-journeys` flag still works and skips the question.

## [0.5.6] - 2026-10-10

### Changed
- The README no longer carries a "what's new" section for each release. Release notes live in this changelog; the README gets an announcement only for a major update the maintainer asks for.

## [0.5.5] - 2026-10-10

### Changed
- The README requirement for Git uses the original wording: "Git install https://git-scm.com/install/".

## [0.5.4] - 2026-10-10

### Fixed
- **Git is a requirement again.** It was dropped from the README requirements in the code-first rewrite, but the pipeline needs it: every round is committed to a local repository in `code/`, and revision rounds read `git diff` to keep the user's own edits. The README lists it, and the preflight tool check now tests Node, npm and Git and stops with a clear message if Git is missing.

## [0.5.3] - 2026-10-10

### Added
- **A share build for reviewers.** Every project now also produces a `share/` folder that opens by double-click from disk, offline, with nothing to install, so stakeholders of any tech level can review. Plain HTML projects ship `share/` as a self-contained copy plus `share.zip`; React + Vite projects get a separate single-file build (`share/index.html`, hash routing, embedded fonts and assets, mock data). New reference `_shared/references/share-build.md` lists what `file://` blocks and the rule for each.
- **A `file://` open test.** The Auditor opens `share/index.html` from disk, walks the journeys, and checks the console for blocked requests. The result (pass, pass with issues, fail, not verified, not supported) is in the audit and the final report; the pipeline never says a share file works unless this test passed.

### Changed
- **Plain HTML, CSS and JS is now the first, recommended stack** in the preflight question, with a note on each option about sharing and handoff. The plain HTML stack no longer uses Vite or ES modules (which browsers block from disk): classic scripts, relative links, no build step.
- Next.js cannot promise a double-click file; the preflight note and the final report say so and offer a static export or a hosted link.

## [0.5.2] - 2026-10-10

_This release was published for a short time as 0.6.0 and renumbered 0.5.2 to follow the numbering rule (last digit 0 to 9, then the middle number goes up). The content is the same._

### Changed
- **Code first. The Claude Design canvas is gone.** The pipeline's deliverable is a **working code project** in `code/` inside the client folder (its own local git repository, never pushed). The stack is chosen per project (see below); the reference layout is React + Vite + TypeScript + Tailwind CSS + React Router. Each platform declares a `code_target`: an app, a responsive prototype inside device or window frames, a real Manifest V3 extension project, HTML email templates, one route per social asset, slide components, or a fixed-size TV or kiosk stage with focus navigation and idle and reset behaviour.
- **Real interactions, tokens and frames.** Everything the references describe actually works (navigation, forms with validation, menus, dialogs, motion). Design tokens are CSS variables in `tokens.css` that Tailwind maps to. Every screen and state from the spec and the journeys is a registered **frame** reachable at `/frames/<slug>` with no manual steps, with a gallery at `/frames` and the journeys as ordered links at `/journeys`.
- **The style preview is a route of the project.** In the style step, the Design Agent scaffolds `code/`, adds `/style-preview` and starts the app with the preview tool, so the preview and the full build share one project and the preview components are reused. 3D references are built with `three` installed from npm.
- **Design systems are portable folders**, not Claude Design artifacts: `tokens.json`, `tokens.css`, a Tailwind theme, a brand book and, from Figma, React components, saved by default in `~/.claude/design-systems/<name>/` so any project can use them.
- **The Auditor and Coverage Agent test the running app.** The Auditor resizes the browser to each chosen viewport, clicks through the real app and the journeys, runs the build, reads the console and network, and checks the source against the new `code-quality.md` (distilled from Emil Kowalski's `mobile-native` and Jakub Krehel's accessibility, layout, typography and UI skills). The Coverage Agent checks frames by route and source file.
- **User edits are kept.** At the start of a revision round the Design Agent reads `git status` and `git diff` in `code/`, and keeps what you changed by hand.
- **Figma is an optional export.** After approval the pipeline asks whether to export to Figma. The Handoff Agent captures each frame from the running app (or builds it natively if capture isn't available), binds the tokens as variables, writes motion notes from the real code, puts requirement IDs, journey steps and the source file on each frame, and wires prototype links in journey order. The Figma connector is checked only then, or when you start from or reference a Figma file.
- **The stack is asked per project**, with a short note on when to use each: React + Vite + Tailwind (apps, dashboards, prototypes), Next.js (SEO, marketing site plus app in one project), plain HTML, CSS and JS (small static pages), or your own (Vue, Svelte, Astro and so on). It is skipped for an existing code project (its stack is kept) and where every platform has its own fixed target.
- **Preflight checks Node and npm** (Node 20 or newer) instead of Claude Design and Figma. **Starting points** are now a brief, an existing code project (worked on in its own stack, on a `design-automation` branch), or a Figma file.
- New shared references `code-conventions.md` (layout, tokens, frames, running, quality gates, git) and `code-quality.md` (the code-level bar), the latter added to every platform's audit references.
- Renames: `design_url` → `dev_url` and `code_dir`, artboards → frames, the manifest's `code_file`, `route` and `source: existing`, and the review stage now centres on the running app.

### Notes
- The mobile, tablet and desktop outputs are web prototypes in device and window frames, not native code.
- The Design Agent now writes a full application each round, which is heavier work than drawing screens; consider overriding it to Opus for large projects (see `MODEL-OPTIMIZATION.md`).

## [0.5.1] - 2026-10-10

### Changed
- **User stories are replaced by user journeys.** The Story Agent is now the **Journey Agent**. After the spec is confirmed, it writes `user-journeys.md` for you to review: one **user flow** per goal, with the persona and goal, the entry point, each step's platform, `Screen / State`, user action and system response, the decision points, the error paths and exits, and a Mermaid flow diagram. Every platform in the scope must appear in at least one journey, and journeys that cross platforms (landing page → sign-up → dashboard) are written explicitly with their hand-off points.
- **Journeys feed the rest of the pipeline.** Journey screens and states use the same `Screen / State` names as the design frames. If a journey needs a screen or state the spec lacks, those spec gaps are added to the spec by the Brief Agent (marked `source: journey`) before you review. The Design Agent maps every artboard to the journey steps it satisfies, the Coverage Agent checks every journey step and every branch (error, empty, timeout, cancel) against the design and reports per journey, and the Handoff Agent wires the Figma prototype links in the order of the journeys' steps.
- The review flag is now `--skip-journeys` (was `--skip-stories`), and the saved stage, files and state fields are renamed (`journeys`, `user-journeys.md`, `skip_journeys`, `journeys_file`, `journeys_confirmed`, `covers_journeys`).
- New shared reference `profiles/_shared/references/user-flows.md`, distilled from Owl-Listener's `user-flow-diagram`, `journey-map` and `experience-map` skills.

## [0.5.0] - 2026-10-10

### Changed
- **Version renumbered from 0.4.11 to 0.5.0.** The content is identical to 0.4.11. The 0.4 series (0.4.0 to 0.4.11) added the platform scope with 16 platform profiles and clickable preflight questions, requirements, user stories and the coverage report, the style direction and preview as its own stage after the stories (with signature capture, interaction walk-through and 3D rebuilds for references), shared design guidance, the brief requested up front, and per-platform coverage. 0.5.0 marks that set as the new baseline.

## [0.4.11] - 2026-10-10

### Fixed
- **A chosen platform could be left out of the user stories.** When the brief described one platform (a signed-in dashboard) and said nothing about another (the product's landing page), the Brief Agent wrote requirements only for what the brief said, so the landing page had no requirements and the Story Agent had nothing to write stories from. Nothing checked that every chosen platform was covered.

### Changed
- **Every platform in the scope gets requirements.** Where the brief is silent about a platform, the Brief Agent now **derives** its requirements from the product itself (what it is, who it is for, its main features and flows), starting from each profile's new `derive_when_silent` hint (landing page, email, docs, deck, social). Each requirement carries its platform and a basis: `brief`, `derived` or `profile`, so you can see which are your brief's and which are the agent's proposal. If a platform has no brief-sourced requirements, it asks you before drafting them.
- **A Platform coverage table** in the spec shows, per platform, how many requirements come from the brief, are derived, or come from the profile. The Orchestrator won't show you a spec that skips a chosen platform, and tells you which platforms' requirements were derived.
- **Stories per platform.** The Story Agent writes stories for every platform (including visitor stories for a landing page and cross-platform journey stories such as landing page → sign-up → dashboard), groups them by platform, marks their basis, and reports stories per platform. The Orchestrator won't show a story list that skips a chosen platform.
- **Flows can cross platforms.** The spec's flows now include journeys from one platform to another.
- The Coverage report lists results per platform, so a platform with nothing designed shows up as Missing.

## [0.4.10] - 2026-10-10

### Changed
- **The style step now comes after the user stories.** The order is now: preflight (tools, brief, platforms, screen sizes) → brief and spec → user stories → **style direction and preview** → design. Before, you chose a design system or reference and saw a preview before the spec existed.
- **The preview shows the real product.** Because the spec is confirmed first, the style preview uses its most important screen with real copy and components, not a generic sample.
- **The brief can guide the choice.** If the spec's tone or constraints name a design system, brand guidelines or a reference, that option is marked as recommended.
- **No extra waiting.** For an image or website reference, the design starts with the approved tokens straight away and the reusable design system builds in the background. Only a Figma reference with components waits for the build.
- The style step is its own file (`references/direction.md`) and its own saved stage (`direction`), so a run can be resumed there. Canvas starts still skip it.

## [0.4.9] - 2026-10-10

### Added
- **"Use a reference" starts with a clickable choice of reference type**: a website URL, an image or screenshot, or a Figma file or frame. The website option lists three inspiration sources to help find a reference: Awwwards nominees (https://www.awwwards.com/websites/nominees/), Behance UI/UX galleries (https://www.behance.net/galleries/ui-ux) and Muzli search (https://search.muz.li/). They are shown again, as links, in the message that asks for the address.
- **Gallery pages are handled.** An Awwwards entry is followed to the real site. A Behance or similar project page is treated as images of the design, so the tokens come from the design and not from the gallery's own interface. A listing or search page isn't accepted as a reference; the pipeline asks for one project's link.

## [0.4.8] - 2026-10-10

### Fixed
- **Choosing "A brief or BRD" never asked for the brief.** The pipeline went straight to the platform question, and only asked for the brief later, in Stage 2, after platforms, screen sizes and style.

### Changed
- **The brief is requested as soon as you pick it.** Right after the Figma and Claude Design checks, the pipeline asks you to paste the brief or point to your BRD or other documents (PDF, Word, Markdown or text; drag a file into the chat), reads all of it, saves it as `brief-source.md`, and gives a two-line read-back so you can see it was understood. A one-sentence description is accepted if you have nothing fuller.
- **The later questions use it.** The platform question marks the platforms your brief implies as recommended, and the style preview takes its one-line product description from the brief instead of asking for it.
- Stage 2 no longer asks for the brief again, except on a resumed run where `brief-source.md` is missing.

## [0.4.7] - 2026-10-10

### Changed
- **3D references are rebuilt with hand-modelled elements and custom shaders.** When the reference draws a WebGL scene, the preview no longer settles for generic low-poly shapes. The Design Agent models each distinct object itself (displaced icosahedra for rocks, stacked cones for crystals, spheres with rims and inset windows, rings, terrain) and writes the shaders the look needs: stepped toon shading with a rim light, inverted-hull outlines, fresnel glow, depth haze, grain and light rays. Everything is generated by code, with no models, textures or images downloaded from the reference.
- **It compares and refines.** When a browser is available, the agent opens its own preview next to the reference screenshots and compares silhouettes, shading style, palette, depth, composition and the camera result after each click, then refines for up to three passes and reports what still differs.
- New shared reference `profiles/_shared/references/webgl-3d.md` (setup and fallbacks, modelling recipes, shader snippets, camera poses with the measured easing, the compare loop, and a keep-it-light rule). It is passed to the Design Agent only when the reference is WebGL or the brief asks for a 3D hero.

## [0.4.6] - 2026-10-10

### Fixed
- **A 3D reference came out as a flat 2D illustration, and its click-through behaviour was missing.** On the Cyera reference, the real site draws a WebGL scene and each click on the main button advances a stepped intro (the 3D camera pans sideways, the headline splits, a progress bar and Skip appear), but the preview only recreated the first screen, with 2D shapes.

### Changed
- **The reference step now walks the interactions.** For a website, the Design System Agent clicks the primary button and other primary controls step by step (up to about six steps), recording for each step the trigger, a screenshot, what changed (camera move, slide, text swap), whether click, scroll or time drove it, the progress indicator, how the button changed, and the timing and easing. It also records how the page is drawn (HTML, SVG, video or a WebGL canvas, and which libraries) so 3D motion is recognised as 3D.
- **The preview rebuilds 3D as 3D.** When the reference is a WebGL scene, the Design Agent builds a lightweight real 3D scene (Three.js from an allowed CDN) with low-poly shapes in the reference's palette, depth layers, a moving camera and pointer parallax, falling back to 2D CSS if WebGL is unavailable. The reference's custom models, textures and shaders are not reproduced, and the preview says so.
- **The preview is a working click-through.** The first two or three steps are built so the main button advances with the same transition, duration and easing as the reference, with its button change, progress indicator and Skip control.
- **The build keeps the behaviour.** Each captured interaction step becomes a state artboard (for example `Intro / Step 2 - Orbit`) with the transition noted for the handoff, and the Auditor flags a captured behaviour that is missing from the design as major.

## [0.4.5] - 2026-10-10

### Fixed
- **A website reference produced a preview with only its colours.** The reference step measured colours, type, spacing and radii, so a site with an animated illustrated hero and a distinctive button came out as "the same colours on a generic page". On a site that opens with a long preloader it could also measure the loader instead of the real page.

### Changed
- **The reference step now captures signature elements**, not only tokens: the hero's composition, the primary and secondary button and navigation styles (including hover and pressed states and any inner icon tile), and what moves. It uses screenshots of the loaded page at desktop and mobile widths.
- **It waits for the real page.** For a website, the Design System Agent waits for the preloader to finish (up to about 60 seconds) before measuring, and says so when the page never finishes loading.
- **The style preview carries them over.** The preview recreates the hero composition, shows the button and navigation with their hover states, and animates what moves (CSS keyframes and transitions, with a reduced-motion fallback). WebGL, video and 3D scenes can only be approximated, and the preview says which parts were approximated or left out in a "Carried over" panel. The artwork is redrawn in the same style, never copied.
- **You are told what was captured before you approve.** The approve step lists what the preview carries over and what it could only approximate.
- The signature elements are saved with the approved tokens (`preflight.preview.signature`) and passed to the Design Agent for the build, and `grounding.md` explains why colours and type are not the whole look.

## [0.4.4] - 2026-10-10

### Changed
- **Preflight questions are clickable.** Platform scope is now two short click-to-choose steps (product family, then platforms) and screen sizes are one question ("use the recommended sizes", or pick for each platform). No more lists to type numbers into.
- **Profiles are automatic rules.** Choosing a platform applies its required screens and states, design guidance, audit checks and reference files without any further questions. Preflight asks only the **screen sizes**.
- **Content settings come from the brief.** Sections, primary CTA, pages, chart types, roles, languages, hardware, dark mode and similar settings are read from the brief or BRD by the Brief Agent, shown in a new **Scope settings** table in the spec (marked brief, inferred or default) for you to correct, and saved to the state file when you confirm the spec.
- Profile options now carry `ask`: `preflight` (a clickable question), `brief` (read from the source) or `auto` (single choice). `profiles/index.json` groups the platforms into four families for the first click.

## [0.4.3] - 2026-10-10

### Added
- **Visual polish guidance** (`polish.md`, from `better-ui`): concentric radii, optical alignment, shadows versus borders, image outlines, icon stroke and outline/fill states, and motion values (press, stagger, exit, icon cross-fade). Applied by the Design Agent, tested by the Auditor as a **minor-only** polish pass (a state carried by motion alone is major), and written into the Figma file as developer **motion notes** by the Handoff Agent.
- **Six more shared references**, distilled from designer-skills: `states-and-feedback.md` (errors, loading, feedback), `forms.md`, `data-viz.md`, `dark-mode.md`, `localization.md` (text expansion and RTL), and `handoff-spec.md` (what a developer needs next to each frame). Each is listed only in the platform profiles it applies to, so a platform reads only what is relevant (about 5-20 KB of reference per platform).
- Where sources disagreed, the files pick one rule: validate a field on leaving it but never disable submit; error toasts persist while plain success toasts can auto-dismiss; stagger only infrequent entrances.

### Changed
- The Handoff Agent receives `handoff-spec.md` and `polish.md`, and adds motion notes and a fuller state list to its annotations.
- `NOTICE.md` credits the added sources.

## [0.4.2] - 2026-10-10

### Changed
- **The shared reference guidance now reaches the agents that build the design, not only the Auditor.** The Design Agent reads `grounding.md` plus each platform's reference files (interface quality, visual critique, landing page, mobile) before the style preview, the first build and each revision round, so the first draft is built to the same thresholds the audit tests. The Design System Agent is given `grounding.md` for token extraction. Each agent reads only the files it is given.
- `profiles/README.md` documents which agents consume which files.

## [0.4.1] - 2026-10-10

### Removed
- The `design-continue` skill (`/design-continue`). `/design-pipeline` already finds `design-pipeline-state.json` and resumes from the saved stage, and replying "done" in the same session does the same job. Resume handling for a new session (re-run the Figma and Claude Design checks, keep the saved scope and direction, start a fresh Design Agent) moved into Stage 0 of the `design-pipeline` skill.

### Changed
- Review prompts and the README now say to reply **done** (or run `/design-pipeline` to resume) instead of `/design-continue`.

## [0.4.0] - 2026-10-10

### Added
- **Platform scope in preflight.** Choose from 16 platforms (web app, dashboard, landing page, e-commerce, mobile app, tablet app, desktop app, browser extension, design system, email, presentation deck, social media, standalone flow, docs/help center, smart TV, kiosk/ATM/self-service machine) or describe another. Each platform asks its own short questions with defaults: device frames, breakpoints, navigation, sections, density, input methods, hardware touchpoints, languages, accessibility mode, and any compliance standard to follow. Answers set the artboard sizes and the audit checks.
- **Platform profiles** (`profiles/<id>/profile.json`): a platform is one data file, so new platforms need no code change. Format in `profiles/README.md`.
- **Quick style preview.** When styling from a reference (image, screenshot, website URL or Figma), tokens are measured first and a preview of *your* product in that look is shown before the slow design-system build. Approve, tweak or try another reference. The full build then runs **in the background** while you continue with the brief. "Tokens only" and "this project only" options skip or shrink the build. The creative direction can be previewed too.
- **Numbered requirements.** The spec lists requirements `R-1…` traced to the brief, and every screen and state references them.
- **User stories gate** (`story-agent`). Stories with acceptance criteria are written for you to review before design starts. Skip with `--skip-stories`.
- **Coverage report every round** (`coverage-agent`). Compares the design with the original brief or BRD and reports **Done / Missing / Added**, split into profile-standard additions and unrequested additions. Runs in parallel with the audit. Missing "must" requirements go into the next round by default.
- **Start from an existing canvas.** A Claude Design canvas or Figma file can be the starting point; the Brief Agent writes the spec from what's there, then the pipeline audits and fills gaps.
- **Artboard manifest** (`design-manifest.json`) mapping every artboard to its requirements, stories and viewport, used by coverage and handoff.
- **Shared reference guidance** in `profiles/_shared/references/`, distilled from open-source skills (see `NOTICE.md`).

### Changed
- The Auditor runs each platform's checks at every chosen viewport, and reports platform checks passed.
- The Design Agent designs every screen at every chosen viewport and states at the primary viewport.
- The Handoff Agent organises Figma pages per platform and records requirement and story IDs on frames.
- The Design System Agent accepts a website URL as a reference.
- Cost figures removed from `MODEL-OPTIMIZATION.md`, `AGENT-MODEL-REFERENCE.md`, `SKILL.md` and the plugin description. Earlier versions quoted dollar amounts and percentage savings (and the figures disagreed with each other); they were estimates, not measurements.

### Not included
- Two-way sync between a code folder and the canvas is planned for a later version. `design-manifest.json` has a reserved `code_file` field for it.

### Compatibility
- State files from 0.3.0 still load. A run without `scope` asks the platform questions on resume.

## [0.3.0] - 2026-10-03

### Added
- **Model Optimization** — Task-specific Claude model assignment for all agents
  - Brief Agent: Opus 5.5 (complex reasoning for spec generation)
  - Design Agent: Sonnet 5.5 (efficient creative design generation)
  - Auditor Agent: Opus 5.5 (rigorous WCAG + heuristic analysis)
  - Design System Agent: Opus 5.5 (precision-critical token extraction)
  - Handoff Agent: Sonnet 5.5 (efficient Figma translation)
- `MODEL-OPTIMIZATION.md` — Detailed rationale, cost analysis, and quality trade-offs
- `AGENT-MODEL-REFERENCE.md` — Quick override guide and troubleshooting
- Model strategy documented in `SKILL.md` with cost-benefit table

### Changed
- Agent frontmatter: `model: inherit` → explicit per-agent model assignment
- Plugin description updated to highlight cost optimization (~50–60% savings)

### Benefits
- **Cost Reduction:** ~50–60% cheaper per pipeline run ($12–28 vs. $35–65 for all-Opus)
- **Quality Maintained:** Critical stages (Brief, Audit, System) still use Opus
- **Speed Improved:** Design revisions faster with Sonnet's efficiency
- **Flexibility:** Easy to override models per project or task

### Compatibility
- ✅ Fully backward compatible — all agents remain in pipeline
- ✅ Existing state files continue to work (`design-pipeline-state.json`)
- ✅ No changes to skill interfaces or agent outputs

---

## [0.2.0] - Initial Release

### Features
- Orchestrator skill for managing the full design pipeline
- Brief Agent for structured spec generation from rough briefs
- Design Agent for multi-artboard Claude Design canvas creation
- Design Auditor for usability heuristics and WCAG AA testing
- Design System Agent for design token extraction from references
- Handoff Agent for exporting designs to native Figma files
- Built-in review loop with Claude Design comments and edits
- State file for pipeline resumability across sessions

### Documentation
- Comprehensive README with setup and usage instructions
- Agent specifications for each stage
- State file format documentation
- Preflight checklist reference

---

## Release Notes for v0.3.0

### What's New?

**Model Optimization** is the headline feature. Every agent now runs on the Claude model that best fits its task, cutting pipeline costs in half while maintaining quality.

**Before v0.3.0:**
- All agents inherited the same model from the Orchestrator
- Default: Opus 5.5 across all stages
- Cost: ~$35–65 per pipeline run
- No fine-tuned control per agent

**After v0.3.0:**
- Each agent has an optimal model: Opus for reasoning-heavy stages, Sonnet for creative/structured work
- Cost: ~$12–28 per pipeline run
- Quality unchanged on critical stages
- Full flexibility to override per project

### Migration Guide

No action required! Existing runs and state files work unchanged. If you want to customize models:

1. Open the agent file (e.g., `agents/design-agent.md`)
2. Change the `model:` field in the frontmatter
3. Next run will use the new model

See `AGENT-MODEL-REFERENCE.md` for override recommendations.

### Key Files

- 📊 `MODEL-OPTIMIZATION.md` — Full strategy, cost analysis, quality trade-offs
- 🔧 `AGENT-MODEL-REFERENCE.md` — Quick reference and override guide
- 📋 `SKILL.md` — Model strategy table in the Orchestrator

### Performance Expectations

| Metric | Change |
|--------|--------|
| Cost per run | -50–60% |
| Pipeline speed | Slight improvement (faster revision rounds) |
| Design quality | Unchanged |
| Audit rigor | Unchanged (still Opus) |

### Known Limitations

None. All agents work as before; only the model assignment has changed.

### Next Steps

1. Install v0.3.0: `/plugin install design-automation@design-team`
2. Run on a typical project to compare costs
3. Override models as needed per project (see AGENT-MODEL-REFERENCE.md)

### Questions?

See `MODEL-OPTIMIZATION.md` for detailed rationale and cost scenarios.
