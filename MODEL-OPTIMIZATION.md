# Model Optimization Guide (v0.2.0)

## Overview

The design automation pipeline now uses task-specific model selection to balance performance, quality, and cost. Each agent is assigned the most suitable Claude model based on its specific requirements.

## Model Selection Rationale

### Brief Agent → **Claude Opus 5.5**

**Task:** Parse unstructured design briefs into comprehensive structured specs with interaction states.

**Why Opus:**
- Handles complex natural language understanding of ambiguous briefs
- Generates precise clarifying questions when requirements are missing
- Builds complete interaction matrices requiring deep reasoning about edge cases
- Must infer implicit states (empty, loading, error, disabled) that aren't explicitly mentioned

**Task Complexity:** High reasoning, moderate speed requirement  
**Volume:** Low (1-2 runs per project)

---

### Design Agent → **Claude Sonnet 5.5**

**Task:** Generate multiple artboards and interaction states as a Claude Design canvas.

**Why Sonnet:**
- Balanced capability for creative design generation at scale
- Efficiently handles multi-artboard generation and revision rounds
- Strong enough for design decisions but faster than Opus
- Revision rounds benefit from Sonnet's improved efficiency
- Cost savings on repeated iterations (rounds 2+)

**Task Complexity:** Moderate reasoning + creative work, speed important  
**Volume:** High (multiple rounds, many artboards)

---

### Design Auditor → **Claude Opus 5.5**

**Task:** Evaluate designs against usability heuristics, WCAG 2.1 AA, and interaction completeness.

**Why Opus:**
- Most rigorous analysis required in the pipeline
- Must measure contrast ratios and validate precise accessibility standards
- Evaluates against Nielsen's 10 usability heuristics (nuanced judgment required)
- Clicks through interactions and maps to spec — no room for misses
- Quality of audit directly affects final client deliverable

**Task Complexity:** High analytical rigor, quality is critical  
**Volume:** Low-medium (1 per design round)

---

### Design System Agent → **Claude Opus 5.5**

**Task:** Extract design tokens (colours, type, spacing) from reference images or Figma files.

**Why Opus:**
- Precision-critical: extracted tokens become source of truth for design coherence
- Must measure pixel-accurate colours and spacings
- Complex reasoning to organize patterns (e.g., color roles: primary, secondary, error, success)
- Needs to infer intent from visual patterns (e.g., detect hover states, disabled styles)
- Errors here cascade through all downstream designs

**Task Complexity:** High visual analysis, precision critical  
**Volume:** Low (preflight stage only)

---

### Handoff Agent → **Claude Sonnet 5.5**

**Task:** Translate approved Claude Design into native Figma frames, components, and prototypes.

**Why Sonnet:**
- Structured, deterministic transformation (design → Figma JSON)
- Strong enough to handle Figma connector API calls and component creation
- Speed is valuable (client is waiting for final deliverable)
- Fewer ambiguous decisions compared to design generation
- Falls back cleanly if prototype links fail (annotations remain)

**Task Complexity:** Moderate structured translation, speed matters  
**Volume:** Low (one final handoff)

---

## Cost-Benefit Analysis

### Pricing Context (as of Feb 2025)

- **Opus 5.5:** ~3x Sonnet, ~10x Haiku
- **Sonnet 5.5:** ~1.3x Haiku, optimal balance
- **Haiku 4.5:** Fastest, cheapest, lower quality on complex tasks

### Estimated Cost per Pipeline Run

| Agent | Model | Runs/Project | Estimated Tokens | Tier Cost | Notes |
|-------|-------|---|---|---|---|
| Brief | Opus | 1-3 | 50K-100K | $1.50–3.00 | Typically 1 run, 1-2 if questions |
| Design | Sonnet | 2-5 | 400K-1M | $4–10 | 1st draft + revisions |
| Audit | Opus | 2-5 | 150K-300K | $4.50–9.00 | Per design round |
| System | Opus | 0-1 | 50K-150K | $1.50–4.50 | Only if preflight creates system |
| Handoff | Sonnet | 1 | 100K-200K | $1–2 | Final, one-time |
| **Total** | **Mixed** | **6-15** | **750K–1.75M** | **~$12–28** | **vs. All-Opus: ~$35–65** |

**Savings: ~50–60% cost reduction** vs. all-Opus approach while maintaining quality on critical stages.

---

## Quality Trade-offs

### Unchanged Quality

- **Brief accuracy:** Opus still owns spec structuring — no compromise
- **Audit rigor:** Opus still evaluates every interaction and WCAG criterion
- **Design system fidelity:** Opus still extracts tokens precisely
- **Handoff completeness:** Sonnet handles final Figma translation; failing prototype links fall back to annotations

### Acceptable Trade-offs

- **Design creativity:** Sonnet is well-suited for design generation; the spec is precise enough to keep designs on-brand
- **Design revisions:** Sonnet efficiently handles feedback; most revisions are localized (edit one artboard, not rebuild)
- **Handoff speed:** Sonnet is faster than Opus for this deterministic task; client gets file sooner

---

## When to Override

Override per-agent models if:

1. **Project complexity:** Exceptionally complex briefs → Brief Agent to Opus is already optimal
2. **Design fidelity:** Brand-critical work → consider all agents to Opus for uniformity
3. **Budget constraints:** Reduce to Sonnet-only or Haiku for exploratory/internal work
4. **Speed priority:** Switch Design Agent to Opus if revision speed is less important than first-round quality

---

## Migration Notes

All agents previously used `model: inherit` (inherited from Orchestrator). Now each specifies its model in the agent frontmatter. To revert, set all agents back to `model: inherit` and specify the model in the Orchestrator's `agent()` calls.

---

## Future Optimizations

- **Conditional models:** Switch Design Agent to Opus for brands with strict guidelines
- **Feedback-loop learning:** Track which agents produce revisions; weight their model selection
- **Parallelization:** Run all agents on same Opus if cost is secondary to speed
