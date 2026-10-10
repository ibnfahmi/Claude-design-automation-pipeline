# Data visualisation

Used by the dashboard and presentation-deck profiles. Distilled from the `data-visualization` skill in Owl-Listener's `designer-skills` (MIT) and the data-visualisation notes in ConardLi's `web-design-engineer` (MIT). See `NOTICE.md`.

## Pick the simplest chart that makes the point

| Question | Use |
|---|---|
| Comparison | Bar (categories), grouped bar (several series), bullet chart (target vs actual) |
| Trend over time | Line (continuous), area (volume), sparkline (inline) |
| Part of a whole | Donut or pie (few categories), stacked bar (many), treemap (hierarchy) |
| Distribution | Histogram, box plot, scatter plot |
| Relationship | Scatter, bubble, heat map |

## Encoding

- **Maximise data-ink:** remove needless gridlines, 3D effects and shadows.
- Start the y-axis at zero for bar charts. Label axes with units.
- **Label directly on the chart** when possible, instead of a legend. Annotate the key insight, and give context (a benchmark, a target, the prior period).
- Colour carries meaning (up/down, category, time), not decoration, and the same colour means the same thing in every view.
- Sequential scales run light to dark for ordered data. Diverging scales use two hues around a midpoint. Categorical charts use distinct hues for unrelated groups. Avoid red-green-only distinctions.

## Accessibility

- Never colour alone: add labels, patterns or shapes.
- Data elements keep sufficient contrast (3:1 for graphics) against the background and each other.
- Provide a text alternative or a table view. Interactive charts are keyboard reachable.

## Small screens

Simplify at small sizes (fewer points, larger labels), consider a table instead of a chart on mobile, and make tooltips touch-friendly.

## Use realistic data

Test with real or realistic uneven data, not idealised samples. Show empty, loading and error states for every chart.
