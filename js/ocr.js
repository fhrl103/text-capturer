import { fitWithin } from "./ocr-fit.js";

var MAX_EDGE = 2000;
var LANGS = "ara+eng";
var LSTM_ONLY_OEM = 1;
var RUNS_BEFORE_RECYCLE = 20;

var worker = null;
var workerLangs = null;
var workerRuns = 0;
var busy = false;
var progressCb = null;
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

function logProgress(message) {
  if (typeof progressCb === "function" && message) {
    progressCb(message.status, message.progress);
  }
}

function safeTerminate(target) {
  try {
    return Promise.resolve(target.terminate()).catch(function (err) {
      console.error("ocr: terminate failed", err);
    });
  } catch (err) {
    console.error("ocr: terminate failed", err);
    return Promise.resolve();
  }
}

function terminateWorker() {
  if (worker === null) return Promise.resolve();
  var old = worker;
  worker = null;
  workerLangs = null;
  workerRuns = 0;
  return safeTerminate(old);
}

function spawnWorker() {
  var Tesseract = getTesseract();
  var oem =
    Tesseract.OEM && typeof Tesseract.OEM.LSTM_ONLY !== "undefined"
      ? Tesseract.OEM.LSTM_ONLY
      : LSTM_ONLY_OEM;
  var startedAt = Date.now();
  return Tesseract.createWorker(LANGS, oem, {
    workerPath: "vendor/tesseract/worker.min.js",
    corePath: "vendor/tesseract/tesseract-core-lstm.wasm.js",
    langPath: "vendor/tessdata/",
    cacheMethod: "none",
    gzip: false,
    logger: logProgress,
  }).then(function (created) {
    console.info("ocr: worker created in " + (Date.now() - startedAt) + " ms");
    return created;
  });
}

async function runInner(id, cropCanvas, onError) {
  var reusable =
    !busy &&
    worker !== null &&
    workerLangs === LANGS &&
    workerRuns < RUNS_BEFORE_RECYCLE;
  busy = true;
  var active = null;
  try {
    if (!reusable) {
      // Cancel an in-flight run, drop a stale/foreign-language worker, or recycle.
      await terminateWorker();
    }
    if (id !== runId) return "";
    if (reusable) {
      active = worker;
      console.info("ocr: worker reused");
    } else {
      active = await spawnWorker();
      if (id !== runId) {
        await safeTerminate(active);
        active = null;
        return "";
      }
      worker = active;
      workerLangs = LANGS;
      workerRuns = 0;
    }
    var recognizeStartedAt = Date.now();
    var result = await active.recognize(downscale(cropCanvas));
    console.info(
      "ocr: recognize took " + (Date.now() - recognizeStartedAt) + " ms"
    );
    if (id !== runId) return "";
    workerRuns += 1;
    return result && result.data ? result.data.text : "";
  } catch (err) {
    if (active !== null && worker === active) {
      await terminateWorker();
    }
    if (id !== runId) return "";
    console.error("ocr: recognition failed", err);
    if (typeof onError === "function") {
      try {
        onError(err);
      } catch (callbackErr) {
        console.error("ocr: onError callback failed", callbackErr);
      }
    }
    return "";
  } finally {
    if (id === runId) busy = false;
  }
}

export async function shutdownOcr() {
  busy = false;
  progressCb = null;
  await terminateWorker();
}

export function runOcr(cropCanvas, onProgress, onError) {
  var id = ++runId;
  progressCb = onProgress;
  var run = runInner(id, cropCanvas, onError);
  currentRun = run;
  return run;
}
