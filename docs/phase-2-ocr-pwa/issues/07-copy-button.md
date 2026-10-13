# 07: Copy button with secure and fallback paths

**What to build:** After recognition a copy button appears; pressing it puts the text in the clipboard with no preview panel, across secure and non-secure origins.

**Blocked by:** 04 (OCR engine with local paths, downscale, and worker restart), 06 (selection box drawing, adjust, and debounced auto-run).

**Status:** done

- [ ] The copy button appears only after a successful recognition and copies the recognized text on press
- [ ] No text preview panel is shown at any point
- [ ] Secure origins copy via `navigator.clipboard.writeText`
- [ ] Non-secure origins fall back to a hidden `dir="auto"` textarea plus `document.execCommand("copy")` with its return value checked, then to a selectable manual-copy element (never `user-select: none` on it)
  - Note: steps 3b and 3c are verified only from a non-secure origin. `localhost` and `127.0.0.1` are secure, so the fallback cannot be tested there.
  - Note: stored OCR text is cleared on page navigation, same as the box, because it belongs to the old bitmap.
  - Note: fallback steps 3b and 3c are not yet verified from a non-secure origin. Verify from a device over HTTP before closing the phase.
