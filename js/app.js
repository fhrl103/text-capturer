import {
  renderFirstPage,
  renderPage,
  getCurrentPage,
  getTotalPages,
  closeDocument,
} from "./pdfRenderer.js";

(function () {
  "use strict";

  var currentObjectURL = null;
  var pickedGeneration = 0;

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

  function goToPage(num, canvas) {
    renderPage(num, canvas).then(function () {
      var total = getTotalPages();
      if (total > 0) {
        canvas.dataset.totalPages = String(total);
      }
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

  function showPdf(file, preview, canvas) {
    var generation = pickedGeneration;
    revokePreview();
    closeDocument();
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
      revokePreview();
      closeDocument();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
