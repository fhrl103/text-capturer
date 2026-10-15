import test from "node:test";
import assert from "node:assert/strict";

// The module logs worker instrumentation and errors to the console; mute them so
// the test report stays readable (behavior is asserted instead).
console.info = function () {};
console.error = function () {};

var crop = { width: 100, height: 50 };
var caseId = 0;

function deferred() {
  var control = {};
  control.promise = new Promise(function (resolve, reject) {
    control.resolve = resolve;
    control.reject = reject;
  });
  return control;
}

function tick() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 0);
  });
}

function makeTesseract() {
  var controls = { recognize: null };
  var created = 0;
  var terminated = 0;
  var workers = [];

  function createWorker(langs, oem, options) {
    created += 1;
    var index = created;
    var w = {
      index: index,
      langs: langs,
      oem: oem,
      options: options,
      terminated: false,
      recognize: function (image) {
        if (typeof controls.recognize === "function") {
          return controls.recognize(w, image);
        }
        return Promise.resolve({ data: { text: "text-" + index } });
      },
      terminate: function () {
        terminated += 1;
        w.terminated = true;
        return Promise.resolve();
      },
    };
    workers.push(w);
    return Promise.resolve(w);
  }

  return {
    api: { OEM: { LSTM_ONLY: 1 }, createWorker: createWorker },
    controls: controls,
    workers: workers,
    created: function () {
      return created;
    },
    terminated: function () {
      return terminated;
    },
  };
}

async function loadOcr(api) {
  globalThis.window = { Tesseract: api };
  caseId += 1;
  return import("../js/ocr.js?case=" + caseId);
}

test("first run creates a worker and a second idle run reuses it", async function () {
  var t = makeTesseract();
  var ocr = await loadOcr(t.api);

  var first = await ocr.runOcr(crop);
  var second = await ocr.runOcr(crop);

  assert.equal(first, "text-1");
  assert.equal(second, "text-1");
  assert.equal(t.created(), 1);
  assert.equal(t.terminated(), 0);
});

test("a run started while another is in flight terminates and recreates", async function () {
  var t = makeTesseract();
  var first = deferred();
  t.controls.recognize = function (w) {
    if (w.index === 1) return first.promise;
    return Promise.resolve({ data: { text: "second" } });
  };
  var ocr = await loadOcr(t.api);

  var run1 = ocr.runOcr(crop);
  await tick();
  var run2 = ocr.runOcr(crop);

  assert.equal(await run2, "second");
  assert.equal(t.terminated(), 1);
  assert.equal(t.created(), 2);

  first.resolve({ data: { text: "first" } });
  assert.equal(await run1, "");
});

test("a recognition error terminates the worker so the next run is fresh", async function () {
  var t = makeTesseract();
  t.controls.recognize = function () {
    return Promise.reject(new Error("boom"));
  };
  var ocr = await loadOcr(t.api);

  var seen = null;
  var result = await ocr.runOcr(crop, null, function (err) {
    seen = err;
  });

  assert.equal(result, "");
  assert.ok(seen instanceof Error);
  assert.equal(t.terminated(), 1);

  t.controls.recognize = function () {
    return Promise.resolve({ data: { text: "recovered" } });
  };
  assert.equal(await ocr.runOcr(crop), "recovered");
  assert.equal(t.created(), 2);
});

test("the worker is recycled after 20 completed runs", async function () {
  var t = makeTesseract();
  var ocr = await loadOcr(t.api);

  for (var i = 0; i < 20; i++) {
    await ocr.runOcr(crop);
  }
  assert.equal(t.created(), 1);

  await ocr.runOcr(crop);
  assert.equal(t.created(), 2);
  assert.equal(t.terminated(), 1);
});

test("shutdownOcr terminates the worker and the next run starts fresh", async function () {
  var t = makeTesseract();
  var ocr = await loadOcr(t.api);

  await ocr.runOcr(crop);
  await ocr.shutdownOcr();
  assert.equal(t.terminated(), 1);

  await ocr.runOcr(crop);
  assert.equal(t.created(), 2);
});

test("progress from the reused worker reaches the latest run callback", async function () {
  var t = makeTesseract();
  var ocr = await loadOcr(t.api);

  await ocr.runOcr(crop);
  var seen = [];
  await ocr.runOcr(crop, function (status, progress) {
    seen.push([status, progress]);
  });

  assert.equal(t.created(), 1);
  t.workers[0].options.logger({ status: "recognizing text", progress: 0.5 });
  assert.deepEqual(seen, [["recognizing text", 0.5]]);
});
