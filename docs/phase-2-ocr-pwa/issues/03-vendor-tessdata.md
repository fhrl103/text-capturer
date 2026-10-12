# 03: Vendor tessdata_best language data for ara and eng

**What to build:** The two OCR language files every later ticket assumes, placed under `vendor/` with their license recorded.

**Blocked by:** 01 (vendor tesseract.js runtime and -lstm core pair).

**Status:** done

- [x] `vendor/tessdata/ara.traineddata` (tessdata_best, ~12.0 MB) is present
- [x] `vendor/tessdata/eng.traineddata` (tessdata_best, ~14.7 MB) is present
- [x] The Apache-2.0 LICENSE is vendored alongside and `vendor/README.md` records exact byte sizes for the consent prompt to read
- [x] Nothing is fetched from a CDN; git status shows only `vendor/` changed

## Verification

- Satisfied by commit 2733328 (ticket 01 vendored the files; this ticket adds no new files).
- vendor/tessdata/ara.traineddata: 12603724 bytes (~12.0 MB).
- vendor/tessdata/eng.traineddata: 15400601 bytes (~14.7 MB).
- vendor/tessdata/LICENSE: 10173 bytes, Apache-2.0, source https://github.com/tesseract-ocr/tessdata_best (README: all data Apache-2.0).
- Tessdata is lazy: not in the shell precache.
