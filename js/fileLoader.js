(function () {
  "use strict";

  function onFilePicked(callback) {
    var input = document.getElementById("file-input");
    if (!input) return function () {};
    function handleChange() {
      var file = input.files && input.files[0] ? input.files[0] : null;
      callback(file);
    }
    input.addEventListener("change", handleChange);
    return function () {
      input.removeEventListener("change", handleChange);
    };
  }

  window.fileLoader = {
    onFilePicked: onFilePicked,
  };
})();
