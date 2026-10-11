# 04: Multi-page PDF navigation

**What to build:** A user viewing a PDF can move between pages with previous/next controls, see the current position (e.g. "3 / 200"), and jump directly to a page number. Edge pages behave sensibly.

**Blocked by:** 03 (open a PDF and render its first page offline).

**Status:** ready-for-agent

- [ ] Previous/next controls move exactly one page and re-render it
- [ ] A page indicator always shows current page and total (e.g. "3 / 200")
- [ ] Jump-to-page reaches any page of a 200-page PDF, including first and last
- [ ] At the first page, previous is unavailable; at the last page, next is unavailable
- [ ] Out-of-range jump input (0, beyond total, non-numeric) is rejected without breaking the viewer
