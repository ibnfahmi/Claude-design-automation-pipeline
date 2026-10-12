# Code-first output: conventions

The pipeline's deliverable is a **working code project**, not a canvas. The Design Agent builds it, the Auditor and Coverage Agent test the running app, and the user reviews it running in the browser. This file says how the project is laid out so every agent can find things. Follow it unless the user asked for a different stack.

## Where it lives

- A `code/` folder inside the client folder (the session's working directory). It is its own **local git repository**. Commit after every round; **never push** it anywhere.
- `design-manifest.json`, `design-spec.md`, the journeys and the reports stay in the client folder, next to `code/`.
- `.claude/launch.json` in the client folder holds the dev-server entry so the app can be started with the preview tool (see "Running it").

## Stack: plain HTML, CSS and JS by default

Every project is built as plain HTML, CSS and JS (`stack: html-css-js`), because it opens by double-click and every reviewer can use it. An existing code project keeps its own stack. Any other stack exists only as a **conversion the user asks for** (`convert.md`), built into a separate `code-<stack>/` folder. The rules in this file are written for the plain HTML stack first; the React layout further down applies to a converted React project, and other stacks use the equivalent. Use current stable versions, and check that the project loads cleanly (and, for a converted stack, that `npm run build` passes) before you hand it over. Node 20 or newer is needed for the preview server and for conversions.

| Stack | Notes |
|---|---|
| `react-vite-ts-tailwind` | Conversion target. As described below. Dev port 5173 |
| `nextjs` (conversion target) | App Router with TypeScript and Tailwind. Pages in `app/`, shared UI in `components/`, tokens in `app/tokens.css` imported by the root layout, client components where interaction is needed. The dev routes are `app/frames/[slug]/page.tsx`, `app/frames/page.tsx`, `app/journeys/page.tsx` and `app/style-preview/page.tsx` (the App Router treats folders that start with an underscore as private, so the dev routes have none). Dev port 3000 |
| `html-css-js` | A multi-page static site with **no build step and no bundler**, so it opens by double-click: `index.html` and one `.html` per page linked with relative paths, `styles/tokens.css` and plain CSS (no Tailwind), behaviour in classic `<script src>` files (no `type="module"`, no `fetch` of local files, data kept in a JS object), fonts in `fonts/` loaded by relative `@font-face`, `frames/<slug>.html` plus `frames/index.html` (the gallery), `journeys/index.html` and `style-preview.html`. For previewing, serve the folder with `npx --yes serve code -l 5173` (the `dev` script). The "build" gate is a check that every page loads and every relative link resolves. Dev port 5173 |
| other (the user typed it) | Follow that stack's own conventions and give it the same pieces: tokens as CSS variables, a frame for every `Screen / State` reachable without manual steps, a frames gallery, a journeys index, and a build that passes |

Every stack also produces a `share/` folder that opens by double-click; the rules and the test are in `share-build.md`.

The dev routes are `/frames`, `/frames/<slug>`, `/journeys` and `/style-preview` in every stack. They are review tooling; keep them out of the way of the real app's routes.

## Targets by platform

Each profile's `code_target` says what is built; the technology is always the project's own stack (plain HTML, CSS and JS by default). "The chosen stack" means the project's stack (plain HTML by default).

| Platform | Built as |
|---|---|
| Web app, dashboard, landing page, e-commerce, docs, flow, design system | An app in the chosen stack. A design-system project is a documented component library with a docs route per component |
| Mobile app, tablet app | A responsive web prototype in the chosen stack, shown inside device frames (status bar, notch or island, home indicator, safe areas). It is a prototype, not native code |
| Desktop app | A prototype in the chosen stack inside a window frame for each operating system. Not an Electron build unless asked |
| Browser extension | A real Manifest V3 extension project (`manifest.json`, popup and options pages built with Vite), whatever the stack, plus preview routes that render each surface at its real size |
| Email | HTML email templates (table layout, inline-friendly CSS) in `emails/`, whatever the stack, rendered by a preview route in light, dark and images-blocked views |
| Presentation deck | Slide components with keyboard navigation at a fixed 16:9 or 4:3 stage that scales to fit |
| Social media | One route per asset at its exact pixel size, so it can be exported as an image |
| Smart TV | A fixed 1920x1080 or 3840x2160 stage that scales to fit, with spatial (D-pad) focus navigation and a visible focus state |
| Kiosk | A fixed-size stage at the machine's screen size, with idle, timeout-warning and reset behaviour built in |

## Layout (React shown, for a converted project; the default plain HTML layout is in the stack table above)

```
code/
  package.json  vite.config.ts  tsconfig.json  index.html
  src/
    main.tsx  App.tsx            routes
    styles/tokens.css            design tokens as CSS variables (light and dark)
    styles/index.css             Tailwind layers and base styles
    components/                  reusable UI (buttons, inputs, cards, nav ...)
    platforms/<platform-id>/     that platform's pages and layouts
    frames/registry.ts           every frame: slug, name, platform, viewport, component, props
    frames/FrameGallery.tsx      the /frames gallery
    journeys/JourneyIndex.tsx    the /journeys index
    data/                        realistic mock data (no lorem ipsum)
    lib/
```

## Tokens

- All colours, type styles, radii, spacing, shadows and motion values are CSS variables in `tokens.css` (names by role: `--color-text-primary`, `--color-border-subtle`, `--radius-md`). A dark theme redefines them under `[data-theme="dark"]` when dark mode is in scope.
- Tailwind's theme maps to those variables. **No raw hex values, pixel sizes or font names in components**: they use tokens.
- When a design system folder was chosen, copy its `tokens.css` in and extend it; don't invent a parallel set.

## Frames: every `Screen / State` is reachable

The spec and the journeys name screens and states as `Screen / State` (for example `Home / Notifications open`). Each one is a **frame**:

- Register it in `src/frames/registry.ts` with a slug (`home--notifications-open`), the exact name, the platform, the viewport(s), the component and the props that put it in that state.
- It renders at `/frames/<slug>` with no app chrome, at its natural size, **without any manual steps** (state comes from props and mock data).
- The same component is also reachable in the real app through the real interaction (clicking the notification icon opens the dropdown).
- `/frames` is a gallery grouped by platform, with a viewport selector and a link to every frame.
- `/journeys` lists each journey from `user-journeys.md` with its steps as ordered links to the frames, so a reviewer can walk a journey step by step.

Viewports come from the scope: the primary viewport for states, and every chosen viewport for each screen. Make the app genuinely responsive (the frames at different widths are the same components), and use a device or window frame wrapper only where the platform has one.

## Languages

`scope.languages` lists the languages chosen in preflight, with a direction and a default.
- **Direction:** set `lang` and `dir` on `<html>` from the active language. Use **logical CSS properties** (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`, `border-start-start-radius`) instead of left and right, so right-to-left mirrors by itself. Mirror directional icons (arrows, chevrons, back buttons) but not logos, media controls, numerals or clocks.
- **Strings:** all copy lives in one file per language (`scripts/i18n/<code>.js` in plain HTML, keyed by a stable name; the HTML reads `data-i18n="key"` and a small classic script fills it). The default language is complete first; every other chosen language is complete too, because a half-translated screen is a defect.
- **Switch:** with more than one language, a visible language switch in the header (a globe icon with the language code is enough) changes the language and direction without a reload and remembers the choice; the default language applies on first visit. Each frame works in every language; frames are not duplicated per language.
- **Fonts:** a family that covers each script (for example Arabic needs an Arabic-capable family), loaded from relative `fonts/` files so the `share/` copy works offline. Text sizes may need a step up for Arabic and other scripts with small x-heights.
- **Numbers and dates:** formatted with `Intl` for the active language; digits follow the language's convention.
- `localization.md` has the text-expansion and right-to-left details.

## Anchors for comments

Every frame root has `data-frame="Screen / State"` and every reusable component root has `data-component="Name"`, so a review comment on the published page can be traced back to its source file (see `share-build.md`).

## Interactions are real

Buttons, menus, dialogs, tabs, forms (with validation), toggles and navigation actually work, with the motion and states the references describe. A flow the journeys describe can be walked by clicking through the real app. Where something needs a backend, use a small in-memory mock so the flow completes.

## Running it

- `package.json` scripts: `dev` (the dev server on the stack's port, fixed so it never silently moves: 5173 for Vite with `--strictPort`, 3000 for Next.js with `-p 3000`), `build` (typecheck then build), and `lint` if a linter is set up.
- `.claude/launch.json` in the client folder:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "design-app", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev", "--prefix", "code"], "port": 5173 }
  ]
}
```

- Use the stack's own port in `port` (3000 for Next.js).
- Start the app with the **preview tool** (`preview_start`, name `design-app`). It opens the app in the built-in browser pane and returns the address. A server started from a shell can't be opened in that pane. If the preview tool isn't available, run `npm run dev` and give the user the local address.
- The built-in browser can resize its viewport (`resize_window`), read the console and the network, and click, so the Auditor can test every frame at every chosen viewport.

## Quality gates (before returning a round)

- `npm run build` passes with no errors, and `npm run lint` if it exists.
- No console errors or failed requests on any frame route.
- Every frame in the registry renders at its viewport with no clipped or overlapping content.
- The checks in `code-quality.md` pass.
- `share/` is rebuilt from the current code (`share-build.md`), and its `file://` open test passes where the stack supports it.

## Git

`git init` when the project is first scaffolded, with a sensible `.gitignore`. After every round: `git add -A && git commit -m "Round <n>: <summary>"`. At the start of a revision round, read `git status` and `git diff` against the last commit: the user may have edited the code directly, and **their edits must be kept** unless the feedback says otherwise. Never rewrite history and never push.
