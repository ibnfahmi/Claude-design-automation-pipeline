# Changelog

All notable changes to the design-automation plugin are documented here.

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
