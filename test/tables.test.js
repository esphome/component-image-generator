import assert from "node:assert/strict";
import { test } from "node:test";
import { coverageIndex, glyphClass, readKerning } from "../src/kerning.js";
import { createLigatureSubstituter } from "../src/ligatures.js";

/**
 * @param {number[]} words 16-bit values
 * @returns {DataView}
 */
function u16(words) {
  const dv = new DataView(new ArrayBuffer(words.length * 2));
  words.forEach((w, i) => dv.setUint16(i * 2, w));
  return dv;
}

test("coverageIndex format 1", () => {
  const dv = u16([1, 3, 10, 20, 30]);
  assert.equal(coverageIndex(dv, 0, 20), 1);
  assert.equal(coverageIndex(dv, 0, 21), -1);
});

test("coverageIndex format 2", () => {
  // Ranges 10-12 (start index 0) and 20-21 (start index 3).
  const dv = u16([2, 2, 10, 12, 0, 20, 21, 3]);
  assert.equal(coverageIndex(dv, 0, 11), 1);
  assert.equal(coverageIndex(dv, 0, 21), 4);
  assert.equal(coverageIndex(dv, 0, 15), -1);
});

test("glyphClass format 1", () => {
  const dv = u16([1, 100, 3, 7, 8, 9]);
  assert.equal(glyphClass(dv, 0, 101), 8);
  assert.equal(glyphClass(dv, 0, 99), 0);
  assert.equal(glyphClass(dv, 0, 103), 0);
});

test("glyphClass format 2", () => {
  const dv = u16([2, 1, 50, 60, 4]);
  assert.equal(glyphClass(dv, 0, 55), 4);
  assert.equal(glyphClass(dv, 0, 61), 0);
});

test("readKerning requires a GPOS table", () => {
  const buf = new ArrayBuffer(12);
  assert.throws(() => readKerning(buf, []), /no GPOS table/);
});

/**
 * Build a minimal sfnt with a GPOS table holding the given lookups.
 * @param {Uint8Array} gpos
 * @returns {ArrayBuffer}
 */
function fontWithGpos(gpos) {
  const buf = new ArrayBuffer(12 + 16 + gpos.length);
  const dv = new DataView(buf);
  dv.setUint16(4, 1);
  "GPOS".split("").forEach((c, i) => dv.setUint8(12 + i, c.charCodeAt(0)));
  dv.setUint32(12 + 8, 28);
  dv.setUint32(12 + 12, gpos.length);
  new Uint8Array(buf, 28).set(gpos);
  return buf;
}

test("readKerning: format 1 pair set, direct lookup, ignores other lookup types", () => {
  const g = new DataView(new ArrayBuffer(200));
  const w = (/** @type {number} */ o, /** @type {number} */ v) => g.setUint16(o, v);
  w(8, 10); // lookupList at 10
  w(10, 2); // two lookups
  w(12, 6); // lookup 0 at 10+6
  w(14, 60); // lookup 1 at 10+60
  // lookup 0: type 2, 1 subtable at +8 (relative to lookup start 16)
  w(16, 2); w(18, 0); w(20, 1); w(22, 8);
  // subtable at 24: format 1, coverage +14, vf1 = 4 (xAdvance), vf2 = 0, 1 pairset
  w(24, 1); w(26, 14); w(28, 4); w(30, 0); w(32, 1); w(34, 20);
  // coverage at 38: format 1, glyph 5
  w(38, 1); w(40, 1); w(42, 5);
  // pair set at 44: 2 pairs (second glyph, xAdvance)
  w(44, 2); w(46, 6); g.setInt16(48, -40); w(50, 7); g.setInt16(52, -10);
  // lookup 1 at 70: type 1 (ignored)
  w(70, 1); w(72, 0); w(74, 0);
  const font = fontWithGpos(new Uint8Array(g.buffer));
  const features = [
    { tag: "kern", feature: { lookupListIndexes: [0, 1] } },
    { tag: "mark", feature: { lookupListIndexes: [1] } },
  ];
  // The pair-set offset (+20 from subtable at 24 = 44) points at the pair set.
  const kern = readKerning(font, features);
  assert.equal(kern.get(5, 6), -40);
  assert.equal(kern.get(5, 7), -10);
  assert.equal(kern.get(5, 8), 0);
  assert.equal(kern.get(4, 6), 0);

  // A value format without xAdvance (xPlacement only) kerns by nothing.
  const noAdvance = new Uint8Array(g.buffer.slice(0));
  new DataView(noAdvance.buffer).setUint16(28, 1);
  assert.equal(readKerning(fontWithGpos(noAdvance), features).get(5, 6), 0);
});

test("ligature substitution", () => {
  const features = [
    { tag: "liga", feature: { lookupListIndexes: [0, 1] } },
    { tag: "ccmp", feature: { lookupListIndexes: [2] } },
  ];
  const lookups = [
    {
      lookupType: 4,
      subtables: [
        {
          coverage: { format: 1, glyphs: [1] },
          ligatureSets: [[{ ligGlyph: 100, components: [2] }]],
        },
      ],
    },
    {
      lookupType: 4,
      subtables: [
        {
          coverage: { format: 2, ranges: [{ start: 3, end: 4 }, { start: 8, end: 9 }] },
          ligatureSets: [
            [{ ligGlyph: 200, components: [5, 6] }],
            [{ ligGlyph: 201, components: [5] }],
            [{ ligGlyph: 202, components: [7] }],
            [{ ligGlyph: 203, components: [7] }],
          ],
        },
      ],
    },
    { lookupType: 1, subtables: [] },
  ];
  const sub = createLigatureSubstituter(features, lookups);
  assert.deepEqual(sub([1, 2, 1]), [
    { glyph: 100, chars: 2 },
    { glyph: 1, chars: 1 },
  ]);
  assert.deepEqual(sub([3, 5, 6, 4, 5, 9, 7, 8, 1]), [
    { glyph: 200, chars: 3 },
    { glyph: 201, chars: 2 },
    { glyph: 203, chars: 2 },
    { glyph: 8, chars: 1 },
    { glyph: 1, chars: 1 },
  ]);
  assert.deepEqual(sub([3, 5, 7, 20]), [
    { glyph: 3, chars: 1 },
    { glyph: 5, chars: 1 },
    { glyph: 7, chars: 1 },
    { glyph: 20, chars: 1 },
  ]);
});
