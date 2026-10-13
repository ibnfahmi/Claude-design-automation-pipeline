# Figma file: name, pages and re-export

Used by the Handoff Agent. This file is the one place that says how the Figma file is named, which pages it has and in what order, what each page holds, how things are named, and what happens on a re-export. The detailed rules for frames, rows and label cards are in `handoff-agent.md`; the thumbnail is in `figma-thumbnail.md`; building and fonts are in `figma-capture.md`.

## File name

`<Project> — v<version>`, for example `Shabab Masr — v1.2` (an em dash with spaces). The project name is the project's name exactly; the version follows the version rule below. Apply it with `figma.root.name` (the `figma-pages.js` template does this). If the plugin API refuses to rename the file, say so in the result and give the exact name to type (File menu, Rename); the version and the date are also on the cover thumbnail, so the file stays identifiable.

**Version rule:** the version the brief or BRD states (for example `V2.0` becomes `v2.0`), otherwise `v1.0` for the first export of the project and `v1.1`, `v1.2`... for each later export of the same project (count them in `figma_exports` in the state file). The same version goes on the thumbnail's Version pill, in the Changelog entry, and in the names of archived pages.

## Pages, in this order

Every page, dividers and archived pages included, has the background **#272727**.

```
Cover
———  Overview  ———
Specs & Guidelines
Product Flows
Components
Handoff status
Changelog
———  Features  ———
F-0 · Foundation
F-1 · <Feature name>
...
———  Archive  ———
Archive
v1.0 · F-1 · <Feature name>
...
```

- **Dividers** are empty pages named `———  <Group>  ———` (em dashes, two spaces each side). They only group the page list. There are three: `Overview`, `Features`, `Archive`.
- **Feature pages** are named `F-<n> · <Feature name>` from the spec's Features table, in feature order, only for features that were built. A project with one feature has one feature page. No page per platform.
- **Archived pages** come after the `Archive` index page, newest first, each named `<version it came from> · <original page name>`.
- A page the team added by hand (not in this list) is left alone and placed after the archive group.

## What each page holds

- **Cover:** the `Thumbnail` frame only (`figma-thumbnail.md`), applied as the file's thumbnail.
- **Specs & Guidelines:** the thirteen sections in `handoff-agent.md` (overview, colour, typography, layout with the deviation table, shape, iconography, components rules, motion, accessibility, content and language, naming, requirements trace, open items), plus the **font table** (family and weight in the code, Figma font, substituted or not).
- **Product Flows:** the overview map and one flow per journey with all branches, cases and states, and the case matrix per feature (`handoff-agent.md`, step 5e).
- **Components:** one section per reusable component, named `<Component>`: its anatomy (labelled parts), a grid of **variants by states** (default, hover, focus, pressed, disabled, loading, error as they apply), its sizes, and two or three usage notes (do and don't). They are real Figma components with variants (`Component / Variant` naming); frames on the other pages use instances of them. Order: foundations first (button, input, link, icon), then composed ones (card, list item, navigation, dialog).
- **Handoff status:** an auto-layout table, **one row per frame**. Columns: **Frame** (the frame's name as a text link to the node), **Page**, **Size**, **Status** (`Draft`, `In review`, `Ready for dev`), **Changed in** (the version), **Requirements and journeys** (`R-4 · J1.2`). New frames start as `Draft`. The team sets statuses; a re-export keeps each frame's status unless the frame changed, in which case it becomes `In review` and `Changed in` shows the new version. Rows are sorted by page order, then by frame order.
- **Changelog:** one entry per export, **newest first**: version, date, the screens **added**, **changed** and **removed** (each with its requirement IDs), the fonts substituted, the behaviours approximated, and the gaps (`Not built`). The first export reads "Initial export".
- **Archive:** a short intro, then an index table: **Archived page**, **From version**, **Archived on**, **Reason** (changed in `v1.2`, removed in `v1.2`).

## Names, everywhere

| Thing | Name |
|---|---|
| File | `<Project> — v<version>` |
| Pages | as above |
| Top-level frame | `<Screen> / <State> @ <size label>` (the size label only for non-primary sizes), exactly as in the manifest |
| Row label | `Desktop · 1440` |
| Label card | `Card / <Screen> / <State>` |
| Component | `<Component> / <Variant>` (for example `Button / Primary / Hover`) |
| Variables | `Space/<n>`, `Color/<role>`, `Radius/<n>`, `Type/<style>` |
| Layers | what the thing is (`Header`, `Nav / Link`, `Card / Title`), never `Frame 123`, `Group 4` or tool-made names |
| Status table rows | `Row / <Frame>` |

## Re-export: update the same file

When the project already has a Figma file (`figma_file` in the state file), **update it** rather than creating a new one (unless the user chose a new file).

1. **Find what changed.** Each frame's spec (`<slug>@<w>.json`) is hashed; the hashes, node ids and pages of the last export are in `figma_frames` in the state file. A frame is **new** (no hash), **changed** (different hash), **unchanged**, or **removed** (in the old export, not in the manifest). A renamed frame counts as removed plus new.
2. **Archive, then rebuild, page by page.** For each page that has a changed or removed frame: clone the old page into the archive group as `<old version> · <page name>` (`figma-pages.js`, archive action), then clear that page and rebuild it in place from the new specs. Pages whose frames are all unchanged are left untouched. Removed frames are in the archived copy only.
3. **Update the file-wide pages:** the Thumbnail's version and date (edit the texts in place, then re-apply the thumbnail), Specs & Guidelines (tokens, deviations, fonts, trace), Components (only changed components, the rest left), Product Flows (flows that include a changed frame), Handoff status (new, changed and removed rows; other statuses preserved), Changelog (a new entry at the top), Archive (new rows in the index).
4. **Rename the file** to the new version and record the export in `figma_exports` (`date`, `version`, `name`, `url`) and the new `figma_frames` map in the state file.
5. Report what was added, changed, archived and left alone.

If the user asks for a **new file** instead, build a fresh file with the same structure (no Archive entries), and keep the old file's record in `figma_exports`.
