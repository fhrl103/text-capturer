# vendor/

Third-party libraries must be vendored locally here. No CDN calls at runtime.
Do not commit CDN links; the app must run offline after installation.

## pdf.js (PDF rendering)

- library: pdf.js (npm package pdfjs-dist)
- version: 6.4.299
- files included:
  - `vendor/pdfjs/pdf.min.mjs`
  - `vendor/pdfjs/pdf.worker.min.mjs`
  - `vendor/pdfjs/LICENSE`
- license: Apache License, Version 2.0 (see `vendor/pdfjs/LICENSE`)

## tesseract.js (OCR)

- library: tesseract.js (npm package tesseract.js) 7.0.0, Apache-2.0
- core: tesseract.js-core 7.0.0, Apache-2.0, `-lstm` pair (`tesseract-core-lstm.wasm.js`, `tesseract-core-lstm.wasm`)
- verification: with default options (OEM LSTM_ONLY, no legacy flags), directory mode resolves an `-lstm` core file on every SIMD tier — verified in tesseract.js 7.0.0 source (`src/createWorker.js`: `lstmOnlyCore` from OEM; `src/worker-script/browser/getCore.js`: `-relaxedsimd-lstm` / `-simd-lstm` / `-lstm` branches).
- TODO: binaries not yet vendored; SIMD pairs deferred pending device measurement.
