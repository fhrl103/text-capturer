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

- TODO: not yet vendored
