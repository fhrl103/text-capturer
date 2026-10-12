# Phase 1 — Open and View PDF / Image Files (PRD)

## Problem Statement

A user with a PDF or image file on disk (laptop or Android) has no offline way to open it in this app and see it on screen. Phase 1 closes that gap: open a file from disk and view it, including navigating multi-page PDFs. Nothing else (no OCR, no selection, no translation, no camera).

## Solution

An offline-first, dependency-free viewer. The user picks a PDF or image file from disk; the app renders it on screen. PDFs render one page at a time with navigation controls (previous/next, page indicator, jump to page). Images render full-view. Failures (corrupt, encrypted, or unsupported files) show a clear error with the file name and reason while staying in the app so the user can pick another file. Each launch starts fresh with an empty state; nothing persists between sessions. The layout works on laptop and Android, file names in any script display correctly, and everything runs offline from vendored libraries.

## User Stories

1. As a user, I want to pick a PDF file from disk, so that I can view it in the app.
2. As a user, I want to pick an image file from disk, so that I can view it in the app.
3. As a user, I want to see the first page of a PDF immediately after opening it, so that I know the file loaded.
4. As a user, I want to move to the next page of a PDF, so that I can read multi-page documents.
5. As a user, I want to move to the previous page of a PDF, so that I can re-read earlier pages.
6. As a user, I want to see which page I am on and how many pages there are (e.g. "3 / 200"), so that I know my position in the document.
7. As a user, I want to jump directly to a page number, so that I can navigate long documents quickly.
8. As a user, I want navigation controls to be disabled or hidden appropriately at the first/last page and for single-page PDFs, so that I am not offered impossible actions.
9. As a user, I want to see an image file rendered on screen after opening it, so that I can inspect it.
10. As a user, I want to open another file after viewing one, so that I can switch documents without relaunching.
11. As a user opening a PDF with up to 200 pages, I want every page reachable through navigation, so that large documents are fully readable.
12. As a user opening a large file, I want no artificial size rejection — the app accepts whatever the browser can load, so that large scans are not blocked by policy.
13. As a user opening a corrupt or unreadable PDF, I want a clear error naming the file and the reason, so that I understand what went wrong.
14. As a user opening an encrypted (password-protected) PDF, I want a clear error stating it is unsupported, so that I am not left guessing.
15. As a user opening an unsupported file type, I want a clear error, so that I know which types the app accepts.
16. As a user seeing an error, I want to stay in the app and be able to pick another file immediately, so that one bad file does not end the session.
17. As a user relaunching the app, I want a fresh empty state (no file restored), so that my private files are not retained.
18. As a laptop user, I want a comfortable viewer layout, so that documents are easy to read on a wide screen.
19. As an Android user, I want a usable viewer layout with touch-reachable controls, so that I can read and navigate on a small screen.
20. As a user with Arabic (or other non-Latin) file names, I want the name shown correctly without renaming or rejection, so that my files are respected as-is.

## Implementation Decisions

- File intake uses the platform file picker (user selects a file from disk); the app reads it locally in the browser. No upload, no network.
- PDF rendering uses the locally vendored pdf.js build and its worker. No CDN calls at runtime; the worker path resolves to the vendored copy so the app works offline after installation.
- PDFs render one page at a time to a single canvas surface. Only the current page is rendered; navigation re-renders on demand. This bounds memory for documents up to 200 pages.
- The document viewer shell owns three states: empty (no file), viewing (PDF page or image), and error (message + file name + reason, with a way to pick another file). Error never unloads the app shell.
- The file-loading module validates type (PDF vs supported image types) before rendering and routes failures to the error state with a reason (corrupt/unreadable, encrypted/unsupported, unsupported type).
- The PDF module exposes: open document, page count, render page N, and navigation state (current page, has previous/next). The navigation UI (previous/next, indicator, jump-to-page) drives it.
- Images render from a local object URL; the previous object URL is revoked when switching or clearing files to avoid leaking memory.
- No persistence layer in Phase 1: no stored file, handle, or viewer state survives a reload. Launch always shows the empty state.
- Responsive layout with a single codebase: the viewer and controls adapt from narrow (Android) to wide (laptop) viewports. Touch targets for navigation are reachable on small screens.
- Right-to-left support: file names and user-facing text containers use `dir="auto"`; styling uses logical CSS properties (not physical left/right).
- No size cap is enforced in code; the practical limit is what the browser can hold. Up to 200 PDF pages must navigate correctly.
- No new dependencies. Vanilla HTML, CSS, JavaScript only; no framework, no build step.

## Testing Decisions

- What makes a good test here: observable user behavior (file opens, correct page shows, indicator reads "N / total", error names the file), not implementation internals.
- Phase 1 is verified by a manual offline checklist, one pass per ticket, on laptop and on Android-sized viewport: open valid PDF, flip through pages including first/last edges, jump to a page, open an image, open a corrupt file, open an encrypted file, open an unsupported type, relaunch to confirm empty state, confirm Arabic file names display correctly.
- All verification runs offline (network disabled) with only vendored libraries present, proving no CDN dependency.
- Automated tests: none in Phase 1. No test framework is added (that would be a dependency, which requires approval). If regression tests are wanted later, that is a separate decision.

## Out of Scope

- OCR and any text extraction.
- Region/box selection on the rendered page.
- Translation.
- Camera input.
- Automatic text detection.
- Password entry / decryption for encrypted PDFs (error only).
- Persistence of files or viewer state across sessions.
- Any new dependency, framework, or build step.

## Further Notes

- Interview decisions locked: no enforced file-size limit; PDFs up to 200 pages; load failure shows error with name + reason and stays in app; fresh state every launch; laptop + Android from the start; full Unicode file names with `dir="auto"`.
- The vendored pdf.js files themselves are placed manually under `vendor/` (per `vendor/README.md`) and are not part of Phase 1 tickets; tickets assume the vendored build and worker are present.
- Source of truth for process: repo `AGENTS.md` plus `docs/agents/*.md`.

## Status

- Tickets 01 to 06 implemented and manually tested. Commits: fc22a29, ba70999, 1019826, 17dd6ca, 3e02fcd, 0ebe394.
- Known gap: the offline criterion is only partly met. The app does not yet work after a page refresh without a server. Service worker and PWA manifest are deferred to phase 2, together with OCR language data caching.
- Verified offline behavior: no CDN calls, file selection works without network when the app is served locally.
- Not in phase 1: validation of rejected jump input messages, corrupt image handling beyond the broken-image icon, and the .agents/ and skills-lock.json decision.
- Verified offline behavior (local server on laptop, network disconnected, no reload): file selection and viewing work without VM or internet.
