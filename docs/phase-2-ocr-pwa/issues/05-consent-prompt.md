# 05: First-use language download consent

**What to build:** When OCR is triggered and `ara`/`eng` data is not cached, the user sees "Data bahasa (±{size} MB) belum tersimpan. Unduh sekarang?" with Unduh and Batal buttons, where `{size}` comes from the actual vendored file sizes.

**Blocked by:** 04 (OCR engine with local paths, downscale, and worker restart).

**Status:** done

- [ ] OCR never runs before consent; box changes while the prompt is open trigger nothing
- [ ] Unduh fetches the data, hands it to the service worker cache, then runs OCR under the debounce rule without showing the prompt again
- [ ] Batal leaves all state unchanged and the prompt reappears on the next OCR trigger
- [ ] Prompt, buttons, and states use Indonesian wording with `dir="auto"` and logical CSS properties
  - Note: the size falls back to the `vendor/README.md` value (28004325 bytes) when HEAD is unavailable offline.
  - Note: precache reviewed for this ticket — no list change, no new JS files.
  - Note: if Batal aborts after the first file is cached, only one file remains cached; the cache check requires both, so the prompt reappears and no partial state is used.
