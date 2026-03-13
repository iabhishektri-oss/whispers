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
