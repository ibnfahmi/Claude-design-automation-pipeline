# Changelog

All notable changes to the design-automation plugin are documented here.

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
