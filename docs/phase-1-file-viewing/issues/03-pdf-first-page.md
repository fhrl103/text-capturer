# 03: Open a PDF and render its first page offline

**What to build:** A user picks a PDF file from disk and immediately sees its first page, rendered with the locally vendored PDF library. No navigation yet — this ticket proves the offline PDF pipeline end to end.

**Blocked by:** 01 (app shell with file picker and empty state).

**Status:** ready-for-agent

- [ ] Picking a valid multi-page PDF displays its first page
- [ ] The total page count is known to the app after opening
- [ ] Rendering uses only the vendored library and worker; verified with network disabled
- [ ] Single-page PDFs display correctly with no navigation offered
