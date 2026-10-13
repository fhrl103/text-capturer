import {
  renderFirstPage,
  renderPage,
  getCurrentPage,
  getTotalPages,
  closeDocument,
} from "./pdfRenderer.js";
import { runOcr, shutdownOcr } from "./ocr.js";
import { initSelection, clearSelection } from "./selection.js";

(function () {
  "use strict";

  var currentObjectURL = null;
  var pickedGeneration = 0;
  var ocrTimer = null;
  var OCR_DEBOUNCE_MS = 500;
  var ocrRequestId = 0;
  var ocrText = "";
  var TESSDATA_CACHE = "ekstraksi-teks-tessdata-v1";
  var TESSDATA_URLS = [
    "vendor/tessdata/ara.traineddata",
    "vendor/tessdata/eng.traineddata",
  ];
  var TESSDATA_FALLBACK_BYTES = 28004325;
  var consentOpen = false;
  var pendingOcr = null;
  var downloadController = null;

  var REASON_CORRUPT = "berkas rusak atau tidak dapat dibaca";
  var REASON_ENCRYPTED = "berkas PDF terproteksi kata sandi tidak didukung";
  var REASON_UNSUPPORTED =
    "tipe berkas tidak didukung. Pilih berkas PDF atau gambar";

  function isImageFile(file) {
    if (file.type && file.type.indexOf("image/") === 0) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || "");
  }

  function isPdfFile(file) {
    if (file.type === "application/pdf") return true;
    return /\.pdf$/i.test(file.name || "");
  }

  function revokePreview() {
    if (currentObjectURL !== null) {
      URL.revokeObjectURL(currentObjectURL);
      currentObjectURL = null;
    }
  }

  function navElements() {
    return {
      nav: document.getElementById("pdf-nav"),
      prev: document.getElementById("prev-page"),
      next: document.getElementById("next-page"),
      indicator: document.getElementById("page-indicator"),
      form: document.getElementById("jump-form"),
      input: document.getElementById("jump-input"),
    };
  }

  function updateNav() {
    var els = navElements();
    if (!els.nav || !els.prev || !els.next || !els.indicator || !els.input)
      return;
    var current = getCurrentPage();
    var total = getTotalPages();
    if (total > 1) {
      els.indicator.textContent = current + " / " + total;
      els.prev.disabled = current <= 1;
      els.next.disabled = current >= total;
      els.input.max = String(total);
      if (document.activeElement !== els.input) {
        els.input.value = String(current);
      }
      els.nav.hidden = false;
    } else {
      els.nav.hidden = true;
    }
  }

  async function tessdataCached() {
    try {
      if (!("caches" in window)) return false;
      var cache = await caches.open(TESSDATA_CACHE);
      var ara = await cache.match(TESSDATA_URLS[0]);
      var eng = await cache.match(TESSDATA_URLS[1]);
      return !!(ara && eng);
    } catch (err) {
      return false;
    }
  }

  async function tessdataSizeMB() {
    try {
      var total = 0;
      for (var i = 0; i < TESSDATA_URLS.length; i++) {
        var response = await fetch(TESSDATA_URLS[i], { method: "HEAD" });
        var length = Number(response.headers.get("content-length"));
        if (!isFinite(length) || length <= 0) throw new Error("no length");
        total += length;
      }
      return (total / 1048576).toFixed(1);
    } catch (err) {
      return (TESSDATA_FALLBACK_BYTES / 1048576).toFixed(1);
    }
  }

  function hideConsent() {
    var prompt = document.getElementById("consent-prompt");
    if (prompt) prompt.hidden = true;
    consentOpen = false;
    pendingOcr = null;
  }

  function showConsent() {
    var prompt = document.getElementById("consent-prompt");
    var size = document.getElementById("consent-size");
    if (!prompt) return;
    consentOpen = true;
    prompt.hidden = false;
    tessdataSizeMB().then(function (text) {
      if (size && consentOpen) size.textContent = text;
    });
  }

  function copyEls() {
    return {
      button: document.getElementById("copy-text"),
      manual: document.getElementById("manual-copy"),
    };
  }

  function clearStoredText() {
    ocrText = "";
    var els = copyEls();
    if (els.button) {
      els.button.hidden = true;
      els.button.disabled = true;
    }
    if (els.manual) {
      els.manual.textContent = "";
      els.manual.hidden = true;
    }
  }

  function legacyCopy(text) {
    var done = false;
    var area = document.createElement("textarea");
    area.setAttribute("dir", "auto");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    try {
      area.select();
      done = document.execCommand("copy") === true;
    } catch (err) {
      done = false;
    }
    document.body.removeChild(area);
    return done;
  }

  function showManualCopy(text) {
    var els = copyEls();
    if (!els.manual) return;
    els.manual.textContent = text;
    els.manual.hidden = false;
  }

  function copyStoredText() {
    if (!ocrText) return;
    if (
      window.isSecureContext &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      navigator.clipboard.writeText(ocrText).then(
        function () {},
        function () {
          if (!legacyCopy(ocrText)) showManualCopy(ocrText);
        }
      );
      return;
    }
    if (!legacyCopy(ocrText)) showManualCopy(ocrText);
  }

  function startOcrRun(cropCanvas, onProgress, onError) {
    var id = ++ocrRequestId;
    var els = copyEls();
    if (els.button && !els.button.hidden) {
      els.button.disabled = true;
    }
    runOcr(
      cropCanvas,
      function (status, progress) {
        if (id === ocrRequestId && typeof onProgress === "function") {
          onProgress(status, progress);
        }
      },
      function (err) {
        if (id === ocrRequestId && typeof onError === "function") {
          onError(err);
        }
      }
    ).then(function (text) {
      if (id !== ocrRequestId) return null;
      if (typeof text === "string" && text !== "") {
        ocrText = text;
        var ui = copyEls();
        if (ui.manual) {
          ui.manual.textContent = "";
          ui.manual.hidden = true;
        }
        if (ui.button) {
          ui.button.hidden = false;
          ui.button.disabled = false;
        }
      } else {
        clearStoredText();
      }
      return null;
    });
  }

  async function maybeOcr(cropCanvas, onProgress, onError) {
    if (consentOpen) return;
    if (await tessdataCached()) {
      startOcrRun(cropCanvas, onProgress, onError);
      return;
    }
    pendingOcr = {
      crop: cropCanvas,
      onProgress: onProgress,
      onError: onError,
    };
    showConsent();
  }

  function requestOcr(cropCanvas, onProgress, onError) {
    if (ocrTimer !== null) {
      clearTimeout(ocrTimer);
      ocrTimer = null;
    }
    if (consentOpen) return;
    ocrTimer = setTimeout(function () {
      ocrTimer = null;
      maybeOcr(cropCanvas, onProgress, onError);
    }, OCR_DEBOUNCE_MS);
  }

  function currentSource() {
    var preview = document.getElementById("preview");
    var canvas = document.getElementById("pdf-canvas");
    if (preview && !preview.hidden) {
      return { element: preview, kind: "image" };
    }
    if (canvas && !canvas.hidden) {
      return { element: canvas, kind: "pdf" };
    }
    return null;
  }

  function goToPage(num, canvas) {
    renderPage(num, canvas).then(function () {
      var total = getTotalPages();
      if (total > 0) {
        canvas.dataset.totalPages = String(total);
      }
      clearSelection();
      clearStoredText();
      updateNav();
    });
  }

  function hideError() {
    var box = document.getElementById("error-state");
    if (!box) return;
    box.textContent = "";
    box.hidden = true;
  }

  function showError(fileName, reason) {
    hidePreviews(
      document.getElementById("preview"),
      document.getElementById("pdf-canvas")
    );
    var box = document.getElementById("error-state");
    if (!box) return;
    box.textContent = "";
    box.appendChild(document.createTextNode('Tidak dapat membuka "'));
    var nameSpan = document.createElement("span");
    nameSpan.setAttribute("dir", "auto");
    nameSpan.textContent = fileName;
    box.appendChild(nameSpan);
    box.appendChild(document.createTextNode('": ' + reason + "."));
    box.hidden = false;
  }

  function hidePreviews(preview, canvas) {
    if (!preview || !canvas) {
      revokePreview();
      closeDocument();
      updateNav();
      return;
    }
    revokePreview();
    closeDocument();
    preview.removeAttribute("src");
    preview.alt = "";
    preview.hidden = true;
    canvas.removeAttribute("data-total-pages");
    canvas.hidden = true;
    updateNav();
  }

  function showImage(file, preview, canvas) {
    revokePreview();
    closeDocument();
    currentObjectURL = URL.createObjectURL(file);
    preview.src = currentObjectURL;
    preview.alt = file.name;
    preview.hidden = false;
    canvas.removeAttribute("data-total-pages");
    canvas.hidden = true;
    updateNav();
  }

  async function showPdf(file, preview, canvas) {
    var generation = pickedGeneration;
    revokePreview();
    await closeDocument();
    preview.removeAttribute("src");
    preview.alt = "";
    preview.hidden = true;
    updateNav();
    file
      .arrayBuffer()
      .then(function (data) {
        if (generation !== pickedGeneration) return null;
        return renderFirstPage(data, canvas);
      })
      .then(function (result) {
        if (generation !== pickedGeneration || result === null) return;
        var total = getTotalPages();
        canvas.dataset.totalPages = String(total);
        canvas.hidden = false;
        updateNav();
      })
      .catch(function (err) {
        if (generation !== pickedGeneration) return;
        if (err && err.name === "RenderingCancelledException") return;
        if (err && err.name === "PasswordException") {
          showError(file.name, REASON_ENCRYPTED);
        } else {
          showError(file.name, REASON_CORRUPT);
        }
      });
  }

  function showFile(file) {
    if (!file) return;
    pickedGeneration += 1;
    var info = document.getElementById("file-info");
    var name = document.getElementById("file-name");
    var empty = document.getElementById("empty-state");
    var preview = document.getElementById("preview");
    var canvas = document.getElementById("pdf-canvas");
    if (!info || !name || !empty || !preview || !canvas) return;
    hideError();
    clearSelection();
    clearStoredText();
    name.textContent = file.name;
    if (isImageFile(file)) {
      showImage(file, preview, canvas);
    } else if (isPdfFile(file)) {
      showPdf(file, preview, canvas);
    } else {
      showError(file.name, REASON_UNSUPPORTED);
    }
    info.hidden = false;
    empty.hidden = true;
  }

  function init() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js");
    }
    if (!window.fileLoader) return;
    var canvas = document.getElementById("pdf-canvas");
    var els = navElements();
    window.fileLoader.onFilePicked(showFile);
    initSelection({
      getSource: currentSource,
      onStableBox: function (cropCanvas) {
        requestOcr(cropCanvas);
      },
    });
    var clearBtn = document.getElementById("clear-box");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearSelection();
      });
    }
    var copyBtn = document.getElementById("copy-text");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        copyStoredText();
      });
    }
    var downloadBtn = document.getElementById("consent-download");
    var cancelBtn = document.getElementById("consent-cancel");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", function () {
        if (!pendingOcr) {
          hideConsent();
          return;
        }
        var pending = pendingOcr;
        downloadController = new AbortController();
        var signal = downloadController.signal;
        Promise.all(
          TESSDATA_URLS.map(function (url) {
            return fetch(url, { signal: signal }).then(function (response) {
              if (!response.ok) throw new Error("download failed");
              return response.arrayBuffer();
            });
          })
        ).then(
          function () {
            downloadController = null;
            hideConsent();
            requestOcr(pending.crop, pending.onProgress, pending.onError);
          },
          function () {
            downloadController = null;
          }
        );
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        if (downloadController !== null) {
          downloadController.abort();
          downloadController = null;
        }
        hideConsent();
      });
    }
    if (els.prev) {
      els.prev.addEventListener("click", function () {
        if (canvas) goToPage(getCurrentPage() - 1, canvas);
      });
    }
    if (els.next) {
      els.next.addEventListener("click", function () {
        if (canvas) goToPage(getCurrentPage() + 1, canvas);
      });
    }
    if (els.form && els.input) {
      els.form.addEventListener("submit", function (event) {
        event.preventDefault();
        var total = getTotalPages();
        var target = Number(els.input.value);
        if (
          total < 1 ||
          !isFinite(target) ||
          Math.floor(target) !== target ||
          target < 1 ||
          target > total
        ) {
          els.input.value = total > 0 ? String(getCurrentPage()) : "";
          return;
        }
        if (canvas) goToPage(target, canvas);
      });
    }
    window.addEventListener("pagehide", function () {
      if (ocrTimer !== null) {
        clearTimeout(ocrTimer);
        ocrTimer = null;
      }
      revokePreview();
      closeDocument();
      shutdownOcr();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
