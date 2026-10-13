# Figma file thumbnail and page background

Used by the Handoff Agent every time it creates a Figma file. The thumbnail is built **by default**, in a fixed style (taken from the team's thumbnail template), and applied to the file. Every page of the file gets the dark canvas colour.

## Page background

Every page in the file (Cover, Specs & Guidelines, Product Flows, every feature page, and any page that already exists) has the background **#272727**. With `use_figma`, for each page: `page.backgrounds = [{ type: 'SOLID', color: { r: 0x27/255, g: 0x27/255, b: 0x27/255 } }]`. Set it as soon as a page is created, and check every page before returning.

## The thumbnail frame

A frame named `Thumbnail` on the `Cover` page, **1600 × 900**, fill **#1B1B1B**, no corner radius. Content, left margin **128 px** everywhere:

| Part | Spec |
|---|---|
| **Logo** | The brand logo as an editable vector, named `Logo`, **423 × 32**, at **x 128, y 149**, white. Default logo: the plugin's `_shared/assets/thumbnail-logo.svg`. If the user has put their own logo at `~/.claude/design-automation/brand/thumbnail-logo.svg`, use that instead (keep its aspect ratio at height 32; the width follows). |
| **Content block** | An auto-layout frame named `Content`, vertical, item spacing **40**, width **1344**, left **128**, **bottom edge at y 699** (201 px above the bottom of the frame), so it grows upwards when the description takes two lines. |
| **Meta row** (first in `Content`) | An auto-layout frame, horizontal, item spacing **24**, with two pills (below). |
| **Text stack** (second in `Content`) | An auto-layout frame, vertical, item spacing **24**, width fill (1344), holding the project name and the description. |

**Pills** (both: auto layout horizontal, padding **30 / 18**, corner radius **100**, text **IBM Plex Mono SemiBold 36**, letter spacing **0.72**, white, no wrapping):
- **Version pill** (named `Version`): fill white at **20%** opacity (`rgba(255,255,255,0.2)`), background blur **7.5**. Text: the project version (see below).
- **Date pill** (named `Date`): fill `rgba(121,121,121,0.19)`, background blur 7.5, **2 px inside border** `rgba(255,255,255,0.2)`. Text: the **last update date** as `DD-Month-YYYY` (for example `13-October-2026`; the month spelled out in English).

**Project name:** **IBM Plex Sans SemiBold 120**, letter spacing **-2.4** (-2%), line height **110%**, white, width fill (1344), **one line, truncated with an ellipsis** (`textAutoResize = 'HEIGHT'`, `textTruncation = 'ENDING'`, `maxLines = 1`).

**Description:** **IBM Plex Sans Regular 60**, line height auto, white, width fill (1344), **at most two lines, truncated with an ellipsis** (`textTruncation = 'ENDING'`, `maxLines = 2`).

Load the three fonts (`figma.loadFontAsync`) before writing text: IBM Plex Sans (Regular, SemiBold) and IBM Plex Mono (SemiBold). If a font is missing in the file, use the closest available and say so.

## The content

- **Project name:** the project's name (the session and state file name), exactly.
- **Description:** one short sentence on what the product is, from the spec's project line or the brief's read-back. No marketing text; two lines at most at this size, which is about 60 characters per line.
- **Version:** the project version. If the brief or BRD states a version (for example `V2.0`), use that. Otherwise use the design version: `v1.0` for the first export of the project and `v1.1`, `v1.2` ... for each later export of the same project (count the exports in the state file under `figma_exports`).
- **Last update date:** today's date, taken from the system clock when the file is created or re-exported.

## Building it (steps)

1. On the `Cover` page create the `Thumbnail` frame, the `Content` frame, the two pills and the texts with `use_figma`, with the values above. Set the text first, then position `Content` so its bottom edge sits at y 699.
2. **Add the logo** without sending the SVG through a tool call: call the Figma connector's `upload_assets` with `count: 1`, the file key and `currentPageId` = the Cover page; then POST the SVG file to the returned upload URL with Bash: `curl -s -X POST -H "Content-Type: image/svg+xml" --data-binary @"<absolute path of the logo file>" "<upload url>"`. The SVG arrives as an editable vector tree on the Cover page. Then with `use_figma` move it into `Thumbnail`, name it `Logo`, set its size to 423 × 32 and its position to x 128, y 149, and make sure its fill is white. If the upload route is unavailable, create the logo with `figma.createNodeFromSvg` from the SVG text.
3. **Apply it as the file's thumbnail:** `figma.setFileThumbnailNodeAsync(<Thumbnail frame>)`. If that call isn't available or fails, say so and tell the user the one-step fallback (right-click the `Thumbnail` frame, then "Set as thumbnail").
4. **Check** with the screenshot tool: the logo, the two pills, the one-line name and the description are all visible with nothing cut off; a long name shows an ellipsis on one line; a long description ends with an ellipsis on the second line; the date reads `DD-Month-YYYY`.
5. Record the export in the state file (`figma_exports`: date, version, file name, file link) so the next export increments the version. The file is named `<Project> — v<version>` with this same version (`figma-structure.md`).
6. **On a re-export** (the file already has a `Thumbnail`), don't rebuild it: edit the Version and Date texts in place with the new values, then call `setFileThumbnailNodeAsync` again.
