# Grounding the look (avoid generic output)

Used by the Design System Agent (token extraction), the Design Agent (style preview and creative direction) and the Orchestrator (preflight). Distilled from Tastemaker by codeswithroh and the `web-design-engineer` skill by ConardLi (both MIT). See `NOTICE.md`.

## Ground in real pixels, not descriptions

When a reference exists (image, screenshot or URL), extract tokens from the reference itself with a script or measured values, and generate from the numbers. A written summary of "the vibe" is lossy and is the main reason output looks generic. Record the measured values; don't round them to familiar defaults.

## Lock the look once chosen

After the user approves a look, treat the tokens as locked for the project. Don't re-derive a palette or type pairing on later screens. Only change them when the user asks.

## Classify each screen before designing it

The class sets density, component choice and motion:
**marketing narrative** (teaches through scroll), **app shell** (gets out of the way), **transactional form**, **data view**, **editor or canvas**, **settings**, **empty / loading / success state**.

## Ask four positioning questions per screen

- Narrative role: hero, transition, data, closing?
- Viewing distance: phone in hand, laptop, wall display, kiosk at arm's length, TV across a room? This drives type scale and density.
- Visual temperature: quiet, energised, authoritative, warm, playful?
- Capacity: will the real content fit the layout, or overflow or look sparse?

## Avoid the default AI look (unless the brand itself uses it)

Purple-to-pink gradients, a rounded card with a coloured left-border accent, emoji used as icons, drawn-SVG faces or scenes, generic dark-mode neon, and invented stats, logo walls or testimonials. The only legitimate exception is that the brand specification uses the pattern. Prefer a distinctive, specific visual language over "modern and clean".

## Show a rough version early

A v0 with placeholders, the declared tokens and a list of assumptions is worth more than a polished version that took three times as long, because a wrong direction can be corrected before the expensive work.
