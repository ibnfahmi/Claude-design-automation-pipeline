# Time estimate before a build

When a build starts, tell the user how long it is likely to take. Do it at the start of **Stage 3** (build) and of every **add phase** run, before starting the Design Agent, in two or three lines. It is an estimate, and it says so. The point is that the user can leave, come back, or cut the scope before a long run starts.

## Count what is being built

From the confirmed spec and the current phase's features, count:
- **Frames:** count by screen **type** (one representative per type, `screen-types.md`), not by instance: the screens plus the interaction states of the phase's features (the spec's Screens and Interactions-and-states rows; Foundation counts in Phase 1). If the spec has no clean count, use the number of distinct `Screen / State` names.
- **Viewports:** how many screen sizes were chosen, across platforms.
- **Languages:** the number in `scope.languages`.
- **Heavy items:** a WebGL or 3D hero, heavy motion, charts, maps, a design system being built in the background, a Figma reference with components.
- **Steps that follow:** whether the audit is on (`skip_audit`), whether the coverage report is on (`skip_coverage`), whether a stress test was asked for, the share build and its file-open test, republishing the review page.

## Working defaults

These are **unmeasured starting values**, not benchmarks. They come from the shape of the work, not from timing real runs, so use them only until real timings exist (next section) and give a wide range.

| Part | Rough time |
|---|---|
| Scaffold the project (Phase 1 only, and only when Stage 2c did not already scaffold it for a preview) | 3 to 6 minutes |
| Build, per frame (a screen with its interactions counts as 3 to 5 minutes, a simple state as 1 to 2) | about 1.5 to 3 minutes on average |
| Each extra viewport | adds about 10% of the build |
| Each extra language | adds about 20% of the build |
| A WebGL or 3D hero | adds 10 to 25 minutes |
| Share build and its file-open test | 2 to 5 minutes |
| Audit (if on) | 8 to 20 minutes, plus about 0.5 minute per frame |
| Coverage report (if on) | 3 to 8 minutes |
| Stress test (only if asked) | adds fixtures (5 to 10 minutes) and an audit pass |

Add the parts that apply. State the total as a range, the parts it is made of, and what it assumes, for example: *"Estimated time: about 45 to 80 minutes for Phase 1 (build 30 to 50, audit 12 to 22, coverage and share build 5 to 10). That is for 14 frames, 3 screen sizes and 2 languages. It's an estimate, not a promise; I'll tell you the actual time when it finishes."* Round to the nearest 5 minutes. If the total is over about 60 minutes, say it and offer to **cut it down**: fewer features in this phase, skip the audit, or fewer screen sizes or languages. Don't ask a question unless the user wants to change something.

## Measure and learn

Record the time of every part so the next estimate is better. With Bash, note `date +%s` when a stage starts and when it ends, and compute the minutes. Save them in the state file under `timing`:

`{"rounds": [{"round": 1, "phase": 1, "frames": 14, "viewports": 3, "languages": 2, "estimated_min": [45, 80], "actual_min": {"scaffold": 5, "build": 41, "audit": 17, "coverage": 6, "share": 4, "total": 73}}]}`

When the build returns, tell the user the actual time in one line (*"Phase 1 took 73 minutes against an estimate of 45 to 80."*). From the second estimate on, **calibrate**: take the actual minutes per frame from the earlier rounds of this project (build time divided by frames) and use it, with a range of about plus or minus 25%, in place of the working defaults. The same goes for the audit and coverage times. Say that the estimate is based on the earlier rounds. If a part has no timing yet (a first audit, say), use the working default for that part and mark it as a guess.

Time only counts what the agents run. Time spent waiting for the user to answer or review is not part of it, and neither is a pause when a usage limit is reached; mention that limit if the estimate is long.

## Figma export (the `to-figma` skill)

Tell the user this before the Figma build starts, as a range with its parts and the words "an estimate". **Frames to build = selected frames × screen sizes already in the manifest × languages chosen** (each language is a full set).

**What the export costs, and what limits it.** Two things are counted: model turns (tokens) and **Figma tool calls**. A Full seat on a Professional plan is limited to **200 Figma tool calls per day and 10 per minute** (Figma's rate limits; the daily window appeared to be rolling 24 hours when it was reached), so the number of calls decides how big an export can be in a day.

| Part | Rough cost (measured on the 13-screen test, with the payload runner) |
|---|---|
| Setup (file, pages, variables, fonts) | a few calls |
| Packing, one `upload_assets` call for the payload, then the runner | 1 upload + 1 runner call for 13 frames (1,683 nodes in about 20 seconds); a bigger export needs one runner call per 15 to 30 seconds of work |
| Filling images | 1 `upload_assets` call per 60 pictures |
| Compare each frame (a Figma screenshot per frame, then the pixel difference) | **1 Figma call per frame**: the largest remaining part |
| Fixing failing frames | a few calls and turns per failing cause, not per frame |
| Overlay states (dialogs, menus over a page) | exported overlay-only: no extra build, one screenshot |

So an export of N frames needs roughly **N + 10 Figma calls** and a few dozen model turns. A 150-frame export fits in a day's allowance; a 200-frame one does not, so say so and offer to split it across days (by feature) or to compare a sample. Before the payload runner existed (builder and spec pasted into every call), one real export took about 1,040 turns and about 450 Figma calls.

Say that languages and the library multiply the cost, and that plain frames and one language are the cheap options.
