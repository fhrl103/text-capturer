(function () {
  "use strict";

  function showFileName(file) {
    if (!file) return;
    var info = document.getElementById("file-info");
    var name = document.getElementById("file-name");
    var empty = document.getElementById("empty-state");
    if (!info || !name || !empty) return;
    name.textContent = file.name;
    info.hidden = false;
    empty.hidden = true;
  }

  function init() {
    if (!window.fileLoader) return;
    window.fileLoader.onFilePicked(showFileName);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
