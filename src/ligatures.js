/**
 * Minimal GSUB "liga" (standard ligatures) support.
 *
 * opentype.js's own shaping rejects some of Montserrat's GSUB lookups, so
 * glyph substitution is done here from the already parsed tables. Only simple
 * ligature substitution (lookup type 4) is applied, which is what shapes
 * plain Latin text such as "fi".
 */

/**
 * @typedef {object} Ligature
 * @property {number} ligGlyph Glyph index of the ligature.
 * @property {number[]} components Glyph indexes that follow the first glyph.
 */

/**
 * @typedef {object} GsubFeature
 * @property {string} tag
 * @property {{ lookupListIndexes: number[] }} feature
 */

/**
 * @typedef {object} GsubLookup
 * @property {number} lookupType
 * @property {{
 *   coverage: { format: number, glyphs?: number[], ranges?: { start: number, end: number }[] },
 *   ligatureSets?: Ligature[][],
 * }[]} subtables
 */

/**
 * Index of a glyph within a parsed coverage table, or -1.
 * @param {{ format: number, glyphs?: number[], ranges?: { start: number, end: number }[] }} coverage
 * @param {number} glyph
 * @returns {number}
 */
function coverageIndex(coverage, glyph) {
  if (coverage.format === 1) {
    return /** @type {number[]} */ (coverage.glyphs).indexOf(glyph);
  }
  let base = 0;
  for (const r of /** @type {{ start: number, end: number }[]} */ (
    coverage.ranges
  )) {
    if (glyph >= r.start && glyph <= r.end) return base + glyph - r.start;
    base += r.end - r.start + 1;
  }
  return -1;
}

/**
 * Build a function that applies the font's `liga` ligatures to a glyph
 * index sequence.
 *
 * @param {GsubFeature[]} features
 * @param {GsubLookup[]} lookups
 * @returns {(glyphs: number[]) => { glyph: number, chars: number }[]}
 */
export function createLigatureSubstituter(features, lookups) {
  const indexes = new Set(
    features
      .filter((f) => f.tag === "liga")
      .flatMap((f) => f.feature.lookupListIndexes),
  );
  const sets = [...indexes]
    .map((i) => lookups[i])
    .filter((l) => l.lookupType === 4)
    .flatMap((l) => l.subtables);

  return (glyphs) => {
    /** @type {{ glyph: number, chars: number }[]} */
    const out = [];
    for (let i = 0; i < glyphs.length; i++) {
      let replaced = false;
      for (const sub of sets) {
        const cov = coverageIndex(sub.coverage, glyphs[i]);
        if (cov < 0) continue;
        const match = /** @type {Ligature[][]} */ (sub.ligatureSets)[cov].find(
          (lig) => lig.components.every((c, k) => glyphs[i + 1 + k] === c),
        );
        if (match) {
          out.push({
            glyph: match.ligGlyph,
            chars: match.components.length + 1,
          });
          i += match.components.length;
          replaced = true;
          break;
        }
      }
      if (!replaced) out.push({ glyph: glyphs[i], chars: 1 });
    }
    return out;
  };
}
