# 02: Open and display an image file

**What to build:** A user picks an image file from disk and sees it displayed on screen. Opening another file replaces the current one; the previous file's resources are released.

**Blocked by:** 01 (app shell with file picker and empty state).

**Status:** ready-for-agent

- [ ] Picking a supported image file displays it on screen
- [ ] The displayed file name matches the picked file, including non-Latin names
- [ ] Opening a second file replaces the first with no leftover display or resource leak
- [ ] Verified offline on laptop and Android-sized viewports
