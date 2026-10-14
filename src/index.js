import { Buffer } from "node:buffer";
import opentype from "opentype.js";
import FONT_BASE64 from "./font-data.js";
import { readKerning } from "./kerning.js";
import { createLigatureSubstituter } from "./ligatures.js";

/** Badge height in SVG user units. */
const HEIGHT = 25;
/** Text origin, baseline and size, matching the original template. */
const TEXT_X = 5;
const TEXT_BASELINE = 21;
const FONT_SIZE = 25;
/** Extra space after each glyph, in px. */
const LETTER_SPACING = 1.1;

/**
 * @typedef {object} LoadedFont
 * @property {import("opentype.js").Font} font
 * @property {import("./kerning.js").KerningTable} kerning
 * @property {(glyphs: number[]) => { glyph: number, chars: number }[]} substitute
 */

/** @type {LoadedFont | undefined} */
let cachedFont;

/**
 * Load Montserrat Black once and reuse it.
 * @returns {LoadedFont}
 */
function getFont() {
  if (cachedFont === undefined) {
    const buf = Buffer.from(FONT_BASE64, "base64");
    const bytes = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );
    const font = opentype.parse(bytes);
    const { gpos, gsub } = font.tables;
    cachedFont = {
      font,
      kerning: readKerning(bytes, gpos.features),
      substitute: createLigatureSubstituter(gsub.features, gsub.lookups),
    };
  }
  return cachedFont;
}

/**
 * Format a number with at most 2 decimals and no trailing zeros.
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  // `+ 0` turns -0 into 0 so we never emit "-0".
  return String(Math.round(n * 100) / 100 + 0);
}

/**
 * Convert path commands into compact SVG path data. TrueType contours come
 * out of opentype.js without explicit close commands, so every subpath is
 * closed here.
 * @param {import("opentype.js").PathCommand[]} commands
 * @returns {string}
 */
function pathData(commands) {
  let d = "";
  for (const c of commands) {
    const x = fmt(/** @type {number} */ (c.x));
    const y = fmt(/** @type {number} */ (c.y));
    if (c.type === "M") {
      d += `${d ? "Z" : ""}M${x} ${y}`;
    } else if (c.type === "L") {
      d += `L${x} ${y}`;
    } else {
      d += `Q${fmt(/** @type {number} */ (c.x1))} ${fmt(/** @type {number} */ (c.y1))} ${x} ${y}`;
    }
  }
  return `${d}Z`;
}

/**
 * Escape text for use inside a double-quoted XML attribute.
 * @param {string} s
 * @returns {string}
 */
function escapeAttr(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Whether a name is acceptable as a component name (letters, digits,
 * underscores and spaces, at least one character).
 * @param {string} name
 * @returns {boolean}
 */
export function isValidComponentName(name) {
  return /^[A-Za-z0-9_ ]+$/.test(name);
}

/**
 * File name used for a component's image: the lowercased name plus `.svg`.
 * @param {string} name
 * @returns {string}
 */
export function componentImageFileName(name) {
  return `${name.toLowerCase()}.svg`;
}

/**
 * @typedef {object} ComponentBadge
 * @property {string} label Human readable text (underscores as spaces).
 * @property {number} width ViewBox width.
 * @property {number} height ViewBox height.
 * @property {string} viewBox The SVG viewBox attribute value.
 * @property {string} body Inner SVG markup (the background and text paths).
 */

/**
 * Compute the pieces of a component name badge, without the outer `<svg>`
 * element, so it can be inlined into HTML or wrapped by a framework.
 *
 * @param {string} name Component name. Underscores are rendered as spaces.
 * @returns {ComponentBadge}
 */
export function renderComponentBadge(name) {
  const label = name.replaceAll("_", " ");
  const { font, kerning, substitute } = getFont();
  const scale = FONT_SIZE / font.unitsPerEm;
  const clusters = substitute(
    Array.from(label, (ch) => font.charToGlyph(ch).index),
  );
  const path = new opentype.Path();
  let x = TEXT_X;
  clusters.forEach(({ glyph: index, chars }, i) => {
    const glyph = font.glyphs.get(index);
    path.extend(glyph.getPath(x, TEXT_BASELINE, FONT_SIZE));
    // Like Inkscape, letter spacing is added once per source character, so a
    // ligature covering several characters gets that many spacings.
    x +=
      /** @type {number} */ (glyph.advanceWidth) * scale +
      LETTER_SPACING * chars;
    const next = clusters[i + 1];
    if (next) x += kerning.get(index, next.glyph) * scale;
  });
  const box = path.getBoundingBox();
  const width = Math.round(box.x2 - box.x1) + 10;
  const h = width - 5;
  const rect = `M5,0H${h}a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Z`;
  const commands = path.commands.filter((c) => c.type !== "Z");
  let body = `<path d="${rect}" fill="#000"/>`;
  if (commands.length > 0) {
    body += `<path d="${pathData(commands)}" fill="#fffffc"/>`;
  }
  return Object.freeze({
    label,
    width,
    height: HEIGHT,
    viewBox: `0 0 ${width} ${HEIGHT}`,
    body,
  });
}

/**
 * Generate the SVG markup for a component name badge.
 *
 * @param {string} name Component name. Underscores are rendered as spaces.
 * @returns {string} The SVG document.
 */
export function generateComponentImage(name) {
  const { label, viewBox, body } = renderComponentBadge(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${escapeAttr(label)}">${body}</svg>\n`;
}
