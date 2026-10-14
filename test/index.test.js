import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  componentImageFileName,
  generateComponentImage,
  isValidComponentName,
  renderComponentBadge,
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
    svg.includes(
      `<path d="M5,0H${vw - 5}a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Z"`,
    ),
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
  assert.equal(
    generateComponentImage("sensor"),
    generateComponentImage("sensor"),
  );
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

test("renderComponentBadge returns the badge parts", () => {
  const badge = renderComponentBadge("dallas_temp");
  assert.equal(badge.label, "dallas temp");
  assert.equal(badge.height, 25);
  assert.equal(badge.width, 178);
  assert.equal(badge.viewBox, "0 0 178 25");
  assert.match(
    badge.body,
    /^<path d="[^"]+" fill="#000"\/><path d="[^"]+" fill="#fffffc"\/>$/,
  );
  assert.ok(Object.isFrozen(badge));
});

test("generateComponentImage is built from renderComponentBadge", () => {
  const badge = renderComponentBadge("ESPHome");
  assert.equal(
    generateComponentImage("ESPHome"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${badge.viewBox}" role="img" aria-label="ESPHome">${badge.body}</svg>\n`,
  );
});

for (const name of ["", "   "]) {
  test(`name ${JSON.stringify(name)} renders only the background`, () => {
    const badge = renderComponentBadge(name);
    assert.equal(badge.width, 10);
    assert.equal(badge.viewBox, "0 0 10 25");
    assert.equal(badge.body.match(/<path /g)?.length, 1);
    assert.ok(!badge.body.includes('d="Z"'));
    assert.ok(!generateComponentImage(name).includes("#fffffc"));
  });
}

test("embedded font matches the bundled TTF", async () => {
  const { default: base64 } = await import("../src/font-data.js");
  const ttf = readFileSync(
    new URL("../ttf-montserrat/static/Montserrat-Black.ttf", import.meta.url),
  );
  assert.ok(Buffer.from(base64, "base64").equals(ttf));
});

test("embed-font script regenerates src/font-data.js exactly", () => {
  const dir = mkdtempSync(join(tmpdir(), "embed-font-"));
  try {
    const out = join(dir, "font-data.js");
    execFileSync(process.execPath, [
      fileURLToPath(new URL("../scripts/embed-font.mjs", import.meta.url)),
      out,
    ]);
    assert.equal(
      readFileSync(out, "utf8"),
      readFileSync(new URL("../src/font-data.js", import.meta.url), "utf8"),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
