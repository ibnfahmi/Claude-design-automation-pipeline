# Landing page and marketing site guidance

Used by the `landing-page` and `ecommerce` profiles. Distilled from the `landing-page-design` skill by Elaya (MIT). See `NOTICE.md`.

A landing page wins one intent: **one offer, one audience, one primary action.**

## Intake (the profile's options already ask most of this)

Primary action and what counts as a conversion. The offer. The audience and their top three objections. Traffic source. Proof available (logos, testimonials, numbers, case studies). Risk reversal (trial, guarantee, cancel anytime). If an answer is missing, assume, state the assumption in one line, and continue.

## Page structure

**Above the fold**
1. Headline: outcome plus audience
2. Subheadline: how, with specifics
3. Primary CTA: verb plus what they get ("Start free trial", never "Submit" or "Learn more")
4. One proof signal: logo strip, stat or short testimonial
5. Hero visual: product screenshot or video, or a strong illustration

**Middle (the argument)**: problem to solution, three to five outcome-driven benefits, how it works in three steps, social proof.

**Bottom (objections)**: FAQ (six to twelve questions), risk reversal, final CTA identical to the top one.

Choose one layout type and say why: classic hero plus sections, long-form story (needs to overcome scepticism), minimal conversion page (high-intent traffic), or comparison page (search intent includes alternatives).

## Conversion rules

- Match the message to the traffic source; mirror the ad headline in the hero.
- One primary CTA. No competing CTAs above the fold.
- Benefit first, then feature. Be specific: "Cut weekly reporting from 4 hours to 15 minutes" beats "Save time and streamline".
- Put proof directly beside the claim it supports. Move the FAQ earlier for high-friction offers.

## Content realism (applies to every platform)

- No lorem ipsum, no "John Doe", no placeholder brands, no round fake numbers (use 47.2%, not 50%).
- Avoid AI cliches: "elevate", "seamless", "unleash", "game changer".
- Sentence-case headings, active voice. Errors are direct and have no "Oops!".
- Never fabricate stats, logo walls or testimonials. Where real data is needed, use a clearly marked placeholder.

## States and ship requirements

Every interactive element has hover, active, focus, loading (skeleton shaped like the layout), empty (a composed view, never a blank panel) and error (inline and specific). No dead links. The current page is indicated in navigation.

Landing pages also need: footer links to privacy and terms, a branded 404, form validation states, a skip-to-content link, alt text on meaningful images, and a cookie consent state where the jurisdiction requires it.

## Optional visual rules (use only when the direction is `creative`)

The source skill ships strict house rules (one typeface per site, no italics, no background gradients, flat dark backgrounds, 680px max width on hero text, spacing from a fixed scale, nested radius = outer radius minus gap when the gap is under 32px). They are one opinionated look, not requirements. When a design system or reference is chosen, its own look wins. When the direction is `creative`, these are good defaults:
- One typeface, no ultra-bold weights, headings balanced and body text wrapped to avoid orphans.
- Nested rounded shapes follow inner radius = outer radius - gap (only when the result is above 2px).
- Never a border on one side of a card; flat backgrounds.
