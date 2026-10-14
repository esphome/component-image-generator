#!/usr/bin/env node
// Optional fidelity check: compares the JS generator against the original
// Inkscape based pipeline (text-to-path export) for a set of names.
//
// Requires: inkscape on PATH, Montserrat Black installed where fontconfig can
// find it (family "Montserrat"), and dev dependencies (npm ci).
// Not part of CI. Usage: node scripts/compare-inkscape.mjs [name ...]
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { generateComponentImage } from "../src/index.js";

const DEFAULT_NAMES = [
  "ESPHome",
  "sensor",
  "bme280",
  "dallas_temp",
  "mcp23Sxx",
  "Wi_Fi",
  "AVATAR",
  "lvgl",
  "ttp229_lsf",
  "a",
  "W",
  "i2c",
  "LTR_390",
  "homeassistant",
  "VL53L0x",
];

const TEMPLATE = (
  /** @type {string} */ text,
  /** @type {string} */ vw,
  /** @type {string} */ ph,
) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} 25">
   <path d="M5,0 H${ph} a5 5 0 0 1 5 5 v15 a5 5 0 0 1 -5 5 H5 a5 5 0 0 1 -5 -5 V5 a5 5 0 0 1 5 -5 Z" style="fill:#000;" />
   <text id="component-text" x="5" y="21" style="letter-spacing:1.1px;fill:#fffffc;font-weight:900;font-size:25px;font-family:Montserrat">${text}</text>
</svg>`;

/**
 * Run the original pipeline (query width, then object-to-path export).
 * @param {string} dir
 * @param {string} name
 * @returns {{ svg: string, width: number }}
 */
function inkscapeImage(dir, name) {
  const file = join(dir, "ink.svg");
  const text = name.replaceAll("_", " ");
  writeFileSync(file, TEMPLATE(text, "VW", "PH"));
  const raw = execFileSync(
    "inkscape",
    ["--actions=select-by-id:component-text; query-width;", file],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  const width = Math.round(Number(raw.trim()));
  writeFileSync(file, TEMPLATE(text, String(width + 10), String(width + 5)));
  execFileSync(
    "inkscape",
    [
      `--actions=select-by-id:component-text; object-to-path;export-plain-svg;export-filename:${file};export-do`,
      file,
    ],
    { stdio: "ignore" },
  );
  return { svg: readFileSync(file, "utf8"), width };
}

/**
 * @param {string} svg
 * @returns {Uint8Array}
 */
function raster(svg) {
  return new Resvg(svg, { fitTo: { mode: "zoom", value: 8 } }).render().pixels;
}

const names = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_NAMES;
const dir = mkdtempSync(join(tmpdir(), "compare-"));
let failed = false;
console.log("name\tink_w\tjs_w\tdiff_pct");
for (const name of names) {
  const ink = inkscapeImage(dir, name);
  const js = generateComponentImage(name);
  const jsWidth = Number(/viewBox="0 0 (\d+)/.exec(js)?.[1]) - 10;
  const a = raster(ink.svg);
  const b = raster(js);
  let diff = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (
      Math.abs(a[i] - b[i]) > 32 ||
      Math.abs(a[i + 1] - b[i + 1]) > 32 ||
      Math.abs(a[i + 2] - b[i + 2]) > 32 ||
      Math.abs(a[i + 3] - b[i + 3]) > 32
    )
      diff++;
  }
  if (jsWidth !== ink.width) failed = true;
  console.log(
    `${name}\t${ink.width}\t${jsWidth}\t${((diff / (a.length / 4)) * 100).toFixed(3)}`,
  );
}
rmSync(dir, { recursive: true, force: true });
process.exitCode = failed ? 1 : 0;
