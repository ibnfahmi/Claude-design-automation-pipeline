# Mobile design guidance

Used by `mobile-app`, `tablet-app` and the mobile breakpoints of web profiles. Distilled from Emil Kowalski's `mobile-native` skill and Jakub Krehel's `better-accessibility` hit-area rules (both MIT). See `NOTICE.md`. The source skills are code-level; this file keeps what the design decides, which the code then implements.

## Frames

- Draw the real device frame, including the status bar, notch or Dynamic Island, and home indicator, on the frame routes and in the Figma export. The running app at `/` has no bezel. Content must not sit under them: respect the top and bottom safe areas.
- **Bottom clearance.** The last control or line of text ends at least **16 px above the bottom safe area**: the iOS home indicator zone is 34 px, so the content ends 50 px or more from the screen's bottom edge; the Android gesture bar is 24 px, so 40 px or more. A CTA with a legal or helper line under it is one content block (8 px between them), and the block keeps this clearance. Text never rests on the home indicator.
- Fixed bars (tab bar, bottom CTA) extend their background into the home-indicator area, with the controls padded above it.
- Design the keyboard-open state for every screen with an input. The focused field and its submit action stay visible.
- Landscape: one frame if the product supports it; otherwise state that it is portrait only.

## Touch

- Targets at least 44x44 (iOS) or 48x48 (Android). The visible icon may be smaller than the hit area. Keep neighbouring hit areas from overlapping.
- Primary actions sit in the thumb zone (lower half). Destructive actions are away from the easiest reach.
- No hover on touch. Every tappable element has a pressed state (a slight scale-down or background shift, shown in 100-160ms). Don't design hover-only information; put it on tap or long-press.
- Inputs are at least 16px text. Choose the right keyboard (email, number, phone) and show what the return key does (Send, Search, Done).
- Gestures (swipe, pull, drag) always have a visible, tappable alternative.
- Carousels show the next item peeking so users know more exists.

## Patterns

- Navigation: bottom tab bar for 3-5 top-level destinations, a stack with back for depth, a drawer only for secondary destinations.
- Bottom sheets: a visible drag handle, a close action, a scrim, and a defined content-scroll behaviour.
- Pull-to-refresh only where content is a refreshable list.
- Status bar colour matches the top of the screen; design light and dark where dark mode is in scope.
- Empty, loading (skeleton), offline and error states for every data screen.

## Verify on a real device

Emulators miss sticky hover, tap highlights, browser-chrome height changes, safe areas and the keyboard. When handoff includes a coded prototype, note that those behaviours need a phone.
