# Model assignments (v0.4.0)

Each agent runs on the Claude model that fits its task. The model is set in the `model:` line of each agent file's frontmatter.

| Agent | Model | Why |
|---|---|---|
| `brief-agent` | Opus 5.5 | Turns rough briefs, BRDs, existing code and Figma files into numbered requirements and finds the states nobody wrote down. Mistakes here carry into every later stage. |
| `journey-agent` | Sonnet 5.5 | Structured transformation from a confirmed spec into user flows (screens, decisions, error paths) for every platform. The human reviews the output, so speed matters more than depth. |
| `design-agent` | Sonnet 5.5 | Scaffolds the project, renders the style preview, and builds the whole app in code, then handles repeated revision rounds. The spec and journeys are precise, so it can work quickly. Writing a full app is heavier than drawing screens, so consider **Opus** for it (see below). |
| `design-auditor` | Opus 5.5 | Measures contrast, applies heuristics and platform checks, and clicks through every interaction. A missed issue reaches the client. |
| `coverage-agent` | Opus 5.5 | Compares the design with the original brief or BRD and decides what is Done, Missing or Added. It must read the source itself and judge whether an artboard really shows a requirement. |
| `design-system-agent` | Opus 5.5 | Measures colours, type and spacing from references. The tokens become the source of truth for the whole project. |
| `handoff-agent` | Sonnet 5.5 | Optional: structured capture of the approved running app into Figma frames and components. |

## About cost

The Opus-tier models cost more per token than Sonnet-tier models, so putting the creative and structural stages on Sonnet lowers the cost of a run compared with using Opus for everything. **How much it saves has not been measured.** Earlier versions of these documents quoted dollar amounts and percentage savings; those were estimates, not measurements, and they have been removed. To see what a run really costs, check your usage after a project.

Things that raise cost regardless of model: more design rounds, more platforms and viewports (more frames), and running the audit and coverage agents every round. Things that lower it: `--skip-journeys`, fewer viewports, and the lean "tokens only" design system.

## Overriding a model

Edit the `model:` line in the agent file. Valid values are model IDs such as `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-4-5-20251001`. Setting `model: inherit` makes the agent use the model of the session that started it.

Reasonable overrides:

- **Design Agent → Opus** for large apps, many platforms, brand-critical work, or complex 3D, where first-round code quality matters more than speed.
- **Handoff Agent → Opus** if Figma prototype links keep failing and you need stronger debugging.
- **Journey Agent → Opus** for large BRDs with many dependent requirements.
- **Design System Agent → Sonnet** for a very simple reference when speed matters. Check the tokens it returns.
- Keep the **Auditor** and **Coverage Agent** on Opus. Their output decides what gets fixed and what ships.

## History

- **0.6.0:** the pipeline became code first (no Claude Design canvas): the Design Agent builds a working project, the Auditor and Coverage Agent test the running app, and the Handoff Agent is an optional Figma export.

- **0.3.0:** replaced `model: inherit` with per-agent assignments.
- **0.5.1:** the Story Agent became the Journey Agent (user flows instead of user stories).
- **0.4.0:** added the Story Agent and Coverage Agent; the Design System Agent gained a fast `tokens` mode, and the Design Agent gained a `style preview` mode.
