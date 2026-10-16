# Phase 2 — Box Selection, Offline OCR, and PWA (PRD)

## Problem Statement

Phase 1 lets the user open and view PDFs and images, but the text in them is unreachable: there is no way to select a region, recognize its text, or copy it. The app also stops working after a page refresh without a server, because there is no service worker or PWA manifest. Phase 2 closes these gaps: draw a box on the page, run OCR offline in Arabic and English, copy the result, and keep the whole app working offline after refresh.

## Solution

The user draws a selection box on the rendered page with mouse or touch drag and adjusts it. OCR auto-runs on the finished box (debounced) using locally vendored Tesseract (`tessdata_best` Arabic + English); a copy button then appears and copies the recognized text — no text preview panel. A service worker caches the app shell and libraries on install and the language data on first OCR, and a PWA manifest makes the app installable and usable offline after refresh.

## User Stories

1. As a user viewing a PDF page or image, I want to draw a box over a text region with mouse drag, so that I can select what to recognize.
2. As an Android user, I want to draw and adjust the box with touch drag, so that selection works without a mouse.
3. As a user, I want to adjust the drawn box (move/resize), so that I can fix an imprecise selection.
4. As a user, I want OCR to start automatically after I finish or adjust the box (debounced), so that I do not press an extra button.
5. As a user, I want to see OCR progress and be able to cancel it, so that long `tessdata_best` runs on a 4 GB Android device stay manageable.
6. As a user, I want a copy button to appear after recognition, so that I can copy the text with one tap.
7. As a user pressing the copy button, I want the text in my clipboard without seeing a preview panel.
8. As a user on a non-secure origin, I want copy to fall back gracefully, so that I can still get the text.
9. As a first-time OCR user, I want to consent before a ~27 MB language download, so that no large fetch happens silently.
10. As a returning user, I want no download prompt once language data is cached.
11. As a user who cancels the language download, I want everything unchanged, so that I can retry later.
12. As a user, I want the app to load and work after a refresh with no network, so that it is genuinely offline-first.
13. As a user with Arabic file names and Arabic OCR needs, I want names and UI to keep working in both directions.

## Implementation Decisions

- Selection: pointer-drag box drawn over the rendered canvas (mouse + touch via Pointer Events), with move/resize adjust handles. Touch targets for handles follow the 44px rule.
- OCR input: box crop downscaled so its long edge is at most 2000px before recognition. For PDFs the crop is re-rendered from the page at high resolution (long edge target 2000px, scale capped at 4) instead of being sampled from the display canvas, so recognition resolution is never reduced by the display scale.
- PDF display: pages render at a scale matching the canvas' on-screen size (container width × device pixel ratio, dpr capped at 2) bounded by a maximum long edge, instead of a fixed `scale: 2`. This cuts canvas memory and render time on phones; the OCR crop above re-renders the region so recognition quality is preserved.
- Auto-run: 500ms debounce measured from the last box change. When the debounce fires, reuse an idle worker for the current box instead of recreating it; terminate the worker only to cancel an in-flight run, when the language set changes, or after a recognition error, and recycle it after 20 completed runs. Rationale: tesseract.js 7.0.0 `recognize()` returns a plain promise with no per-job cancel (verified in `src/createWorker.js`; the graceful in-worker terminate is commented out, `terminate()` kills the worker), so `terminate()` stays the cancellation mechanism — but recreating the worker on every run needlessly reloads the core and `ara+eng` language data. No job queue; at most one recognition runs at a time.
- Instrumentation: log worker creation time and reuse so restart and reuse costs can be measured on device.
- Languages: `ara+eng` from vendored `tessdata_best` files.
- First-use consent: when OCR is triggered and language data is not cached, show "Data bahasa (±{size} MB) belum tersimpan. Unduh sekarang?" with Unduh and Batal buttons. `{size}` comes from the actual vendored file sizes, not a hardcoded value. OCR does not run until consent. Box changes while the prompt is open do not trigger OCR. After a successful download the prompt never shows again and the debounce rule applies. A cancelled download leaves state unchanged.
- Copy: `navigator.clipboard.writeText` first; on unavailability or rejection, fall back to a hidden `dir="auto"` textarea + `document.execCommand("copy")` with its return value checked; if both fail, show the recognized text in a selectable element for manual copy (never `user-select: none` on it).
- Offline: service worker caches app shell + vendored libraries on install; traineddata fetched on first OCR (after consent) and cached then (lazy). Manifest makes the app installable.
- Loading: `vendor/pdfjs/pdf.min.mjs` (~458 KB) and `vendor/tesseract/tesseract.min.js` (~63 KB) are fetched on demand — the former dynamically imported when a PDF is opened, the latter injected as a script when OCR first runs — instead of being parsed on every page load. Both stay in the service worker precache, so on-demand loading works offline.
- Vendored files (all licenses verified from source LICENSE files; nothing downloaded yet):
  - `tesseract.js` 7.0.0, Apache-2.0: `dist/tesseract.min.js` (~61 KB), `dist/worker.min.js` (~109 KB).
  - `tesseract.js-core` 7.0.0, Apache-2.0, `-lstm` pair: `tesseract-core-lstm.wasm.js` (3896484 bytes, ~3.9 MB), `tesseract-core-lstm.wasm` (2855361 bytes, ~2.9 MB). Reason: default OEM is LSTM_ONLY, `tessdata_best` models are LSTM-only, and the pair is smaller (the earlier ~6.4 MB figure was an estimate; actual total ~6.7 MB).
  - Note: legacy (non-LSTM) models would need the plain pair (`tesseract-core.wasm.js` + `tesseract-core.wasm`); out of scope.
  - `tessdata_best`, Apache-2.0: `ara.traineddata` (~12.0 MB), `eng.traineddata` (~14.7 MB).
  - Apache-2.0 redistribution requires shipping each LICENSE alongside its files.
  - Deferred: SIMD core pairs pending device measurement (see ticket 09); default file loading resolves an `-lstm` file on every SIMD tier for this configuration.
- Phase-1 resolutions carried in: jump rejection stays silent; corrupt images show the corrupt-file reason; the 30rem breakpoint stays; `.agents/` + `skills-lock.json` get committed.
- No new runtime dependencies beyond the vendored files above. Vanilla HTML, CSS, JavaScript; no framework, no build step.

## Testing Decisions

- What makes a good test: observable behavior (box drawn, OCR auto-runs, copy button appears, clipboard holds the text), not internals.
- Manual offline checklist per ticket on laptop and 360px Android viewport, including: Arabic + English boxes, box adjust re-runs OCR, cancel during recognition, first-use consent/cancel flows, refresh-without-network, reinstall freshness.
- Clipboard fallback must be tested from a non-secure origin on a real device (`localhost` counts as secure and would hide the fallback path).
- Worker creation and reuse costs measured from the logs on the 4 GB Android target.
- Automated tests: none (consistent with phase 1; no test framework without approval).

## Out of Scope

- Translation and camera input (still out per `AGENTS.md`).
- Automatic text detection.
- Password entry for encrypted PDFs.
- OCR of full pages without a selection box.
- Retraining or custom models.

## Further Notes

- Interview decisions locked: items 1–5, 7, 9–11 confirmed; item 6 approved as the complete list above; (a) downscale to 2000px; (b) 500ms debounce + idle-worker reuse with terminate only for cancel, language change, and error, recycled every 20 runs, with creation and reuse logging; (c) consent prompt wording with build-time size; (d) clipboard → execCommand → manual-copy fallback chain.
- Source of truth for process: repo `AGENTS.md` plus `docs/agents/*.md`.
