var pdfjsModule = null;
var workerSrcConfigured = false;

// pdf.js is ~458 KB; load it on first PDF use instead of on every page load.
function loadPdfJs() {
  if (pdfjsModule !== null) return Promise.resolve(pdfjsModule);
  return import("../vendor/pdfjs/pdf.min.mjs").then(function (mod) {
    if (!workerSrcConfigured) {
      mod.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.mjs";
      workerSrcConfigured = true;
    }
    pdfjsModule = mod;
    return mod;
  });
}

var MAX_DISPLAY_DPR = 2;
var MAX_DISPLAY_LONG_EDGE = 2400;
var FALLBACK_DISPLAY_SCALE = 2;
var REGION_MAX_SCALE = 4;
var DEFAULT_REGION_TARGET = 2000;

var currentPdf = null;
var currentPage = null;
var currentPageNum = 0;
var totalPages = 0;
var activeRenderTask = null;
var activeRegionTask = null;
var latestRequestId = 0;
var renderQueue = Promise.resolve();
var displayScale = FALLBACK_DISPLAY_SCALE;

// Pure helper: pick a display scale so the bitmap roughly matches the space the
// canvas occupies on screen (cssWidth x device pixel ratio), capped so large
// pages do not allocate huge canvases. Falls back to the old fixed scale when
// the available width is unknown.
export function computeDisplayScale(ptWidth, ptHeight, cssWidth, dpr) {
  if (!(ptWidth > 0) || !(cssWidth > 0)) return FALLBACK_DISPLAY_SCALE;
  var effectiveDpr = Math.min(dpr > 0 ? dpr : 1, MAX_DISPLAY_DPR);
  var scale = (cssWidth * effectiveDpr) / ptWidth;
  var longEdgePt = Math.max(ptWidth, ptHeight);
  if (longEdgePt > 0) {
    scale = Math.min(scale, MAX_DISPLAY_LONG_EDGE / longEdgePt);
  }
  if (!isFinite(scale) || scale <= 0) return FALLBACK_DISPLAY_SCALE;
  return scale;
}

export function getCurrentPage() {
  return currentPageNum;
}

export function getTotalPages() {
  return totalPages;
}

export function closeDocument() {
  latestRequestId += 1;
  if (activeRenderTask !== null) {
    try {
      activeRenderTask.cancel();
    } catch (err) {}
    activeRenderTask = null;
  }
  if (activeRegionTask !== null) {
    try {
      activeRegionTask.cancel();
    } catch (err) {}
    activeRegionTask = null;
  }
  currentPage = null;
  currentPageNum = 0;
  totalPages = 0;
  var pdf = currentPdf;
  currentPdf = null;
  if (pdf === null || typeof pdf.destroy !== "function") {
    return Promise.resolve();
  }
  try {
    return Promise.resolve(pdf.destroy()).catch(function (err) {
      console.error("pdf: destroy failed", err);
    });
  } catch (err) {
    console.error("pdf: destroy failed", err);
    return Promise.resolve();
  }
}

export async function openDocument(data) {
  await closeDocument();
  var mod = await loadPdfJs();
  var pdf = await mod.getDocument({ data: data }).promise;
  currentPdf = pdf;
  currentPageNum = 0;
  totalPages = pdf.numPages;
  return totalPages;
}

async function doRender(num, canvas) {
  if (activeRenderTask !== null) {
    try {
      activeRenderTask.cancel();
    } catch (err) {}
    activeRenderTask = null;
  }
  if (activeRegionTask !== null) {
    try {
      activeRegionTask.cancel();
    } catch (err) {}
    activeRegionTask = null;
  }
  if (currentPage !== null) {
    var oldPage = currentPage;
    currentPage = null;
    await oldPage.cleanup();
  }
  var page = await currentPdf.getPage(num);
  currentPage = page;
  var base = page.getViewport({ scale: 1 });
  var parent = canvas.parentElement;
  var cssWidth = parent ? parent.clientWidth : 0;
  var dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  displayScale = computeDisplayScale(base.width, base.height, cssWidth, dpr);
  var viewport = page.getViewport({ scale: displayScale });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  var task = page.render({
    canvasContext: canvas.getContext("2d"),
    viewport: viewport,
  });
  activeRenderTask = task;
  try {
    await task.promise;
  } catch (err) {
    if (err && err.name === "RenderingCancelledException") return currentPageNum;
    throw err;
  } finally {
    if (activeRenderTask === task) activeRenderTask = null;
  }
  currentPageNum = num;
  return currentPageNum;
}

export function renderPage(num, canvas) {
  if (currentPdf === null) return Promise.resolve(0);
  if (num < 1 || num > totalPages) return Promise.resolve(currentPageNum);
  var requestId = (latestRequestId += 1);
  renderQueue = renderQueue.then(function () {
    if (requestId !== latestRequestId || currentPdf === null) {
      return currentPageNum;
    }
    return doRender(num, canvas);
  });
  return renderQueue;
}

export function renderFirstPage(data, canvas) {
  return openDocument(data).then(function () {
    return renderPage(1, canvas);
  });
}

// Pure helper: turn a rect in display-bitmap pixels into the page-units scale,
// crop canvas size and viewport offset used to re-render that region. The long
// edge targets `targetLongEdge` device pixels (so the crop is never larger than
// the recognition downscale) and the scale is capped so tiny boxes are not
// upscaled without bound.
export function computeRegionLayout(rect, displayScale, targetLongEdge) {
  var scale = displayScale > 0 ? displayScale : FALLBACK_DISPLAY_SCALE;
  var widthPt = rect.width / scale;
  var heightPt = rect.height / scale;
  var target = targetLongEdge > 0 ? targetLongEdge : DEFAULT_REGION_TARGET;
  var longEdgePt = Math.max(widthPt, heightPt);
  var renderScale = REGION_MAX_SCALE;
  if (longEdgePt > 0) {
    renderScale = Math.min(REGION_MAX_SCALE, target / longEdgePt);
  }
  return {
    renderScale: renderScale,
    width: Math.max(1, Math.ceil(widthPt * renderScale)),
    height: Math.max(1, Math.ceil(heightPt * renderScale)),
    offsetX: -(rect.x / scale) * renderScale,
    offsetY: -(rect.y / scale) * renderScale,
  };
}

// Re-renders one page region at high resolution and returns it as a canvas. The
// rect is in display-bitmap pixels (relative to the rendered canvas); it is
// mapped to page units via the display scale used for that render. Used for the
// OCR crop so the adaptive display scale never lowers OCR resolution.
export async function renderRegion(num, rect, targetLongEdge) {
  if (currentPdf === null) throw new Error("pdf: no document to render");
  var page = await currentPdf.getPage(num);
  var layout = computeRegionLayout(rect, displayScale, targetLongEdge);
  if (activeRegionTask !== null) {
    try {
      activeRegionTask.cancel();
    } catch (err) {}
    activeRegionTask = null;
  }
  // offsetX/offsetY shift the viewport in output pixels, so the region's
  // top-left lands at (0, 0) on the crop canvas.
  var viewport = page.getViewport({
    scale: layout.renderScale,
    offsetX: layout.offsetX,
    offsetY: layout.offsetY,
  });
  var canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  var task = page.render({
    canvasContext: ctx,
    viewport: viewport,
  });
  activeRegionTask = task;
  try {
    await task.promise;
  } finally {
    if (activeRegionTask === task) activeRegionTask = null;
  }
  return canvas;
}
