# 01: App shell with file picker and empty state

**What to build:** Opening the app shows an empty state with a way to pick a file from disk. No viewer yet — this ticket delivers the shell, the picker entry point, and the fresh-launch empty state.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Launching the app with no file shows an empty state and a visible way to choose a file
- [ ] Picking a file from disk registers its name in the UI (rendering comes in later tickets)
- [ ] Reloading the app returns to the empty state; no file or state is restored
- [ ] Works offline with no network requests
