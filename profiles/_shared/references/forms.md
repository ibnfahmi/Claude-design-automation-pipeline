# Form design

Used wherever a design contains a form (sign-in, checkout, multi-step flows, kiosk entry). Distilled from the `form-design` skill in Owl-Listener's `designer-skills` (MIT). See `NOTICE.md`.

## Layout

- **Single column** almost always. Two columns blur the field order.
- **Field width suggests the answer's length** (narrow for a postcode, wide for a bio).
- **Top-aligned labels.** Group related fields with proximity and headings on longer forms.

## Labels and help

- Every field has a persistent, concise, sentence-case label. A placeholder is never the only label.
- Helper text sits below the label and above the field ("Format: DD/MM/YYYY").
- Mark **optional** fields rather than required ones, when most fields are required.
- Show character counts whenever a limit exists, not only near it.

## Input type

| Data | Control |
|---|---|
| Short text | Text input |
| Long text | Textarea with visible resize |
| One of up to 5 options | Radio buttons, all visible |
| One of 6 or more | Select or combobox |
| Several of a few | Checkboxes |
| Date | Date picker or day/month/year segments, never freeform text |
| Phone or card number | Formatted input with masking |
| Password | Password input with show/hide |

## Validation

- Validate a field **when the user leaves it**, not on every keystroke. Never keep the submit button disabled until the form is valid: let the user submit, then show the errors, and move focus to the first invalid field.
- Errors sit **directly below the field**, say what is wrong and how to fix it ("Email address must include @", not "Invalid email"), and are tied to the field. With several errors, add a summary at the top that links to each field.
- A subtle success cue (checkmark) only where correctness isn't obvious (password strength, username availability).
- Server errors appear inline if they can be tied to a field.

## Multi-step

- Show real progress (a step indicator with names), complete one coherent group per step, allow Back without losing data, and save progress on long forms.
- Confirm before discarding partial input. High-stakes forms (payments, medical, legal) get a review step before final submit.

## Fewer fields

Remove every optional field you can. Default to the most common answer; don't default binary choices to blank.
