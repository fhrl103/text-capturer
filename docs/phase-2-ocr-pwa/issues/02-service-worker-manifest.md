# 02: Service worker and manifest for offline refresh

**What to build:** The app loads and works after a page refresh with no network, and is installable as a PWA. The service worker precaches the app shell and vendored libraries on install.

**Blocked by:** 01 (vendor tesseract.js runtime and -lstm core pair).

**Status:** ready-for-agent

- [ ] With network disconnected, a page refresh loads the app shell, viewer, and navigation exactly as when online
- [ ] `manifest.webmanifest` is wired up with name, icons, and display mode, and the app is installable
- [ ] The precache covers the shell plus `vendor/pdfjs/` and `vendor/tesseract/` (traineddata stays lazy per the PRD)
- [ ] No CDN calls at runtime; verified in the Network panel
