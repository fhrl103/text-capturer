import { fitWithin } from "./ocr-fit.js";

var MAX_EDGE = 2000;
var worker = null;
var currentRun = null;
var runId = 0;

function getTesseract() {
  if (typeof window !== "undefined" && window.Tesseract) {
    return window.Tesseract;
  }
  throw new Error(
    "OCR tidak tersedia: vendor/tesseract/tesseract.min.js tidak dimuat. Periksa koneksi offline, tanpa CDN."
  );
}

function downscale(source) {
  var size = fitWithin(source.width, source.height, MAX_EDGE);
  if (size.width === source.width && size.height === source.height) {
    return source;
  }
  var canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext("2d").drawImage(source, 0, 0, size.width, size.height);
  return canvas;
}

export async function shutdownOcr() {
  if (worker === null) return;
  var old = worker;
  worker = null;
  await old.terminate();
}

export function runOcr(cropCanvas, onProgress, onError) {
  var id = ++runId;
  shutdownOcr();
  var run = runInner(id, cropCanvas, onProgress, onError);
  currentRun = run;
  return run;
}

async function runInner(id, cropCanvas, onProgress, onError) {
  try {
    var Tesseract = getTesseract();
    shutdownOcr().catch(function (err) {
      console.error("ocr: terminate failed", err);
    });
    var startedAt = Date.now();
    var oem =
      Tesseract.OEM && typeof Tesseract.OEM.LSTM_ONLY !== "undefined"
        ? Tesseract.OEM.LSTM_ONLY
        : 1;
    var fresh = await Tesseract.createWorker("ara+eng", oem, {
      workerPath: "vendor/tesseract/worker.min.js",
      corePath: "vendor/tesseract/tesseract-core-lstm.wasm.js",
      langPath: "vendor/tessdata/",
      cacheMethod: "none",
      gzip: false,
      logger: function (message) {
        if (typeof onProgress === "function" && message) {
          onProgress(message.status, message.progress);
        }
      },
    });
    if (id !== runId) {
      try {
        fresh.terminate();
      } catch (err) {
        console.error("ocr: terminate failed", err);
      }
      return "";
    }
    worker = fresh;
    console.info("ocr: worker created in " + (Date.now() - startedAt) + " ms");
    var recognizeStartedAt = Date.now();
    var result = await worker.recognize(downscale(cropCanvas));
    console.info("ocr: recognize took " + (Date.now() - recognizeStartedAt) + " ms");
    return result && result.data ? result.data.text : "";
  } catch (err) {
    if (id !== runId) {
      return "";
    }
    console.error("ocr: recognition failed", err);
    if (typeof onError === "function") {
      try {
        onError(err);
      } catch (callbackErr) {
        console.error("ocr: onError callback failed", callbackErr);
      }
    }
    return "";
  }
}
