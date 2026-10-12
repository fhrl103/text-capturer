# 04: OCR engine with local paths, downscale, and worker restart

**What to build:** A working offline OCR engine over `ara+eng`: it loads the worker, core, and language data from local paths only, downscales box crops to 2000px on the long edge, recreates the worker per debounced run, and logs worker creation time for on-device measurement.

**Blocked by:** 01 (vendor tesseract.js runtime and default core pair), 03 (vendor tessdata_best language data for ara and eng).

**Status:** ready-for-agent

- [ ] Worker, core (`corePath` pinned to the vendored file, not the CDN default), and language data (`langPath` local) all load with network disabled
- [ ] A box crop larger than 2000px on any edge is downscaled before recognition; smaller crops pass through unchanged
- [ ] Each OCR run terminates the previous worker and recreates it (no queue); worker creation time is logged
- [ ] Progress events from the engine are surfaced to the caller for the progress UI ticket
