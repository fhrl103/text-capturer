# 01: Vendor tesseract.js runtime and -lstm core pair

**What to build:** The exact runtime files this phase needs, placed under `vendor/` with their licenses recorded, so later tickets can load everything offline with no CDN.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `vendor/tesseract/tesseract.min.js` (tesseract.js 7.0.0, ~61 KB) is present
- [ ] `vendor/tesseract/worker.min.js` (tesseract.js 7.0.0, ~109 KB) is present
- [ ] `vendor/tesseract-core/tesseract-core-lstm.wasm.js` (~3.7 MB) and `tesseract-core-lstm.wasm` (~2.7 MB) (tesseract.js-core 7.0.0, `-lstm` pair) are present
- [ ] Each Apache-2.0 LICENSE is vendored alongside its files and `vendor/README.md` records library, exact version, files, and license
- [ ] Nothing is fetched from a CDN; git status shows only `vendor/` changed
