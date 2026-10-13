// Minimal ambient types for the parts of opentype.js used by this package
// (opentype.js does not ship its own type declarations). Dev-only, not shipped.
declare module "opentype.js" {
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  export interface PathCommand {
    type: string;
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }
  export class Path {
    commands: PathCommand[];
    extend(path: Path): void;
    getBoundingBox(): BoundingBox;
  }
  export interface Glyph {
    index: number;
    advanceWidth?: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }
  export interface Font {
    unitsPerEm: number;
    glyphs: { get(index: number): Glyph };
    tables: {
      gsub: {
        features: { tag: string; feature: { lookupListIndexes: number[] } }[];
        lookups: {
          lookupType: number;
          subtables: {
            coverage: { format: number; glyphs?: number[]; ranges?: { start: number; end: number }[] };
            ligatureSets?: { ligGlyph: number; components: number[] }[][];
          }[];
        }[];
      };
      gpos: {
        features: { tag: string; feature: { lookupListIndexes: number[] } }[];
      };
    };
    charToGlyph(char: string): Glyph;
  }
  export function parse(buffer: ArrayBuffer): Font;
  const opentype: { parse: typeof parse; Path: typeof Path };
  export default opentype;
}
