# Figma export: a spec from the real page, built natively

Used by the Handoff Agent when it builds the Figma file from the running app. The connector's capture tools (`generate_figma_design`, `html_to_figma`) produced frames full of nested wrappers with absolute positions, half-loaded elements and off-grid spacing. The export now **builds the frames itself from a measured spec**, so the layout, fonts and spacing are exactly what the page renders and what auto layout can express. The capture tools stay only as a fallback.

## 0. The spec-driven path (default)

1. **Tools (once, with consent).** Check `~/.claude/design-automation/tools/figma/node_modules` for `playwright-core`, `pngjs` and `pixelmatch`. If missing, ask once (AskUserQuestion, header `Figma tools`): *"Install three small open-source helper packages (playwright-core, pngjs, pixelmatch) used to measure the pages and compare screenshots? They run on your computer and use the Chrome or Edge you already have, so there is no browser download."* **Yes (Recommended)** / **No, use the built-in browser and the capture tool**. On yes, in that folder run `npm init -y` and `npm install playwright-core pngjs pixelmatch`. Save the answer in the state file (`figma_tools`).
2. **Extract the spec at each frame's own size.** Write `frames.json` from `design-manifest.json`: for every frame, its slug, its route and its **own viewport** (the width and height chosen in preflight for that platform: for example Desktop 1440 or 1920, Tablet 768, Mobile 375 or 390, a kiosk or TV stage at its exact pixel size; never a fixed 1440). Run `node <assets>/figma-spec/extract-spec.mjs --base <dev_url> --frames frames.json --out figma-spec`. For each frame it opens `/frames/<slug>?capture=1` at that width, waits for `document.fonts.ready`, the capture-ready flag, images and scroll-triggered effects, finishes animations, passes a stability check, saves the full-page **reference screenshot** (`<slug>@<w>.png`) and the **spec** (`<slug>@<w>.json`), and an `index.json` with the fonts in use. Each screen size is extracted and built as its own frame. Without the tools, run `spec-extractor.js` in the built-in browser (`javascript_tool`) after the same waiting, and take the reference screenshot with the browser.
3. **Pin the fonts before building** (section 3b below).
4. **Build each frame with `figma-builder.js`** (section 2b below).
5. **Compare and iterate, screen by screen** (section 4b below).

