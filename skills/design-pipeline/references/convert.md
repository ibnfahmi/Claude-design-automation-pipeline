# Convert to another stack (only when the user asks)

The pipeline always builds plain HTML, CSS and JS first (`code/`). When the user later asks to **convert** ("convert it to React", "make this a Next.js project", "I need this in Vue"), turn the finished project into the stack they name. Nothing here runs unless they ask.

## When to suggest it

Don't suggest conversion during a run. In the final delivery (Stage 7), add one line: *"If developers will take this over, ask me to convert it to another stack."* If the user asks which stack, give the short guide below and let them pick.

| Stack | Use it when |
|---|---|
| **React + Vite + Tailwind** | The product is a web app or dashboard with many screens and shared state, or developers who work in React will take it over. A single-page app that runs and rebuilds instantly, no server needed. Also gets a one-file `share/index.html` that opens by double-click. |
| **Next.js** | A real marketing site or SEO matters, or a landing page and a signed-in app live in one production-style project, with routing by folders and server rendering. Needs a server, so it can't promise a double-click file. |
| **Other** (Vue, Svelte, Astro, ...) | The team already uses it. Name it and the conventions of that stack are followed; the pipeline says whether it can produce a double-click file. |

## How to convert

1. Ask which stack if it isn't clear (AskUserQuestion with the three options above), then confirm in one line what will happen: *"I'll create a new `code-<stack>/` project next to `code/` from the finished HTML project. `code/` stays untouched."*
2. Make sure `code/` is committed and the latest round is approved or at least built. Convert the **latest** state, including the user's direct edits and applied review comments.
3. Start `design-agent` in **convert mode** (see `design-agent.md`) with the target stack, `design-manifest.json`, the spec, the journeys (if any), the platform scope and the reference files for that stack (`code-conventions.md`, `share-build.md`, `code-quality.md` and the platform references).
4. When it returns, check its GATES (build passes, every frame renders, frame count equals the manifest's). Run Stage 3b on the converted project (the audit only if `skip_audit` is false; coverage always) and compare the frames visually with the HTML original: a screen that differs is a finding for the Design Agent, not something to hand over.
5. Save `conversions: [{stack, dir, round}]` in the state file. Rebuild `share/` from the converted project only if the user wants the review page to follow it; otherwise the review page keeps tracking `code/`. Tell the user plainly which folder is now the one to work in.
6. Later feedback and review comments apply to the project the user says is the main one (`active_code_dir` in the state file, `code/` by default). Don't keep both in step unless asked.
