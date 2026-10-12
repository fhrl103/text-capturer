# 04: OCR engine with local paths, downscale, and worker restart

**What to build:** A working offline OCR engine over `ara+eng`: it loads the worker, core, and language data from local paths only, downscales box crops to 2000px on the long edge, recreates the worker per debounced run, and logs worker creation time for on-device measurement.

**Blocked by:** 01 (vendor tesseract.js runtime and -lstm core pair), 03 (vendor tessdata_best language data for ara and eng).

**Status:** done

- [x] Worker, core (`corePath` pinned to the vendored file, not the CDN default), and language data (`langPath` local) all load with network disabled
  - Note: criterion 1 is verified only after one online OCR run has populated the tessdata cache, because tessdata is lazy per the PRD — a cold offline run has no language data to load.
- [x] A box crop larger than 2000px on any edge is downscaled before recognition; smaller crops pass through unchanged
- [x] Each OCR run terminates the previous worker and recreates it (no queue); worker creation time is logged
- [x] Progress events from the engine are surfaced to the caller for the progress UI ticket
  - Note: `js/ocr-fit.js` (pure downscale helper) is an addition to the shell precache alongside `js/ocr.js`.

## Verification

- Console test passed at http://127.0.0.1:8000/: runOcr returned the recognized text, and "ocr: worker created in N ms" was logged.
- Cache: ekstraksi-teks-tessdata-v1 holds ara.traineddata and eng.traineddata after the first online run.
- Offline: after one online OCR run, a reload with network disconnected still runs OCR successfully.
- IndexedDB: empty (cacheMethod "none" confirmed).
- Network: no remote requests.
- Criterion 1 is verified only after one online run has populated the tessdata cache (tessdata is lazy per PRD).
