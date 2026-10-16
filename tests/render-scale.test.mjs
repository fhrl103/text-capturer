import test from "node:test";
import assert from "node:assert/strict";
import { computeDisplayScale, computeRegionLayout } from "../js/pdfRenderer.js";

function almostEqual(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    "expected " + expected + ", got " + actual
  );
}

test("container as wide as the page at dpr 1 renders at scale 1", function () {
  almostEqual(computeDisplayScale(612, 792, 612, 1), 1);
});

test("phone width with dpr 3 caps dpr at 2", function () {
  almostEqual(computeDisplayScale(612, 792, 320, 3), 640 / 612);
});

test("small page is scaled up to fill the container", function () {
  almostEqual(computeDisplayScale(100, 200, 1000, 1), 10);
});

test("large page is scaled down and capped by the max long edge", function () {
  almostEqual(computeDisplayScale(2000, 6000, 1000, 1), 0.4);
});

test("very wide container is capped by the max long edge", function () {
  almostEqual(computeDisplayScale(612, 792, 100000, 2), 2400 / 792);
});

test("unknown width falls back to the fixed scale", function () {
  assert.equal(computeDisplayScale(612, 792, 0, 1), 2);
});

test("invalid page size falls back to the fixed scale", function () {
  assert.equal(computeDisplayScale(0, 792, 612, 1), 2);
});

test("dpr below 1 is treated as 1", function () {
  almostEqual(computeDisplayScale(612, 792, 612, 0), 1);
});

test("small region is rendered at the max scale", function () {
  // displayScale 2 -> 20x10 pt; target 2000 needs scale 100, capped at 4.
  var l = computeRegionLayout(
    { x: 100, y: 200, width: 40, height: 20 },
    2,
    2000
  );
  assert.equal(l.renderScale, 4);
  assert.equal(l.width, 80);
  assert.equal(l.height, 40);
  assert.equal(l.offsetX, -200);
  assert.equal(l.offsetY, -400);
});

test("full-page region targets the given long edge", function () {
  var l = computeRegionLayout({ x: 0, y: 0, width: 612, height: 792 }, 1, 2000);
  almostEqual(l.renderScale, 2000 / 792);
  assert.equal(l.width, 1546);
  assert.equal(l.height, 2000);
  almostEqual(l.offsetX, 0);
  almostEqual(l.offsetY, 0);
});

test("huge region is capped at the target long edge", function () {
  // 1200x1600 pt region: target 2000 / 1600 = 1.25, not raised by any floor.
  var l = computeRegionLayout(
    { x: 0, y: 0, width: 1200, height: 1600 },
    1,
    2000
  );
  almostEqual(l.renderScale, 1.25);
  assert.equal(l.width, 1500);
  assert.equal(l.height, 2000);
});

test("region layout falls back to the fixed display scale", function () {
  var l = computeRegionLayout({ x: 0, y: 0, width: 20, height: 20 }, 0, 2000);
  assert.equal(l.renderScale, 4);
  assert.equal(l.width, 40);
  assert.equal(l.height, 40);
});
