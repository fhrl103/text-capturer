var HANDLE_HIT = 22;
var MIN_BOX = 4;
var COPY_GAP = 8;

var viewer = null;
var overlay = null;
var getSource = null;
var onStableBox = null;
var box = null;
var src = null;
var drag = null;
var pendingPoint = null;
var rafId = null;

function refreshSource() {
  src = null;
  if (typeof getSource !== "function") return;
  var found = getSource();
  if (!found || !found.element) return;
  var el = found.element;
  var width = 0;
  var height = 0;
  if (found.kind === "pdf") {
    width = el.width;
    height = el.height;
  } else if (found.kind === "image") {
    if (!el.complete || !el.naturalWidth) return;
    width = el.naturalWidth;
    height = el.naturalHeight;
  } else {
    return;
  }
  if (width < 1 || height < 1) return;
  src = { el: el, width: width, height: height };
}

// Reads every layout value the drag needs exactly once, so the pointer handlers
// never interleave getBoundingClientRect with style writes (layout thrash).
function computeGeometry() {
  var v = viewer.getBoundingClientRect();
  var r = src.el.getBoundingClientRect();
  return {
    vLeft: v.left,
    vTop: v.top,
    vWidth: v.width,
    vHeight: v.height,
    sLeft: r.left - v.left,
    sTop: r.top - v.top,
    sWidth: r.width,
    sHeight: r.height,
  };
}

// Sizes only the canvas backing store; the layout box (and therefore the
// pointer hit area) is kept full-size by `#select-overlay { inline-size: 100%;
// block-size: 100% }` in CSS, so a drag can start anywhere on the page.
function sizeOverlay(g) {
  var dpr = window.devicePixelRatio || 1;
  overlay.width = Math.max(1, Math.round(g.vWidth * dpr));
  overlay.height = Math.max(1, Math.round(g.vHeight * dpr));
}

function toBitmap(clientX, clientY, g) {
  return {
    x: (clientX - g.vLeft - g.sLeft) * (src.width / g.sWidth),
    y: (clientY - g.vTop - g.sTop) * (src.height / g.sHeight),
  };
}

function toDisplay(p, g) {
  return {
    x: g.sLeft + (p.x * g.sWidth) / src.width,
    y: g.sTop + (p.y * g.sHeight) / src.height,
  };
}

function boxDisplay(g) {
  var sx = g.sWidth / src.width;
  var sy = g.sHeight / src.height;
  return {
    x: g.sLeft + box.x * sx,
    y: g.sTop + box.y * sy,
    w: box.w * sx,
    h: box.h * sy,
  };
}

function redraw(g) {
  var ctx = overlay.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, g.vWidth, g.vHeight);
  if (!box || !src) return;
  var d = boxDisplay(g);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#0F766E";
  ctx.strokeRect(d.x, d.y, d.w, d.h);
  ctx.fillStyle = "#FFFFFF";
  var corners = [
    [d.x, d.y],
    [d.x + d.w, d.y],
    [d.x, d.y + d.h],
    [d.x + d.w, d.y + d.h],
  ];
  for (var i = 0; i < corners.length; i++) {
    ctx.fillRect(corners[i][0] - 6, corners[i][1] - 6, 12, 12);
    ctx.strokeRect(corners[i][0] - 6, corners[i][1] - 6, 12, 12);
  }
  placeCopyButton(g);
}

function placeCopyButton(g) {
  var button = document.getElementById("copy-text");
  if (!button || button.hidden || !box || !src) return;
  if (g.vWidth < 1 || g.vHeight < 1) return;
  var d = boxDisplay(g);
  var bw = button.offsetWidth;
  var bh = button.offsetHeight;
  if (!bw || !bh) return;
  var left = Math.min(d.x + d.w, g.vWidth - bw);
  var top = d.y + d.h + COPY_GAP;
  if (top + bh > g.vHeight) {
    top = d.y - bh - COPY_GAP;
  }
  button.style.insetInlineStart = Math.max(0, left) + "px";
  button.style.insetBlockStart = Math.max(0, top) + "px";
}

function clampBox() {
  box.x = Math.min(Math.max(box.x, 0), src.width - 1);
  box.y = Math.min(Math.max(box.y, 0), src.height - 1);
  box.w = Math.min(Math.max(box.w, 0), src.width - box.x);
  box.h = Math.min(Math.max(box.h, 0), src.height - box.y);
}

function hitHandle(p, g) {
  var d = toDisplay(p, g);
  var b = boxDisplay(g);
  var pts = {
    nw: [b.x, b.y],
    ne: [b.x + b.w, b.y],
    sw: [b.x, b.y + b.h],
    se: [b.x + b.w, b.y + b.h],
  };
  var keys = ["nw", "ne", "sw", "se"];
  for (var i = 0; i < keys.length; i++) {
    if (
      Math.abs(d.x - pts[keys[i]][0]) <= HANDLE_HIT &&
      Math.abs(d.y - pts[keys[i]][1]) <= HANDLE_HIT
    ) {
      return keys[i];
    }
  }
  return null;
}

