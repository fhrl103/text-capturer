# 06: Selection box drawing, adjust, and debounced auto-run

**What to build:** The user draws a box on the rendered page with mouse or touch drag, adjusts it with move/resize handles, and OCR auto-runs 500ms after the last box change.

**Blocked by:** 04 (OCR engine with local paths, downscale, and worker restart).

**Status:** done

- [ ] Pointer drag draws a box on both PDF canvas and image preview, with mouse and with touch
- [ ] Move/resize handles adjust the box with at least 44px touch targets
- [ ] OCR auto-runs 500ms after the last box change; rapid changes restart the debounce and the stale run never surfaces
- [ ] Box, handles, and progress affordances use logical CSS properties and `dir="auto"` text
  - Note: box is stored in original bitmap pixels; crop is passed to requestOcr as a canvas, never a rect.
  - Note: a new drag replaces the existing box (single box).
  - Note: box is cleared on new file pick and on page navigation, because a stale box on a new bitmap would point at the wrong area.
  - Note: a drag under 4px clears the box and does not trigger OCR.
  - Note: clearing never triggers OCR.
