# Agent Model Reference (v0.2.0)

Quick reference for model assignments and when to override them.

## Quick Reference Table

| Agent | Model | Exec Time | Cost/Run | Why This Model | Can Override? |
|-------|-------|-----------|----------|---|---|
| Brief | Opus 5.5 | ~3-5 min | $1.50–3 | Complex reasoning for edge-case discovery | ⚠️ Only if brief is extremely simple |
| Design | Sonnet 5.5 | ~5-10 min | $2–5 | Creative generation + revision speed | ✅ Upgrade to Opus for critical brands |
| Audit | Opus 5.5 | ~5-8 min | $3–5 | Rigor on WCAG/heuristics (no compromise) | ❌ Keep Opus always |
| System | Opus 5.5 | ~3-5 min | $1.50–4.50 | Precision extraction (used only in preflight) | ⚠️ Downgrade to Sonnet if budget tight |
| Handoff | Sonnet 5.5 | ~3-5 min | $1–2 | Structured translation (not creative) | ✅ Upgrade to Opus for automation debugging |

## When to Override

### Upgrade to Opus
- **Design Agent:** Working with strict brand guidelines; first-round quality is critical
- **Handoff Agent:** Prototype links aren't working; Opus can debug Figma connector issues better
- **Brief Agent:** Extremely complex product with many flows; worth the 2-3 extra minutes
- **System Agent:** Brand has complex token patterns; precision matters more than speed

### Downgrade to Sonnet
- **System Agent:** Only if preflight speed is critical and design system is straightforward
- **Audit Agent:** ⚠️ **Not recommended.** Audit quality directly affects deliverable; keep Opus.

### Stay at Current
- **Brief, Audit, Design, Handoff:** All are optimized for typical design projects.

---

## Model Capabilities Quick Facts

### Opus 5.5
- Best reasoning for complex problems
- Most reliable on edge cases and nuanced judgment
- Excellent at instruction-following and spec generation
- ~3x cost of Sonnet
- ~100K token window

### Sonnet 5.5
- Strong creative capability
- Excellent efficiency on structured tasks
- Good multi-turn performance
- ~1.3x cost of Haiku
- ~100K token window

### Haiku 4.5
- Fast and cheap
- Acceptable for very simple tasks
- Not recommended for design pipeline (too constrained)

---

## Cost Scenario Calculator

**Typical project (1 round):**
- Brief: 1 run, 50K tokens, Opus → $1.50
- Design: 1 run, 300K tokens, Sonnet → $3
- Audit: 1 run, 100K tokens, Opus → $3
- Handoff: 1 run, 100K tokens, Sonnet → $1
- **Total: ~$8.50**

**Complex project (3 design rounds):**
- Brief: 1 run, Opus → $1.50
- Design: 3 runs, ~150K tokens each, Sonnet → ~$4.50
- Audit: 3 runs, ~100K tokens each, Opus → ~$9
- Handoff: 1 run, Sonnet → $1
- **Total: ~$16**

**vs. All-Opus baseline (~$45–50 typical):**
- Savings: **~65–82%**

---

## Implementation Details

Each agent has a frontmatter `model:` field:

```yaml
---
name: brief-agent
model: claude-opus-5-5
---
```

To change a model, edit the agent file and update the `model:` line. Models should follow the format `claude-{model}-{version}`.

Valid models:
- `claude-opus-5-5`
- `claude-sonnet-5-5`
- `claude-haiku-4-5-20251001`

---

## Troubleshooting

**"My designs look generic" →** Upgrade Design Agent to Opus, or provide a Design System reference.

**"Audit is flagging things that aren't wrong" →** Opus is correct 99% of the time; review feedback before dismissing.

**"Pipeline is too slow" →** Most time is in revision rounds. Design iterations are expected; focus on feedback quality.

**"I need the Figma file faster" →** Handoff is already optimized; parallelization with Orchestrator isn't possible.
