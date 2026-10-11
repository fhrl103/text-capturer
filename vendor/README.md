# vendor/

Third-party libraries must be vendored locally here. No CDN calls at runtime.
Do not commit CDN links; the app must run offline after installation.

Place the following files under `vendor/`:

## pdf.js (PDF rendering)
- `vendor/pdfjs/pdf.mjs` — pdf.js build
- `vendor/pdfjs/pdf.worker.mjs` — pdf.js worker

## tesseract.js (OCR)
- `vendor/tesseract/tesseract.min.js` — tesseract.js build
- `vendor/tesseract/worker.min.js` — tesseract.js worker
- `vendor/tesseract/tesseract-core.wasm` — tesseract.js core (wasm)

## Language data (Tesseract traineddata for ara and eng)
- `vendor/tessdata/eng.traineddata` — English language data
- `vendor/tessdata/ara.traineddata` — Arabic language data

Download these files manually and place them at the paths above.
