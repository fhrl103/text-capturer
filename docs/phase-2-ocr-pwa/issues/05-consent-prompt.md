# 05: First-use language download consent

**What to build:** When OCR is triggered and `ara`/`eng` data is not cached, the user sees "Data bahasa (±{size} MB) belum tersimpan. Unduh sekarang?" with Unduh and Batal buttons, where `{size}` comes from the actual vendored file sizes.

**Blocked by:** 04 (OCR engine with local paths, downscale, and worker restart).

**Status:** ready-for-agent

- [ ] OCR never runs before consent; box changes while the prompt is open trigger nothing
- [ ] Unduh fetches the data, hands it to the service worker cache, then runs OCR under the debounce rule without showing the prompt again
- [ ] Batal leaves all state unchanged and the prompt reappears on the next OCR trigger
- [ ] Prompt, buttons, and states use Indonesian wording with `dir="auto"` and logical CSS properties
