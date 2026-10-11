# Build in phases (large projects)

Building every feature of a large product in one go costs a lot of tokens and time, and the user mostly wants a few working features to judge the solution. So for large projects the pipeline offers to **split the build into phases**: the user picks the major features for Phase 1, judges the working result, and then says "continue" to get the list of what is left for Phase 2, and so on.

The spec always stays complete (every requirement, every feature). Only what is **built, journeyed, audited and published** is limited to the chosen features.

## Features come from the spec

The Brief Agent's spec has a **Features** table (see `brief-agent.md`): each major product feature with an ID (`F-1`…), a one-line description, the requirement IDs it contains, a size (S / M / L), what it depends on, and which feature is the core flow. `F-0 Foundation` is always present: the design tokens, the app shell, navigation, the base components and any sign-in shell the product needs. Foundation is built in Phase 1 automatically and is never a choice.

## When to offer it (Stage 2a, right after the spec is confirmed)

Count the features other than Foundation. The project is **large** when it has **6 or more features**, or **30 or more requirements**, or the spec lists **25 or more frames**. Below that, don't ask: build everything in a single phase (the user can still say "split it into phases" at any point before the build starts).

For a large project ask once with AskUserQuestion: *"This is a large product. Build it in phases so you can judge a few working features first?"* (header: `Phases`):
1. **Yes, build in phases (Recommended)** — "You pick the major features for Phase 1. When it works, say 'continue' and I'll list what is left for Phase 2. Uses far fewer tokens per step."
2. **No, build everything at once** — "One long build of all features. Slower and uses a large number of tokens."

Save `phased: true|false` in the state file.

## Choosing the features of a phase

1. Show the features as a compact table: ID, name, one line, size, depends on. Say which ones you recommend for this phase and why: **the smallest set that gives a working end-to-end slice of the core flow** (Foundation plus the core feature and whatever it depends on). Mark those `(Recommended)`.
2. Ask with AskUserQuestion, `multiSelect: true`, **four features per question** (at most four questions, header like `Phase 1 (1/2)`). Each option is `F-n name` with its one-line description and size. If there are more than 16 features, merge small related ones into themes first so they fit, and tell the user what you merged. For phases after the first, say that typing "all" (via Other) selects everything that is left.
3. If a chosen feature depends on one that was not chosen, add the dependency and tell the user in one line.
4. If nothing is chosen, use the recommended set.
5. Save the phase in the state file: `phases: [{"n": 1, "features": ["F-0","F-1","F-3"], "status": "planned"}]` and `current_phase`.

## What a phase changes in the pipeline

- **Journeys (Stage 2b):** the Journey Agent writes journeys **only for the phase's features** (append new `J` numbers in later phases; never renumber). A journey that runs into a feature from a later phase ends at that boundary and is marked "continues in Phase N".
- **Build (Stage 3):** the Design Agent builds only the phase's features, plus Foundation in Phase 1. Navigation and entry points to features that are not built yet appear as visibly disabled **Planned** entries (no empty pages, no fake data), so the product still looks whole. Later phases run in **add phase** mode on the same `code/` project (see `design-agent.md`): same design system, same conventions, nothing existing is rebuilt.
- **Manifest:** every frame records its `feature` and `phase`.
- **Audit (Stage 3b):** the Auditor tests the frames in the manifest, which are the built ones.
- **Coverage:** requirements of features that belong to a later phase are **Deferred (later phase)**, not Missing. Missing means "in this phase and not built". The summary reads `Phase <n> of <m>: Done <x> · Missing <y> · Deferred <z> · Added <w>`. Planned navigation entries are not "Added".
- **Review page:** republished after every phase to the same link.
- **Style direction:** chosen once, kept for every phase.

## Finishing a phase and continuing

When the user approves a phase (Stage 4), run Stage 5 (production check). Offer the Figma export (Stage 6) only after the **last** phase, or if the user asks. Then give a **short phase summary** instead of the full delivery: what was built, how to run it, the share file, the review page, the audit and coverage results. If features remain, set `stage: "phase_done"`, mark the phase `done`, and end with: *"Phase <n> is built. <k> features remain. Say 'continue' to plan Phase <n+1>."*

**"Continue" means any wording with that sense**: "continue", "continue building", "next phase", "go on", "keep going", "what's next", "let's do the next one". When the stage is `phase_done` (also when the user says it during review of a finished phase, which counts as approving that phase):
1. Take the remaining features (not in any earlier phase). Show them in the same table and ask the selection questions above for Phase `n+1`, again recommending the best next slice.
2. Ask about new journeys for these features only if journeys are on (they follow the saved answer; don't re-ask the optional-steps question).
3. Run **add phase** mode, then Stage 3b, then Stage 4 as usual.

Anything else the user says in `phase_done` is feedback on the finished phase: treat it as a normal change request (Stage 4) and keep the phase open.

When the last feature is built and approved, run the full delivery (Stage 7) with the cumulative summary: all phases, all features, final results.

## Resuming

A run whose `stage` is `phase_done` resumes by showing the "Phase <n+1>" selection straight away. A run in the middle of a phase resumes at its stage as usual, keeping `phases` and `current_phase`.
