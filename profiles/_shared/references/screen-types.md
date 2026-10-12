# One representative screen per type

A product usually has a few **types** of screen and many **instances** of each: a card or product detail page repeated for every item, an article page for every article, a profile page for every person, a category page for every category. Design and build **one representative screen per type**, not one per instance. The instances are the same template with different data.

## What counts as a type

A **screen type** is a layout that repeats with different content. Examples: Article page, Product detail, Card detail, Profile, Category listing, Search results, Event page, Blog post.

Two screens are the **same type** when only the data differs (title, text, images, price, author, counts) and the layout, components and behaviour are the same. They are **different types** when the layout, components or behaviour differ: a text article and a video article with a player, a product and a bundle with a builder, a free and a paid plan page with a paywall. When in doubt, ask whether a designer would build a second template; if yes, it is a second type.

## What to do

- **The spec (Brief Agent):** list screens by **type**. Give each a `Type` and a `Represents` note naming the instances it stands for (`Article page: represents every article`), and say what data varies. Don't list one row per article, product or profile.
- **The journeys (Journey Agent):** a step on a repeated screen names the type and says *any* (`Open any article → Article page / Default`), not a specific instance.
- **The build (Design Agent):** build **one representative screen per type**, filled with realistic sample content, with all its states (default, loading, empty or not found, error). In a **listing**, show enough sample items to judge the layout (about six, or a full row and a bit more), not the whole catalogue. Make the template data-driven so another instance is a data change, and say so in the frame's note. Register one frame per type and state.
- **The audit:** test the template. To cover instances that differ in length or shape (a long title, a missing image, a very short article), use the stress test's worst-case data on the template, not extra screens.
- **Coverage:** a requirement that applies to a type is **Done** when the representative screen shows it. A requirement about a **specific instance** (a named landing page, a unique legal page, an item with special behaviour) needs that instance, because it is its own type. Never report an instance as Missing because it wasn't built separately.
- **The estimate and the size of the project:** count frames by type, not by instance.
- **Figma:** one representative frame per type and state, with the card saying `Template: applies to <instances>`.

## Exceptions

- Instances that **differ in layout or behaviour** are different types: build each.
- Something the **user explicitly asks for** as separate screens (for example "design the three plan pages") is built as asked.
- A one-off screen (the home page, the checkout, the settings page) is its own type with one instance.
- Don't merge types to save work: one representative per *real* type.
