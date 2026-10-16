/* Figma probe: reads back where the built nodes of one frame really are, for the calibration (calibrate.mjs observe).
 *
 * A template for the `use_figma` tool (read-only). Replace the placeholder in the `const FRAME` line with the id of the built
 * top-level frame (a JSON string) and send the text as the `code` of one use_figma call. Every node the builder made carries the
 * plugin data `pipeline:node` = the spec's node index; this returns each one's box relative to the frame.
 *
 * Returns { frame: { id, w, h }, nodes: [ { i, type, x, y, w, h } ] }. Save it as the probe file for `calibrate.mjs observe`.
 */
const FRAME = __FRAME__;
const frame = await figma.getNodeByIdAsync(FRAME);
if (!frame) return { error: 'frame not found', id: FRAME };
const fb = frame.absoluteBoundingBox || { x: frame.x, y: frame.y };
const r1 = (v) => Math.round(v * 10) / 10;
const nodes = [];
for (const n of frame.findAll(() => true)) {
  const tag = n.getPluginData ? n.getPluginData('pipeline:node') : '';
  if (tag === '' || tag === undefined) continue;
  const b = n.absoluteBoundingBox; if (!b) continue;
  nodes.push({ i: +tag, type: n.type, x: r1(b.x - fb.x), y: r1(b.y - fb.y), w: r1(b.width), h: r1(b.height) });
}
{ const t = frame.getPluginData ? frame.getPluginData('pipeline:node') : ''; const b = frame.absoluteBoundingBox; if (t !== '' && b) nodes.push({ i: +t, type: frame.type, x: 0, y: 0, w: r1(b.width), h: r1(b.height) }); }
return { frame: { id: frame.id, w: r1(frame.width), h: r1(frame.height) }, nodes };
