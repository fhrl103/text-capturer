import { getDocument, GlobalWorkerOptions } from "../vendor/pdfjs/pdf.min.mjs";

GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.mjs";

var currentPdf = null;
var currentPage = null;
var currentPageNum = 0;
var totalPages = 0;
var activeRenderTask = null;
var latestRequestId = 0;
var renderQueue = Promise.resolve();

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
  var pdf = await getDocument({ data: data }).promise;
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
  if (currentPage !== null) {
    var oldPage = currentPage;
    currentPage = null;
    await oldPage.cleanup();
  }
  var page = await currentPdf.getPage(num);
  currentPage = page;
  var viewport = page.getViewport({ scale: 2 });
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