If the extraction or the build is not possible (no tools, the page can't be opened), fall back to the capture tool with sections 1 and 2 below, and say so in the result.

## 1. Final state (needed by the spec path and by the capture-tool fallback)

Capture happens only when the page has finished loading and animating. Never take a frame while anything is still moving.

**Capture mode.** Every frame route accepts `?capture=1` (the Design Agent builds this into every project; see `code-conventions.md`, "Capture mode"). In capture mode the page shows its **final, settled state**: entrance animations and transitions finished, reveal-on-scroll items already revealed, counters at their final value, scroll-linked and "active step" effects in their resting state, carousels and marquees stopped at the first position, lazy images loaded, fonts ready, videos on their poster frame, and no transform offsets left over. When it is settled the page sets `document.documentElement.dataset.captureReady = "true"`.

**Before each capture** (resize the browser to the frame's viewport first, then open `/frames/<slug>?capture=1`):
1. Wait for `data-capture-ready="true"` (up to 30 s). If the page has no capture mode (an existing project), do the steps below by hand.
2. Wait for fonts and images: `await document.fonts.ready`, then every `<img>` is `complete` with a non-zero `naturalWidth` (`img.decode()`), background images loaded, the network quiet for about 1 s.
3. **Trigger and finish everything that depends on scroll or time:** scroll the page slowly to the bottom and back to the top (a viewport height at a time, about 400 ms apart) so reveal-on-scroll, lazy loading and counters run; wait for transitions to end; finish running animations (`document.getAnimations().forEach(a => a.finish())` for finite ones) and stop infinite ones at their first frame; remove leftover offsets (a reveal that still has `opacity < 1` or a non-identity `transform` after this is **not final**: fix it in capture mode, don't capture it).
4. **Stability check:** read the bounding boxes, opacity and transform of all visible elements twice, 600 ms apart, with no scrolling in between. If anything changed, wait and check again (up to three times). Never capture while it changes.
5. **Verify with a screenshot** of the settled page and look at it: no half-visible text or cards, no faded steps that should be fully drawn, no spinner or skeleton unless that is the state being captured, no cut-off content at the bottom (scroll to the end, the full page height is captured), no overlay such as a cookie banner or dev toggle.

State frames (hover, focus, pressed, open menu, error) are captured **after** triggering the state and waiting for its transition to end, with the same stability check.

If an element is still not in its final state after capture mode, that is a **code defect** (report it for the Design Agent) and, for the file, build the element in its final state natively instead of capturing the mid-state.

## 2. Structure: from captured wrappers to auto layout (capture-tool fallback; the builder does this by construction)

Captured frames often arrive as deep stacks of wrapper frames with absolute positions, empty placeholders and transform wrappers (names like `Container`, `Article:transform`, `Placeholder for Article`, `Italic Text`). Fix them in a **structure pass** on every captured frame, working from the leaves up. Keep the visual result the same.

1. **Clean:** delete empty, zero-size, hidden and placeholder nodes (`Placeholder…`, `…:transform` wrappers with no styling, empty containers); delete duplicated text nodes.
2. **Flatten:** a frame with a single child and no fill, stroke, effect, radius or padding is removed and its child moved up. Merge nested frames that only repeat the same layout.
3. **Apply auto layout to every frame that has two or more in-flow children.** Infer from the children's positions:
   - children side by side (their vertical ranges overlap): `layoutMode = HORIZONTAL`; stacked: `VERTICAL`;
   - a grid of cards or tiles: an outer `VERTICAL` frame of `HORIZONTAL` rows, or one `HORIZONTAL` frame with `layoutWrap = WRAP` when the items share a fixed size;
   - set the item spacing (gap), the padding (from the distance between the frame's edge and its children), and the alignment on both axes (start, center, end, space between) from how the children actually sit.
4. **Sizing, so it behaves like the code:** the page root is `FIXED` at the viewport width. Text, buttons, chips and icons **hug** their content; columns, cards in a grid, input fields and section containers **fill** the available width (`layoutGrow = 1` or `layoutAlign = STRETCH`); images keep their aspect ratio (fixed size or fill with a locked ratio). Never leave a frame as fixed width and height just because the capture gave it a size.
5. **Absolute position only where it is truly an overlay:** a badge on a card corner, a decorative illustration or background shape, a sticky or fixed element, a tooltip. Everything else is in the flow. For an overlay use `layoutPositioning = ABSOLUTE` with the right constraints (pinned to the edge it sits on), not loose coordinates.
6. **Name every layer** for what it is (`Header`, `Nav / Link`, `Card / Challenge`, `Card / Title`, `Stat / Participants`, `Button / Primary`), never `Frame 123`, `Group 4`, `Container`, `Italic Text` or `Article:transform`. Repeated elements become **components with variants** and instances (cards, buttons, chips, list rows, form fields).
7. **Check:** after the pass, list every frame that still has more than one in-flow child and no auto layout, and every absolutely positioned node that is not an intended overlay. Fix them, or report them. The target is no unintended absolute positions and no unintended fixed sizes.

**If a frame is too broken to fix** (for example the capture produced a flat pile of absolutely positioned nodes), **rebuild it natively from the DOM**: run a script with `javascript_tool` on the real page that walks the visible elements and returns a JSON tree (tag, role, text, computed `display`, `flex-direction`, `gap`, padding, alignment, width, height, colours, borders, radii, shadows, image sources), then create the frames in Figma with `use_figma`, mapping `display:flex` directly to auto layout (direction, gap, padding, alignment) and `display:grid` to rows of auto-layout frames. This is slower, and it gives the cleanest result. Prefer it for any component whose structure is mostly flex or grid.

## 2b. Building from the spec with `figma-builder.js`

`figma-builder.js` is a template for `use_figma`. Load the `figma-use` skill first and follow its rules. For each frame, split the spec's root into **sections** (its top-level children, such as header, hero, each content section, footer) so every call is small and safe to retry. For each call replace the three placeholders in the three `const` lines at the top of the template (`SPEC`, `FONTMAP`, `OPTS`) with JSON, and send the text as the `code`:
- **First call:** create the top-level frame for the screen (the spec root without its children, `parentId: null`, its `name` from the manifest and a free position on the page), and the page's layout grids. Return its id.
- **Next calls:** one per section, `parentId` = that frame's id, in page order. The builder returns the node ids, counts, the images to fill, missing fonts, approximations and spacing deviations.
What the builder does: **flex becomes auto layout** (direction, gap, padding, justify, align, wrap, grow and stretch); **grid becomes a vertical frame of horizontal rows**; a block with stacked or side-by-side children becomes an inferred auto-layout stack; absolute positioning is kept **only** for real overlays (`layoutPositioning = ABSOLUTE` with the right constraints); containers keep their **fixed sizes** and only buttons, pills and inline-flex items hug their content; text gets its pinned font, size, line height, letter spacing, case, decoration, alignment, truncation and line clamp, and mixed-style text keeps its runs; fills, gradients, borders, radii, shadows and blurs are applied; inline SVG becomes vector nodes; spacing is snapped to the scale and bound to the `Space/*` variables, colours to the colour variables when they match a token. Images become named placeholders.
**Images:** after the sections are built, fill each placeholder: download the image sources the builder returned (for example with `curl` from the running app) and upload them with the connector's `upload_assets` (`nodeIds` set to the placeholder ids, up to 60 per call). Don't pass image bytes through `use_figma`.
**Variables first:** before the first call create the variable collections (`Space/*` from the scale, colours and radii from `tokens.css`), return their ids, and pass them in `OPTS`.

## 3. A grid and a spacing system that developers can trust

The Figma file must follow a system even when the code doesn't. Snap to it; don't copy stray values.

**Spacing scale (4 px base, 8 px rhythm):** `0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 128`. Use these for **item spacing, padding and margins**. Create them as Figma variables `Space/4`, `Space/8` … and **bind** every gap and padding to a variable. If the project's design system defines its own scale (for example `tokens.css`), use it instead, as long as it is a regular scale; say so on the Specs page.
- **Snap each measured value to the nearest scale step** (ties go to the larger step): 10 is a tie between 8 and 12, so it becomes 12 (9 becomes 8, 11 becomes 12), 46 becomes 48, 23 becomes 24, 52 becomes 48, 60 becomes 64. A value of 1 or 2 px that is a hairline border or optical nudge is not spacing.
- **Sizes:** fixed widths and heights of components (buttons, inputs, avatars, icons, cards) are multiples of 4 (icons 16, 20, 24, 32, 40, 48). Line heights are multiples of 4 and come from the type scale. Radii come from a short scale (`0, 4, 8, 12, 16, 24, full`).
- **Alignment:** left edges, baselines and centres line up; items in a row share a top or centre line; repeated cards have equal widths and heights.

**Layout grids on every frame**, set with `layoutGrids`, by screen size (use the project's real container and gutters if the code states them, otherwise these defaults):
- **Desktop (1280 and above):** 12 columns, gutter 24, margin 80 (or the container's side margins), content max width as in the code, snapped to the scale.
- **Tablet (about 768 to 1024):** 8 columns, gutter 24, margin 32.
- **Mobile (below 768):** 4 columns, gutter 16, margin 16.
- Add a baseline grid of 8 on frames with text-heavy layouts if the design system uses one.
Section and column widths follow the columns. Content that sits off the grid on purpose (full-bleed images, backgrounds) is marked as such.

**Deviations are reported, not hidden.** Where snapping moved a value by 3 px or more, or a layout could not follow the grid, add a row to the **Layout** section of the Specs page (a table of: where, value in the code, value in Figma). That list tells developers where the code drifts from the system, and the Orchestrator can offer a revision round that aligns the code with the scale.

## 3b. Pin the fonts before the import

1. Take the fonts the extractor found (`index.json`: family, weight, style, count, and whether the page had them loaded).
2. In one read-only `use_figma` call run `await figma.listAvailableFontsAsync()` and map every `family | weight | style` to an **exact Figma font** (family and style name; verify the style string from the list, such as `SemiBold` against `Semi Bold`, never guess). Load each with `figma.loadFontAsync` in that call and return the mapping (`FONTMAP`) and any font that is missing.
3. **Missing fonts are reported before any frame is built**: name the font, the closest available substitute, and what it affects. Continue with the substitute only after saying so (the Handoff Agent doesn't stop to ask unless the user can fix it in a minute, for example by enabling the font in Figma). Never let Figma substitute silently.
4. Put the pinned fonts in the font table on the Specs page.

## 4b. Compare each screen with its reference, and iterate

For every frame, after it is built (and its images filled):
1. Take a screenshot of the Figma frame at 1x (`get_screenshot`, or `await frame.screenshot({ scale: 1 })`), download it to `figma-spec/<slug>@<w>.figma.png`.
2. Run `node <assets>/figma-spec/compare-shots.mjs --a figma-spec/<slug>@<w>.png --b figma-spec/<slug>@<w>.figma.png --out figma-spec/<slug>@<w>.diff.png`. It returns the difference percentage and the worst regions (x, y, width, height).
3. If the size differs (`sizeMismatch`) fix the frame size first. If the difference is above about **2%**, look at the worst regions in the diff image and the two screenshots, find the cause (a wrong gap or padding, a fixed size where it should fill, a missing font or weight, a missing image, a shadow, a gradient direction), fix **those nodes** with a targeted `use_figma` call, and compare again. **Up to three passes per screen.** Don't rebuild the frame.
4. Record each screen's final difference and any residual issue (for example "gradient approximated", "font substituted"), and report them in the result.
Snapping to the spacing scale moves things by a few pixels, so a small residual difference is expected; unexplained large regions are not.

## 4. Check before returning

- Every screen has been compared with its reference screenshot (final difference reported, three passes at most), and a screenshot of every frame in Figma matches the running app in its **final state** (differences only from snapping, none larger than a few pixels), and no frame shows a half-faded, shrunken or sliding element.
- No default or tool-made layer names; repeated elements are component instances.
- Every frame that holds more than one in-flow child uses auto layout; absolute positioning appears only on intended overlays; padding and gaps are bound to the spacing variables and are all on the scale; layout grids are set on every top-level frame.
- The deviation table is on the Specs page.
