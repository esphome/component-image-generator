/**
 * Minimal GPOS pair-adjustment ("kern" feature) reader.
 *
 * opentype.js cannot read GPOS extension lookups (type 9), which is how
 * Montserrat stores its kerning, so kerning is read straight from the font
 * bytes here. Only horizontal advance adjustments for pair positioning
 * (lookup type 2, formats 1 and 2) are supported, which is what HarfBuzz
 * applies for plain Latin text.
 */

/**
 * @typedef {object} GposFeature
 * @property {string} tag
 * @property {{ lookupListIndexes: number[] }} feature
 */

/**
 * @typedef {object} KerningTable
 * @property {(left: number, right: number) => number} get Kerning in font units.
 */

/**
 * Count set bits.
 * @param {number} n
 * @returns {number}
 */
function popcount(n) {
  let c = 0;
  for (let v = n; v; v &= v - 1) c++;
  return c;
}

/**
 * Index of a glyph within a coverage table, or -1.
 * @param {DataView} dv
 * @param {number} off
 * @param {number} glyph
 * @returns {number}
 */
export function coverageIndex(dv, off, glyph) {
  const format = dv.getUint16(off);
  const count = dv.getUint16(off + 2);
  if (format === 1) {
    for (let i = 0; i < count; i++) {
      if (dv.getUint16(off + 4 + i * 2) === glyph) return i;
    }
    return -1;
  }
  // Format 2: ranges of glyphs.
  for (let i = 0; i < count; i++) {
    const r = off + 4 + i * 6;
    const start = dv.getUint16(r);
    const end = dv.getUint16(r + 2);
    if (glyph >= start && glyph <= end) {
      return dv.getUint16(r + 4) + glyph - start;
    }
  }
  return -1;
}

/**
 * Class of a glyph within a ClassDef table (0 if not listed).
 * @param {DataView} dv
 * @param {number} off
 * @param {number} glyph
 * @returns {number}
 */
export function glyphClass(dv, off, glyph) {
  const format = dv.getUint16(off);
  if (format === 1) {
    const first = dv.getUint16(off + 2);
    const count = dv.getUint16(off + 4);
    return glyph >= first && glyph < first + count
      ? dv.getUint16(off + 6 + (glyph - first) * 2)
      : 0;
  }
  const count = dv.getUint16(off + 2);
  for (let i = 0; i < count; i++) {
    const r = off + 4 + i * 6;
    if (glyph >= dv.getUint16(r) && glyph <= dv.getUint16(r + 2)) {
      return dv.getUint16(r + 4);
    }
  }
  return 0;
}

/**
 * Read the xAdvance of the first value record at `off`.
 * @param {DataView} dv
 * @param {number} off
 * @param {number} valueFormat
 * @returns {number}
 */
function xAdvance(dv, off, valueFormat) {
  if (!(valueFormat & 0x0004)) return 0;
  return dv.getInt16(off + popcount(valueFormat & 0x0003) * 2);
}

/**
 * Kerning of one pair-adjustment subtable, or undefined if it does not
 * cover the left glyph.
 * @param {DataView} dv
 * @param {number} sub
 * @param {number} left
 * @param {number} right
 * @returns {number | undefined}
 */
function subtableKerning(dv, sub, left, right) {
  const format = dv.getUint16(sub);
  const cov = coverageIndex(dv, sub + dv.getUint16(sub + 2), left);
  if (cov < 0) return undefined;
  const vf1 = dv.getUint16(sub + 4);
  const vf2 = dv.getUint16(sub + 6);
  const size1 = popcount(vf1) * 2;
  const size2 = popcount(vf2) * 2;
  if (format === 1) {
    const pairSet = sub + dv.getUint16(sub + 10 + cov * 2);
    const pairCount = dv.getUint16(pairSet);
    const recSize = 2 + size1 + size2;
    for (let i = 0; i < pairCount; i++) {
      const rec = pairSet + 2 + i * recSize;
      if (dv.getUint16(rec) === right) return xAdvance(dv, rec + 2, vf1);
    }
    return undefined;
  }
  // Format 2: class based.
  const class1 = glyphClass(dv, sub + dv.getUint16(sub + 8), left);
  const class2 = glyphClass(dv, sub + dv.getUint16(sub + 10), right);
  const class2Count = dv.getUint16(sub + 14);
  const rec = sub + 16 + (class1 * class2Count + class2) * (size1 + size2);
  return xAdvance(dv, rec, vf1);
}

/**
 * Byte offset of a table in an sfnt font file.
 * @param {DataView} dv
 * @param {string} tag Four character table tag.
 * @returns {number}
 */
function findTable(dv, tag) {
  const count = dv.getUint16(4);
  for (let i = 0; i < count; i++) {
    const rec = 12 + i * 16;
    const name = String.fromCharCode(
      dv.getUint8(rec),
      dv.getUint8(rec + 1),
      dv.getUint8(rec + 2),
      dv.getUint8(rec + 3),
    );
    if (name === tag) return dv.getUint32(rec + 8);
  }
  throw new Error(`Font has no ${tag} table`);
}

/**
 * Build a kerning lookup from the raw font bytes.
 *
 * @param {ArrayBuffer} buffer The font file.
 * @param {GposFeature[]} features Parsed GPOS features (from opentype.js).
 * @returns {KerningTable}
 */
export function readKerning(buffer, features) {
  const dv = new DataView(buffer);
  const gposOffset = findTable(dv, "GPOS");
  const lookupList = gposOffset + dv.getUint16(gposOffset + 8);
  const indexes = features
    .filter((f) => f.tag === "kern")
    .flatMap((f) => f.feature.lookupListIndexes);

  /** @type {number[]} Absolute offsets of pair-adjustment subtables. */
  const subtables = [];
  for (const index of new Set(indexes)) {
    const lookup = lookupList + dv.getUint16(lookupList + 2 + index * 2);
    const type = dv.getUint16(lookup);
    const count = dv.getUint16(lookup + 4);
    for (let i = 0; i < count; i++) {
      let sub = lookup + dv.getUint16(lookup + 6 + i * 2);
      let subType = type;
      if (type === 9) {
        subType = dv.getUint16(sub + 2);
        sub += dv.getUint32(sub + 4);
      }
      if (subType === 2) subtables.push(sub);
    }
  }

  return {
    get(left, right) {
      for (const sub of subtables) {
        const value = subtableKerning(dv, sub, left, right);
        if (value !== undefined) return value;
      }
      return 0;
    },
  };
}
