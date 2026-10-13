var HANDLE_HIT = 22;
var MIN_BOX = 4;

var viewer = null;
var overlay = null;
var getSource = null;
var onStableBox = null;
var box = null;
var src = null;
var drag = null;

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

function viewerBox() {
  return viewer.getBoundingClientRect();
}

function sourceRect() {
  var r = src.el.getBoundingClientRect();
  var v = viewerBox();
  return {
    left: r.left - v.left,
    top: r.top - v.top,
    width: r.width,
    height: r.height,
  };
}

function toBitmap(clientX, clientY) {
  var r = sourceRect();
  return {
    x: (clientX - viewerBox().left - r.left) * (src.width / r.width),
    y: (clientY - viewerBox().top - r.top) * (src.height / r.height),
  };
}

function fitOverlay() {
  var v = viewerBox();
  var dpr = window.devicePixelRatio || 1;
  overlay.width = Math.max(1, Math.round(v.width * dpr));
  overlay.height = Math.max(1, Math.round(v.height * dpr));
  overlay.style.inlineSize = v.width + "px";
  overlay.style.blockSize = v.height + "px";
}

function boxDisplay() {
  var r = sourceRect();
  var sx = r.width / src.width;
  var sy = r.height / src.height;
  return {
    x: r.left + box.x * sx,
    y: r.top + box.y * sy,
    w: box.w * sx,
    h: box.h * sy,
  };
}

function redraw() {
  var ctx = overlay.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  var v = viewerBox();
  ctx.clearRect(0, 0, v.width, v.height);
  if (!box || !src) return;
  var d = boxDisplay();
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
}

function clampBox() {
  box.x = Math.min(Math.max(box.x, 0), src.width - 1);
  box.y = Math.min(Math.max(box.y, 0), src.height - 1);
  box.w = Math.min(Math.max(box.w, 0), src.width - box.x);
  box.h = Math.min(Math.max(box.h, 0), src.height - box.y);
}

function toDisplay(p) {
  var r = sourceRect();
  return {
    x: r.left + (p.x * r.width) / src.width,
    y: r.top + (p.y * r.height) / src.height,
  };
}

function hitHandle(p) {
  var d = toDisplay(p);
  var b = boxDisplay();
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

function onPointerDown(event) {
  refreshSource();
  if (!src) return;
  fitOverlay();
  event.preventDefault();
  try {
    overlay.setPointerCapture(event.pointerId);
  } catch (err) {}
  var p = toBitmap(event.clientX, event.clientY);
  if (box) {
    var handle = hitHandle(p);
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
  var p = toBitmap(event.clientX, event.clientY);
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
  redraw();
}

function onPointerUp(event) {
  if (!drag) return;
  drag = null;
  if (!box || box.w < MIN_BOX || box.h < MIN_BOX) {
    clearSelection();
    return;
  }
  redraw();
  if (typeof onStableBox === "function" && src) {
    onStableBox(cropBox());
  }
}

export function clearSelection() {
  box = null;
  drag = null;
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
  });
  window.addEventListener("resize", function () {
    if (box) {
      refreshSource();
      if (src) {
        fitOverlay();
        redraw();
      }
    }
  });
}
