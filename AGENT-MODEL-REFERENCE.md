# Agent model reference (v0.4.0)

Quick reference for model assignments and when to override them. The reasoning is in `MODEL-OPTIMIZATION.md`.

| Agent | Model | Runs when | Override? |
|---|---|---|---|
| `design-system-agent` | Opus 5.5 | Style step (Stage 2c): `tokens` mode (fast), then `full` mode in the background after the style preview is approved | Sonnet for a simple reference, if you check the tokens |
| `brief-agent` | Opus 5.5 | Stage 2, and when answers or edits come back | Keep Opus |
| `journey-agent` | Sonnet 5.5 | Stage 2b (skipped with `--skip-journeys`) | Opus for large BRDs |
| `design-agent` | Sonnet 5.5 | Style preview, round 1, every revision round | Opus for brand-critical work |
| `design-auditor` | Opus 5.5 | After every design round | Keep Opus |
| `coverage-agent` | Opus 5.5 | After every design round (parallel with the auditor) | Keep Opus |
| `handoff-agent` | Sonnet 5.5 | Once, after approval | Opus if prototype links keep failing |

To change a model, edit the `model:` line in the agent's frontmatter, for example `model: claude-opus-5-5`. `model: inherit` uses the session's model.

## Troubleshooting

**Designs look generic.** Pick a design system or a reference in preflight and approve the style preview. If it still looks generic, try the Design Agent on Opus.

**The audit flags something that looks fine.** Open the audit report; every finding names the artboard, the element and the criterion. Dismiss it with a reason if it is wrong.

**The coverage report says something is Missing that is on the canvas.** The Coverage Agent checks the Design Agent's claims against the canvas. Check that the artboard really shows the requirement at every chosen viewport.

**The pipeline is slow.** The design-system build is the slowest step, and it runs in the background. Use "tokens only" for a lighter system, or "use for this project only" to skip the build. Fewer viewports and fewer review rounds also cut time.
