import { renderFirstPage, closeDocument } from "./pdfRenderer.js";

(function () {
  "use strict";

  var currentObjectURL = null;

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

  function hidePreviews(preview, canvas) {
    revokePreview();
    closeDocument();
    preview.removeAttribute("src");
    preview.alt = "";
    preview.hidden = true;
    canvas.removeAttribute("data-total-pages");
    canvas.hidden = true;
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
  }

  function showPdf(file, preview, canvas) {
    revokePreview();
    preview.removeAttribute("src");
    preview.alt = "";
    preview.hidden = true;
    file
      .arrayBuffer()
      .then(function (data) {
        return renderFirstPage(data, canvas);
      })
      .then(function (numPages) {
        canvas.dataset.totalPages = String(numPages);
        canvas.hidden = false;
      })
      .catch(function () {
        canvas.removeAttribute("data-total-pages");
        canvas.hidden = true;
      });
  }

  function showFile(file) {
    if (!file) return;
    var info = document.getElementById("file-info");
    var name = document.getElementById("file-name");
    var empty = document.getElementById("empty-state");
    var preview = document.getElementById("preview");
    var canvas = document.getElementById("pdf-canvas");
    if (!info || !name || !empty || !preview || !canvas) return;
    name.textContent = file.name;
    if (isImageFile(file)) {
      showImage(file, preview, canvas);
    } else if (isPdfFile(file)) {
      showPdf(file, preview, canvas);
    } else {
      hidePreviews(preview, canvas);
    }
    info.hidden = false;
    empty.hidden = true;
  }

  function init() {
    if (!window.fileLoader) return;
    window.fileLoader.onFilePicked(showFile);
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
