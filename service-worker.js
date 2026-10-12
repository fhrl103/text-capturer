"use strict";

var SHELL_CACHE = "ekstraksi-teks-shell-v2";
var TESSDATA_CACHE = "ekstraksi-teks-tessdata-v1";
var SHELL_PREFIX = "ekstraksi-teks-shell-";
var SHELL_PATHS = [
  "",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/app.js",
  "js/fileLoader.js",
  "js/pdfRenderer.js",
  "js/ocr.js",
  "js/ocr-fit.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "vendor/pdfjs/pdf.min.mjs",
  "vendor/pdfjs/pdf.worker.min.mjs",
  "vendor/tesseract/tesseract.min.js",
  "vendor/tesseract/worker.min.js",
  "vendor/tesseract/tesseract-core-lstm.wasm.js",
  "vendor/tesseract/tesseract-core-lstm.wasm",
];

function scopeURL(path) {
  return new URL(path, self.registration.scope).href;
}

function isTessdata(url) {
  return url.indexOf("/vendor/tessdata/") !== -1;
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(function (cache) {
        return cache.addAll(SHELL_PATHS.map(scopeURL));
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (names) {
        return Promise.all(
          names.map(function (name) {
            if (
              name.indexOf(SHELL_PREFIX) === 0 &&
              name !== SHELL_CACHE
            ) {
              return caches.delete(name);
            }
            return Promise.resolve(false);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

function cacheFirst(request) {
  return caches.match(request).then(function (hit) {
    if (hit) return hit;
    return fetch(request);
  });
}

function tessdataFirst(request) {
  return fetch(request).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      return caches.open(TESSDATA_CACHE).then(function (cache) {
        return cache.put(request, copy).then(function () {
          return response;
        });
      });
    }
    return caches.match(request).then(function (hit) {
      return hit || response;
    });
  });
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      cacheFirst(request).catch(function () {
        return caches.match(scopeURL("index.html"));
      })
    );
    return;
  }
  if (isTessdata(url.href)) {
    event.respondWith(
      tessdataFirst(request).catch(function () {
        return caches.match(request);
      })
    );
    return;
  }
  event.respondWith(cacheFirst(request));
});
