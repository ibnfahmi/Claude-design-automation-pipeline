# Figma capture: final state, real auto layout, a real grid

Used by the Handoff Agent when it builds the Figma file from the running app. Three problems it must not leave behind: elements captured **mid-animation** (half-faded cards, shrunken or dimmed steps, items still sliding in), frames full of **nested wrappers with absolute positions** that fight Figma's auto layout, and **spacing that follows no system** (46 px, 10 px, 23 px). The file is for developers: it must show the intended system even where the code drifts from it.

## 1. Capture the final state, never a moment in the middle

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

## 2. Structure: from captured wrappers to auto layout

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

## 4. Check before returning

- A screenshot of every frame in Figma matches the running app in its **final state** (differences only from snapping, none larger than a few pixels), and no frame shows a half-faded, shrunken or sliding element.
- No default or tool-made layer names; repeated elements are component instances.
- Every frame that holds more than one in-flow child uses auto layout; absolute positioning appears only on intended overlays; padding and gaps are bound to the spacing variables and are all on the scale; layout grids are set on every top-level frame.
- The deviation table is on the Specs page.
