# 04: OCR engine with local paths, downscale, and worker restart

**What to build:** A working offline OCR engine over `ara+eng`: it loads the worker, core, and language data from local paths only, downscales box crops to 2000px on the long edge, reuses an idle worker across debounced runs (terminating only to cancel an in-flight run, on a language change, or after a recognition error, and recycling after 20 completed runs), and logs worker creation and reuse for on-device measurement.

**Blocked by:** 01 (vendor tesseract.js runtime and -lstm core pair), 03 (vendor tessdata_best language data for ara and eng).

**Status:** done

- [x] Worker, core (`corePath` pinned to the vendored file, not the CDN default), and language data (`langPath` local) all load with network disabled
  - Note: criterion 1 is verified only after one online OCR run has populated the tessdata cache, because tessdata is lazy per the PRD — a cold offline run has no language data to load.
- [x] A box crop larger than 2000px on any edge is downscaled before recognition; smaller crops pass through unchanged
- [x] An idle worker is reused across runs; it is terminated only to cancel an in-flight run, on a language change, or after a recognition error, and recycled after 20 completed runs (no queue); worker creation and reuse are logged
  - Note: supersedes the original per-run terminate-and-recreate decision; `terminate()` remains the only cancellation mechanism (tesseract.js 7.0.0 has no per-job cancel).
- [x] Progress events from the engine are surfaced to the caller for the progress UI ticket
  - Note: `js/ocr-fit.js` (pure downscale helper) is an addition to the shell precache alongside `js/ocr.js`.

## Verification

- Automated: `tests/ocr-worker.test.mjs` covers create-then-reuse, adjust-during-run (terminate and recreate), error recovery, recycle after 20 runs, `shutdownOcr`, and progress wiring to the latest run (`node --test tests/ocr-worker.test.mjs`).
- On-device: worker creation and reuse timing reviewed on the 4 GB Android target as part of the SIMD follow-up (ticket 09).
- Console test passed at http://127.0.0.1:8000/: runOcr returned the recognized text, and "ocr: worker created in N ms" was logged.
- Cache: ekstraksi-teks-tessdata-v1 holds ara.traineddata and eng.traineddata after the first online run.
- Offline: after one online OCR run, a reload with network disconnected still runs OCR successfully.
- IndexedDB: empty (cacheMethod "none" confirmed).
- Network: no remote requests.
- Criterion 1 is verified only after one online run has populated the tessdata cache (tessdata is lazy per PRD).
