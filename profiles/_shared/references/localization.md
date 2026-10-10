# Localisation and RTL

Used by profiles that ship in more than one language (kiosk, web app, e-commerce, mobile app, flows, docs). Distilled from the `localization-design` skill in Owl-Listener's `designer-skills` and the RTL notes in Jakub Krehel's `better-layout` (both MIT). See `NOTICE.md`.

## Text expansion

English is compact. Typical growth in translation: German +20-35%, French +15-25%, Finnish +30-40%. Arabic is often shorter but is RTL and a different script; Japanese and Chinese are often shorter with different typographic rules.

- Never size a container to fit the English copy. Use flexible widths and heights; buttons take a minimum width and may wrap.
- Test with German or Finnish as the worst case before real translations exist. Test navigation labels together at about 130% length.
- Truncation is a last resort and must have a way to the full text.

## Right-to-left (Arabic, Hebrew, Persian, Urdu)

The whole layout mirrors: reading order, sidebars, navigation, margins, progress indicators.
- Mirror direction-bearing icons (back arrows, chevrons, list and indent glyphs). Do **not** mirror logos, clocks, mathematical notation, or play and pause controls. Images are usually left as they are.
- Numerals stay left-to-right inside RTL text.
- Align text to start and end, not left and right.
- Design at least one key screen in RTL and check that nothing is clipped, overlapping or in the wrong order.

## Scripts

- Arabic and Hebrew: letters join, so don't fake bold; use real font weights. Use a larger minimum size (16px or more).
- CJK: different line height and letter spacing than Latin. Indic scripts need fonts with proper ligatures and fallbacks.

## Formats and culture

- Dates, numbers and currency vary by locale (day/month order, separators, symbol position). Show locale-appropriate samples. Address forms vary in field order and required fields.
- Colour meaning varies by culture (red can mean luck, white mourning); never use colour alone for meaning. Avoid hand-gesture icons and culturally specific symbols; use abstract forms for civic icons such as mailboxes.
