import { getDocument, GlobalWorkerOptions } from "../vendor/pdfjs/pdf.min.mjs";

GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.mjs";

var currentPdf = null;

export function closeDocument() {
  if (currentPdf === null) return Promise.resolve();
  var pdf = currentPdf;
  currentPdf = null;
  return pdf.destroy();
}

export async function renderFirstPage(data, canvas) {
  await closeDocument();
  var pdf = await getDocument({ data: data }).promise;
  currentPdf = pdf;
  var page = await pdf.getPage(1);
  var viewport = page.getViewport({ scale: 2 });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page
    .render({ canvasContext: canvas.getContext("2d"), viewport: viewport })
    .promise.then(function () {
      return page.cleanup();
    });
  return pdf.numPages;
}
