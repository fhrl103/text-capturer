(function () {
  "use strict";

  var currentObjectURL = null;

  function isImageFile(file) {
    if (file.type && file.type.indexOf("image/") === 0) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || "");
  }

  function revokePreview() {
    if (currentObjectURL !== null) {
      URL.revokeObjectURL(currentObjectURL);
      currentObjectURL = null;
    }
  }

  function showFile(file) {
    if (!file) return;
    var info = document.getElementById("file-info");
    var name = document.getElementById("file-name");
    var empty = document.getElementById("empty-state");
    var preview = document.getElementById("preview");
    if (!info || !name || !empty || !preview) return;
    revokePreview();
    name.textContent = file.name;
    if (isImageFile(file)) {
      currentObjectURL = URL.createObjectURL(file);
      preview.src = currentObjectURL;
      preview.alt = file.name;
      preview.hidden = false;
    } else {
      preview.removeAttribute("src");
      preview.alt = "";
      preview.hidden = true;
    }
    info.hidden = false;
    empty.hidden = true;
  }

  function init() {
    if (!window.fileLoader) return;
    window.fileLoader.onFilePicked(showFile);
    window.addEventListener("pagehide", revokePreview);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
