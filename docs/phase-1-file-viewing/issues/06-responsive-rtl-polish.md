# 06: Responsive layout and file-name display polish

**What to build:** The viewer, controls, empty state, and error state are comfortable on laptop and usable on Android with touch-reachable navigation, and file names in any script (including Arabic) display correctly with right-to-left support.

**Blocked by:** 04 (multi-page PDF navigation), 05 (clear errors for unloadable files without leaving the app).

**Status:** done

- [ ] Layout adapts from a narrow Android viewport to a wide laptop viewport with no overlapping or unreachable controls
- [ ] Previous/next and jump controls are tappable on a small touchscreen-size viewport
- [ ] File names with Arabic and other non-Latin characters display correctly without renaming or rejection
- [ ] Name and message containers read correctly in both directions, styled without physical left/right assumptions
- [ ] Full pass (valid PDF, navigation, image, each error case, reload-to-empty) verified offline on both viewport sizes
