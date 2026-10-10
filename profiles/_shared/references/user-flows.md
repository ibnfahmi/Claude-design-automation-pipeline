# User flows and journeys

Used by the Journey Agent to write the user journeys, and by the Coverage Agent to check them against the design. Distilled from the `user-flow-diagram`, `journey-map` and `experience-map` skills in Owl-Listener's `designer-skills` (MIT). See `NOTICE.md`. The pipeline's journeys are **user flows**: screen-level paths with decisions and error paths. The journey-map and experience-map ideas are used only for the stages and for crossing channels.

## Building a flow

1. **Define the goal** the flow accomplishes, for one persona. One flow per goal.
2. **Identify the entry point or points.** Where, and in what state, does the person arrive?
3. **Map the happy path first,** screen by screen.
4. **Add decision points and branches.** Every decision has an arrow for each outcome, and every arrow is labelled with its trigger or condition.
5. **Map error paths and recovery:** validation errors, server or network failures, empty results, permission denied, timeouts, and always a way back or to cancel.
6. **Mark the exits:** success, abandon, drop-off, and hand-off to another journey.
7. **Note background system actions:** an email sent, a record saved, an asynchronous wait, a notification.

## Elements

| Element | Meaning |
|---|---|
| Entry point | Where the person enters the flow |
| Screen or state | A view the person sees (named `Screen / State`) |
| Action | Something the person does (click, type, swipe, press a key) |
| Decision | A branch, with the criteria written next to it |
| System process | Something that happens in the background |
| End point | Completion or exit |
| Arrow | Direction of flow, labelled with the trigger |

## Flow types

- **Task flow:** a single path for one task. Mostly linear.
- **User flow:** several paths depending on the type of user or their choices.
- **Cross-platform flow:** one goal that crosses platforms or channels (for example landing page → sign-up → email verification → app). Show the **hand-off point** explicitly, and where data or context carries across.

## Keep it usable

- Keep each diagram readable. Split a flow with too many branches instead of drawing everything on one diagram.
- Use consistent notation, and the same screen names everywhere.
- The flow should be specific enough that a designer knows exactly which screens and states to draw, and a tester knows exactly which paths to click.

## Stages to think in (for ordering and for finding gaps)

Journeys usually pass through stages, and a missing stage is often a missing screen: **awareness or arrival → evaluation → sign-up or onboarding → first use → regular use → advanced use or help → leaving or returning**. For a product with a public landing page and a signed-in product, the landing page covers arrival and evaluation, and the signed-in product covers first use onwards, with sign-up between them.

## Crossing channels

When the experience spans more than one platform or channel (web, app, email, support, in-person), note for each hand-off: what triggers it, what carries over (account, state, data), and what the person sees on each side. Email is often the link between platforms (verification, receipts, notifications), so check that those emails exist as screens too.

## What the Coverage Agent checks

For every journey step: the screen or state exists as a frame in the running app, at every viewport the scope chose for that platform. For every branch and exit: the state exists (error, empty, timeout, cancel). A journey is fully designed only when all its steps and branches are.
