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

- library: tesseract.js (npm package tesseract.js)
- version: 7.0.0
- files included:
  - `vendor/tesseract/tesseract.min.js` — 62961 bytes
  - `vendor/tesseract/tesseract.min.js.LICENSE.txt` — 149 bytes
  - `vendor/tesseract/worker.min.js` — 111307 bytes
  - `vendor/tesseract/worker.min.js.LICENSE.txt` — 466 bytes
- license: Apache License, Version 2.0 (see `vendor/tesseract/LICENSE-tesseract.js`)

## tesseract.js-core (OCR engine, `-lstm` pair)

- library: tesseract.js-core (npm package tesseract.js-core)
- version: 7.0.0
- files included:
  - `vendor/tesseract/tesseract-core-lstm.wasm.js` — 3896484 bytes (~3.9 MB)
  - `vendor/tesseract/tesseract-core-lstm.wasm` — 2855361 bytes (~2.9 MB)
- license: Apache License, Version 2.0 (see `vendor/tesseract/LICENSE-core`)

## tessdata_best (OCR language data, ara + eng)

- library: tessdata_best (https://github.com/tesseract-ocr/tessdata_best)
- license: Apache-2.0 — verified in the repo LICENSE file; the repo README states the models only work with the LSTM engine
- files included:
  - `vendor/tessdata/ara.traineddata` — 12603724 bytes (~12.0 MB)
  - `vendor/tessdata/eng.traineddata` — 15400601 bytes (~14.7 MB)
  - `vendor/tessdata/LICENSE` — 10173 bytes

## Offline wiring contract (for the OCR engine ticket)

Option names verified in the vendored `tesseract.min.js` source:

- `corePath` — set explicitly to `vendor/tesseract/tesseract-core-lstm.wasm.js` so the `-lstm` pair is forced and no CDN is used.
- `langPath` — set to `vendor/tessdata/`.
- `langs` — set to `ara+eng`.
- `workerPath` — set explicitly to `vendor/tesseract/worker.min.js` (the build default is the jsdelivr CDN and must be overridden).
