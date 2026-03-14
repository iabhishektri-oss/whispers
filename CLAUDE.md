# CLAUDE.md

## iOS Safari CSS Learnings

### `<input type="date">` quirks on iOS Safari
- iOS Safari ignores `box-sizing: border-box` from low-specificity selectors (like `* {}`). You MUST use an **inline style** `box-sizing:border-box` to override the UA stylesheet for date inputs.
- With `-webkit-appearance:none`, the native date picker chrome is stripped, including the empty-state placeholder text. This causes the input to **collapse in height** when empty. Always pair `appearance:none` with an explicit `min-height` calculated as: `padding-top + padding-bottom + (font-size × line-height) + border`.
- `width:auto` does NOT fill the container for `<input>` elements. Inputs are **replaced elements** — `width:auto` resolves to their intrinsic (content) width, not the container width. Only non-replaced block elements fill their parent with `width:auto`. Use `width:100%` with inline `box-sizing:border-box` instead.
- `line-height` has no effect on an empty date input with `appearance:none` because there is no text content to create a line box. Use `min-height` instead to guarantee consistent height across empty and filled states.

### General replaced element rules
- `<input>`, `<img>`, `<video>`, `<select>` are replaced elements with different sizing behavior than `<div>`/`<span>`.
- Never assume `width:auto` or `line-height` will behave the same on replaced elements as on normal elements.
- When fighting native form control styling on iOS, prefer explicit dimensions (`min-height`, inline `box-sizing`) over inherited/cascaded properties that the UA stylesheet may override.

## Screen Layout Alignment Rules

Two kinds of screens, two alignment rules:

### Moment screens (centre-aligned)
- **When:** The screen is an emotional beat — a reveal, a confirmation, a celebration. The user is *feeling*, not *doing*.
- **Examples:** Ceremony/collection-ready screen (S7), share-link confirmation (S9), first-letter prompt.
- **Layout:** `text-align:center; align-items:center; justify-content:center`. Content floats in the middle of the viewport.

### Functional screens (left-aligned)
- **When:** The screen is a task — the user is entering data, picking options, copying a link. They are *doing*, not *feeling*.
- **Examples:** Onboarding steps (S1–S6), invite contributor (S8), any form or input screen.
- **Layout:** Default left-aligned shell layout. No `text-align:center` on the container. Inputs, labels, and body text are left-aligned for readability and native feel.

### Rule of thumb
If the screen has inputs, selectors, or multi-step tasks → **left-aligned**.
If the screen is a pause to celebrate or confirm → **centre-aligned**.
Never mix: a screen is one or the other.
