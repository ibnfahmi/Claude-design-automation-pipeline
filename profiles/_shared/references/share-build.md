# Share build: a version anyone can open by double-click

Stakeholders in a review come from every industry and every level of tech knowledge. They must be able to open the design **without installing anything**. So every code project also produces a `share/` folder, next to `code/` in the client folder, and `share/index.html` opens by double-click from disk (`file://`), offline, in any current browser.

`share/` is built from `code/`, never edited by hand. Rebuild it at the end of every build and revision round, and again at the production check.

## What `file://` blocks (design for it)

| Problem | Why | Rule |
|---|---|---|
| `<script type="module">` and `import` between files | Browsers refuse module scripts from `file://` | Use classic scripts (one bundle or ordered `<script>` tags), no `type="module"` in anything under `share/` |
| `fetch()` / XHR of local JSON, SVG, shaders, models, textures | Blocked as cross-origin from `file://` | Embed data in the code (a JS object), inline small SVGs, inline shader strings, embed textures as data URIs, no web workers loaded from a file |
| Real URLs like `/pricing` | Only `index.html` exists on disk | Hash routing (`#/pricing`) in the single-file build; relative links (`pricing.html`) in the plain HTML build |
| Absolute paths (`/assets/x.png`) | Resolve to the drive root | Relative paths only |
| Web fonts from a CDN | Need internet | Ship the font files inside `share/` and load them with relative `@font-face` urls; a system-font fallback stack stays in place |
| Backend or API calls | Nothing to call | Use the in-memory mock data (the journeys must still complete) |
| Images and media | Large files make the page huge | Inline images under 100 KB; keep larger ones as relative files in `share/assets/` and keep the folder together; warn when `share/` is over 25 MB |

## Per stack

**`html-css-js`** — `code/` already follows these rules (see `code-conventions.md`), so `share/` is a self-contained copy: all pages, `styles/`, `scripts/`, `assets/` and `fonts/` with relative paths, the review tooling pages (`frames/`, `journeys/`, `style-preview.html`) included. Zip it as `share.zip` (`Compress-Archive` on Windows, `zip -r` elsewhere) so it can be sent as one file. Tell the user to unzip before opening.

**`react-vite-ts-tailwind`** — a separate production build to a single file:
1. Add `vite-plugin-singlefile` (current stable) as a dev dependency and a second config, `vite.share.config.ts`, that uses it, sets `base: './'`, `build.outDir: '../share'` (relative to `code/`), `build.assetsInlineLimit: 100000000`, `build.cssCodeSplit: false`, and `build.emptyOutDir: true`.
2. Add the script `"build:share": "vite build --config vite.share.config.ts"`.
3. The app must read a flag (`import.meta.env.VITE_SHARE` set by that config, or a router chosen at build time) to use **hash routing** (`createHashRouter` / `HashRouter`) in the share build. The normal dev and build keep the usual router.
4. Fonts: use `@fontsource` packages (imported in the code, so they are inlined) instead of a CDN link.
5. The result is `share/index.html`, a single file, and that file is the deliverable.

**`nextjs`** — a server is normally required, so no double-click file can be guaranteed. Say so at stack selection (preflight) and in the final report. If the project uses no server features, offer a static export (`output: 'export'`) with relative paths and report whether it opens from disk; otherwise offer a hosted link (the user does the publishing; never publish for them).

**Other stacks** — build a static, relative-path, classic-script output if the stack can; test it as below; if it can't, say so in the report rather than claim a share file.

## Anchors for review comments

A comment on the review page is anchored to the *built* page (text, element, element path). So that Claude can find the source: give every frame's root element `data-frame="Screen / State"`, give each reusable component's root a `data-component="Name"`, keep real text in the markup (not baked into images), and keep ids and test ids stable.

## Publishing as a review page

The single-file `share/index.html` is also what gets published as the private review page (`review-page.md`). Keep it within the Artifact limits: under 16 MB, no external scripts (everything inlined), stylesheets and fonts only from Google Fonts if not embedded.

## The file-open test (required)

The Auditor opens `share/index.html` through `file://` (navigate to `file:///…/share/index.html` in the built-in browser; if the browser can't open local files, say so and report the share build as "not verified"). For each viewport it tests:
- the page renders (not blank), with no console errors and no blocked or failed requests
- every journey can be walked by clicking, using only what is inside `share/`
- the primary navigation works and a refresh on a deep link (`#/…`) keeps the page
- the fonts load or the fallback looks acceptable, and 3D/WebGL scenes draw

Results: **pass**, **pass with issues**, **fail** or **not verified**. A failing share build is **major** (critical if the page is blank). Never tell the user a share file works unless this test passed.