function insideBox(p) {
  return (
    p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h
  );
}

function cropBox() {
  var x = Math.min(Math.max(Math.round(box.x), 0), src.width - 1);
  var y = Math.min(Math.max(Math.round(box.y), 0), src.height - 1);
  var w = Math.max(1, Math.min(Math.round(box.w), src.width - x));
  var h = Math.max(1, Math.min(Math.round(box.h), src.height - y));
  var canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(src.el, x, y, w, h, 0, 0, w, h);
  return canvas;
}

function updateBox(clientX, clientY, g) {
  var p = toBitmap(clientX, clientY, g);
  if (drag.mode === "new") {
    box = {
      x: Math.min(drag.sx, p.x),
      y: Math.min(drag.sy, p.y),
      w: Math.abs(p.x - drag.sx),
      h: Math.abs(p.y - drag.sy),
    };
  } else if (drag.mode === "move") {
    box.x = p.x - drag.dx;
    box.y = p.y - drag.dy;
  } else {
    var o = drag.orig;
    var hasW = drag.handle.indexOf("w") !== -1;
    var hasN = drag.handle.indexOf("n") !== -1;
    var nx = hasW ? p.x : o.x;
    var nx2 = hasW ? o.x + o.w : p.x;
    var ny = hasN ? p.y : o.y;
    var ny2 = hasN ? o.y + o.h : p.y;
    box.x = Math.min(nx, nx2);
    box.w = Math.abs(nx2 - nx);
    box.y = Math.min(ny, ny2);
    box.h = Math.abs(ny2 - ny);
  }
  clampBox();
}

// Draws at most once per animation frame, using the latest pointer position.
function onFrame() {
  rafId = null;
  if (!pendingPoint || !drag || !src) {
    pendingPoint = null;
    return;
  }
  var p = pendingPoint;
  pendingPoint = null;
  var g = computeGeometry();
  updateBox(p.x, p.y, g);
  redraw(g);
}

// Applies any queued pointer position immediately (used on pointerup so the
// final box and crop match the last pointer event).
function applyPending() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (!pendingPoint || !drag || !src) {
    pendingPoint = null;
    return;
  }
  var p = pendingPoint;
  pendingPoint = null;
  var g = computeGeometry();
  updateBox(p.x, p.y, g);
  redraw(g);
}

function onPointerDown(event) {
  refreshSource();
  if (!src) return;
  event.preventDefault();
  try {
    overlay.setPointerCapture(event.pointerId);
  } catch (err) {}
  var g = computeGeometry();
  sizeOverlay(g);
  var p = toBitmap(event.clientX, event.clientY, g);
  if (box) {
    var handle = hitHandle(p, g);
    if (handle) {
      drag = { mode: "resize", handle: handle, orig: { x: box.x, y: box.y, w: box.w, h: box.h } };
      return;
    }
    if (insideBox(p)) {
      drag = { mode: "move", dx: p.x - box.x, dy: p.y - box.y };
      return;
    }
  }
  drag = { mode: "new", sx: p.x, sy: p.y };
  box = { x: p.x, y: p.y, w: 0, h: 0 };
}

function onPointerMove(event) {
  if (!drag || !src) return;
  event.preventDefault();
  pendingPoint = { x: event.clientX, y: event.clientY };
  if (rafId === null) {
    rafId = requestAnimationFrame(onFrame);
  }
}

function onPointerUp() {
  if (!drag) return;
  applyPending();
  drag = null;
  if (!box || box.w < MIN_BOX || box.h < MIN_BOX) {
    clearSelection();
    return;
  }
  if (typeof onStableBox === "function" && src) {
    onStableBox(cropBox());
  }
}

function relayout() {
  if (!box) return;
  refreshSource();
  if (!src) return;
  var g = computeGeometry();
  sizeOverlay(g);
  redraw(g);
}

export function clearSelection() {
  box = null;
  drag = null;
  pendingPoint = null;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (overlay) {
    var ctx = overlay.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  }
}

export function hasSelection() {
  return box !== null;
}

export function initSelection(options) {
  viewer = document.getElementById("viewer");
  overlay = document.getElementById("select-overlay");
  if (!viewer || !overlay || !options) return;
  getSource = options.getSource;
  onStableBox = options.onStableBox;
  overlay.addEventListener("pointerdown", onPointerDown);
  overlay.addEventListener("pointermove", onPointerMove);
  overlay.addEventListener("pointerup", onPointerUp);
  overlay.addEventListener("pointercancel", function () {
    drag = null;
    pendingPoint = null;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });
  window.addEventListener("resize", relayout);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(relayout).observe(viewer);
  }
}
