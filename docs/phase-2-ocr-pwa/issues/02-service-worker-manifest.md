# 02: Service worker and manifest for offline refresh

**What to build:** The app loads and works after a page refresh with no network, and is installable as a PWA. The service worker precaches the app shell and vendored libraries on install.

**Blocked by:** 01 (vendor tesseract.js runtime and -lstm core pair).

**Status:** ready-for-agent

- [x] With network disconnected, a page refresh loads the app shell, viewer, and navigation exactly as when online
  - Clarification: "exactly as when online" means the empty state after refresh — shell, viewer, and navigation behave the same as a fresh online load. Viewed-file restoration is NOT required and stays forbidden by phase 1 (fresh state every launch).
- [x] `manifest.webmanifest` is wired up with name, icons, and display mode, and the app is installable
- [x] The precache covers the shell plus `vendor/pdfjs/` and `vendor/tesseract/` (traineddata stays lazy per the PRD)
  - Precache is an explicit file list, never a wildcard or folder. Do not precache `lang/` or `tests/`. When `js/ocr.js`, `js/selection.js`, or `js/export.js` receive implementation in tickets 04–07, add them to the precache list; review the list whenever a shell file is created.
  - Note for ticket 04: `createWorker` must set `cacheMethod` to `"none"` so tesseract.js never uses its internal IDB cache — the service worker owns all caching. Verified in the vendored `worker.min.js`: the language loader reads `p=a.cacheMethod` from the loadLanguage options and skips the cache path with `if(!["write","refresh",void 0].includes(d.cacheMethod))`, so `"none"` disables it.
- [x] No CDN calls at runtime; verified in the Network panel

## Verification

- Tested at http://127.0.0.1:8000/ (use this origin consistently; localhost is a different origin).
- Precache: ekstraksi-teks-shell-v1 has 14 entries; ekstraksi-teks-tessdata-v1 absent; no lang/, tests/, or LICENSE entries.
- Offline: after one online visit, one reload with network disconnected shows the empty state; PDF and image selection and PDF navigation work.
- Manifest: name, short_name, standalone display, two icons with any and maskable purposes; installable.
- Network: no remote requests online or offline.
- Android installability is not verified here; it needs HTTPS.
