# 01: Vendor tesseract.js runtime and default core pair

**What to build:** The exact runtime files this phase needs, placed under `vendor/` with their licenses recorded, so later tickets can load everything offline with no CDN.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `vendor/tesseract/tesseract.min.js` (tesseract.js 7.0.0, ~61 KB) is present
- [ ] `vendor/tesseract/worker.min.js` (tesseract.js 7.0.0, ~109 KB) is present
- [ ] `vendor/tesseract-core/tesseract-core.wasm.js` (~4.5 MB) and `tesseract-core.wasm` (~3.3 MB) (tesseract.js-core 7.0.0, default pair) are present
- [ ] Each Apache-2.0 LICENSE is vendored alongside its files and `vendor/README.md` records library, exact version, files, and license
- [ ] Nothing is fetched from a CDN; git status shows only `vendor/` changed
