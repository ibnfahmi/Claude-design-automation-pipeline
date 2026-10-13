/* Figma layout: places the frames (and their label cards and dev notes) of ONE feature page by the plugin's layout rules.
 *
 * A template for the `use_figma` tool; run it on the feature page after the frames are built. It only moves nodes, it builds nothing.
 * Replace the placeholder on the `const PLAN` line with a JSON literal. Layout rules (figma-structure.md, "Feature page layout"):
 *   - a size block per screen size, the largest on top, the smaller sizes below it;
 *   - inside a block, one COLUMN per flow step, left to right in journey order (the entry point first, branches after their parent);
 *   - inside a column, the screen's frame first and its other states stacked below it, all at the column's x;
 *   - every column has the same x in every size block, so a screen lines up with its smaller versions.
 *
 * PLAN = {
 *   originX: 0, originY: 600,                 // top-left of the first block (below the title block and the flow strip)
 *   gapX: 80, gapY: 64, gapBlock: 160,        // between columns, between states in a column, between size blocks
 *   cardH: 96, noteH: 0,                      // height of the label card above a frame, extra height reserved under a stack for notes
 *   blocks: [ { size: "Desktop 1440", columns: [ { step: "Landing", frames: [ { id: "1:2", cardId: "1:9", noteId: "1:30" }, ... ] } ] } ]
 * }
 * Frames are read for their real width and height. The width of a column is its widest frame (or card).
 */
const PLAN = __PLAN__;

const colKeys = [];
for (const b of PLAN.blocks) b.columns.forEach((c, i) => { if (!colKeys.includes(i)) colKeys.push(i); });

// load every node once
const nodes = {};
const need = [];
for (const b of PLAN.blocks) for (const c of b.columns) for (const f of c.frames) { need.push(f.id); if (f.cardId) need.push(f.cardId); if (f.noteId) need.push(f.noteId); }
for (const id of need) { const n = await figma.getNodeByIdAsync(id); if (!n) throw new Error('node not found: ' + id); nodes[id] = n; }

// column widths are shared by every size block, so columns line up between blocks
const colW = colKeys.map(() => 0);
for (const b of PLAN.blocks) b.columns.forEach((c, i) => { for (const f of c.frames) { colW[i] = Math.max(colW[i], nodes[f.id].width, f.cardId ? nodes[f.cardId].width : 0, f.noteId ? nodes[f.noteId].width : 0); } });
const colX = []; { let x = PLAN.originX; for (let i = 0; i < colW.length; i++) { colX.push(x); x += colW[i] + PLAN.gapX; } }

const placed = []; let y = PLAN.originY;
for (const b of PLAN.blocks) {
  let blockBottom = y;
  b.columns.forEach((c, i) => {
    let cy = y;
    for (const f of c.frames) {
      const fr = nodes[f.id];
      if (f.cardId) { const cd = nodes[f.cardId]; cd.x = colX[i]; cd.y = cy; cy += cd.height + 24; }
      fr.x = colX[i]; fr.y = cy; cy += fr.height;
      if (f.noteId) { const nt = nodes[f.noteId]; nt.x = colX[i]; nt.y = cy + 24; cy += 24 + nt.height; }
      placed.push({ id: f.id, block: b.size, column: i, x: fr.x, y: fr.y, w: fr.width, h: fr.height });
      cy += PLAN.gapY;
    }
    blockBottom = Math.max(blockBottom, cy - PLAN.gapY + (PLAN.noteH || 0));
  });
  y = blockBottom + PLAN.gapBlock;
}
return { placed, columnX: colX, nextFreeY: y };
