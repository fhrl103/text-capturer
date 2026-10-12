# 07: Copy button with secure and fallback paths

**What to build:** After recognition a copy button appears; pressing it puts the text in the clipboard with no preview panel, across secure and non-secure origins.

**Blocked by:** 04 (OCR engine with local paths, downscale, and worker restart), 06 (selection box drawing, adjust, and debounced auto-run).

**Status:** ready-for-agent

- [ ] The copy button appears only after a successful recognition and copies the recognized text on press
- [ ] No text preview panel is shown at any point
- [ ] Secure origins copy via `navigator.clipboard.writeText`
- [ ] Non-secure origins fall back to a hidden `dir="auto"` textarea plus `document.execCommand("copy")` with its return value checked, then to a selectable manual-copy element (never `user-select: none` on it)
