# 03: Vendor tessdata_best language data for ara and eng

**What to build:** The two OCR language files every later ticket assumes, placed under `vendor/` with their license recorded.

**Blocked by:** 01 (vendor tesseract.js runtime and default core pair).

**Status:** ready-for-agent

- [ ] `vendor/tessdata/ara.traineddata` (tessdata_best, ~12.0 MB) is present
- [ ] `vendor/tessdata/eng.traineddata` (tessdata_best, ~14.7 MB) is present
- [ ] The Apache-2.0 LICENSE is vendored alongside and `vendor/README.md` records exact byte sizes for the consent prompt to read
- [ ] Nothing is fetched from a CDN; git status shows only `vendor/` changed
