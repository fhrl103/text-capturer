# 09: Progress, cancel, RTL, and full offline verification pass

**What to build:** The final phase-2 polish: visible OCR progress with cancel, bidirectional correctness of all new UI, and the complete manual verification across laptop and 360px Android viewports.

**Blocked by:** 05 (first-use language download consent), 06 (selection box drawing, adjust, and debounced auto-run), 07 (copy button with secure and fallback paths).

**Status:** ready-for-agent

- [ ] Long OCR runs show progress with a working cancel that stops the run and restores the idle state
- [ ] All new UI (box, prompt, button, progress) reads correctly in both directions with logical CSS properties and 44px touch targets
- [ ] Full pass offline on both viewport sizes: Arabic + English boxes, adjust re-runs, consent/cancel flows, refresh-without-network, copy on secure origin, fallback noted for a non-secure device test
- [ ] Worker creation-time logs reviewed on the 4 GB Android target for the SIMD follow-up decision
