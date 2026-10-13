import assert from "node:assert/strict";
import { test } from "node:test";
import {
  componentImageFileName,
  generateComponentImage,
  isValidComponentName,
} from "../src/index.js";

/**
 * @param {string} svg
 * @returns {number}
 */
function viewBoxWidth(svg) {
  const m = /viewBox="0 0 (\d+) 25"/.exec(svg);
  assert.ok(m, "viewBox present");
  return Number(m[1]);
}

test("emits a compact, well-formed badge", () => {
  const svg = generateComponentImage("ESPHome");
  assert.match(
    svg,
    /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ 25" role="img" aria-label="ESPHome"><path d="[^"]+" fill="#000"\/><path d="[^"]+" fill="#fffffc"\/><\/svg>\n$/,
  );
  assert.ok(!svg.includes("\u2014"));
});

test("rounded rectangle uses the text width", () => {
  const svg = generateComponentImage("ESPHome");
  const vw = viewBoxWidth(svg);
  assert.ok(
    svg.includes(`<path d="M5,0H${vw - 5}a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Z"`),
  );
});

// Widths measured with the original Inkscape pipeline (viewBox = width + 10).
const inkscapeWidths = {
  ESPHome: 136,
  sensor: 95,
  bme280: 113,
  dallas_temp: 168,
  mcp23Sxx: 145,
  Wi_Fi: 74,
  AVATAR: 117,
  lvgl: 51,
  ttp229_lsf: 138,
  a: 14,
  W: 30,
  i2c: 40,
  LTR_390: 110,
  homeassistant: 212,
  VL53L0x: 121,
  // Ligature handling (fi, fl) and kerning.
  fig: 38,
  config: 91,
  fi: 19,
  fl: 18,
  AV: 41,
};

for (const [name, width] of Object.entries(inkscapeWidths)) {
  test(`width matches Inkscape for ${name}`, () => {
    assert.equal(viewBoxWidth(generateComponentImage(name)), width + 10);
  });
}

test("underscores become spaces in the label", () => {
  const svg = generateComponentImage("dallas_temp");
  assert.ok(svg.includes('aria-label="dallas temp"'));
});

test("labels are XML escaped", () => {
  const svg = generateComponentImage('a&"<>');
  assert.ok(svg.includes('aria-label="a&amp;&quot;&lt;&gt;"'));
});

test("output is deterministic and font is reused", () => {
  assert.equal(generateComponentImage("sensor"), generateComponentImage("sensor"));
});

test("every glyph subpath is closed and no -0 is emitted", () => {
  const svg = generateComponentImage("Wi_Fi 0 O S s");
  const d = /fill="#000"\/><path d="([^"]+)"/.exec(svg)?.[1] ?? "";
  assert.ok(d.length > 0);
  assert.equal(d.split("M").length, d.split("Z").length);
  assert.ok(d.endsWith("Z"));
  assert.ok(/Q/.test(d) && /L/.test(d));
  assert.ok(!/-0(?![.\d])/.test(d));
});

test("spaces and unknown characters still produce a badge", () => {
  const svg = generateComponentImage("a b");
  assert.ok(viewBoxWidth(svg) > viewBoxWidth(generateComponentImage("ab")));
});

test("name validation", () => {
  assert.equal(isValidComponentName("ESPHome"), true);
  assert.equal(isValidComponentName("wi_fi 2"), true);
  assert.equal(isValidComponentName(""), false);
  assert.equal(isValidComponentName("../etc"), false);
  assert.equal(isValidComponentName("a-b"), false);
});

test("file name is the lowercased name", () => {
  assert.equal(componentImageFileName("Wi_Fi"), "wi_fi.svg");
});
