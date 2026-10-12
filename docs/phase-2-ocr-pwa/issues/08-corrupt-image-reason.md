# 08: Corrupt images show the corrupt-file reason

**What to build:** A phase-1 carry-in: an image file that cannot be decoded shows the same corrupt-file error (name plus reason) as corrupt PDFs, instead of a bare broken-image icon.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Picking an undecodable image shows "Tidak dapat membuka ...: berkas rusak atau tidak dapat dibaca." with the file name
- [ ] No stale preview, canvas, or object URL remains visible; the shell stays usable for the next pick
- [ ] Valid images behave exactly as before
