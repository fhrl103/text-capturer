# 05: Clear errors for unloadable files without leaving the app

**What to build:** Corrupt/unreadable PDFs, encrypted PDFs, and unsupported file types produce a clear error naming the file and the reason, while the app stays usable so the user can immediately pick another file.

**Blocked by:** 02 (open and display an image file), 03 (open a PDF and render its first page offline).

**Status:** done

- [ ] A corrupt or unreadable PDF shows an error with the file name and the reason
- [ ] An encrypted (password-protected) PDF shows an error stating it is unsupported
- [ ] An unsupported file type shows an error stating which types are accepted
- [ ] After any error, the user can pick another file without reloading, and a valid file then displays normally
