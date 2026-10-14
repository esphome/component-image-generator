/**
 * Generate the SVG markup for a component name badge.
 *
 * @param name Component name. Underscores are rendered as spaces.
 * @returns The SVG document as a string.
 */
export function generateComponentImage(name: string): string;

/**
 * Check whether a name is accepted by the CLI and by the docs workflow.
 */
export function isValidComponentName(name: string): boolean;

/**
 * File name (lowercased name plus `.svg`) used for a component's image.
 */
export function componentImageFileName(name: string): string;

/**
 * The parts of a component badge, without the outer `<svg>` element.
 */
export interface ComponentBadge {
  /** Human readable text (underscores rendered as spaces). */
  readonly label: string;
  /** ViewBox width. */
  readonly width: number;
  /** ViewBox height. */
  readonly height: number;
  /** The SVG `viewBox` attribute value, e.g. `0 0 146 25`. */
  readonly viewBox: string;
  /** Inner SVG markup: the background path and the text path. */
  readonly body: string;
}

/**
 * Compute a component badge as separate parts, suitable for inlining into
 * HTML or wrapping in a framework component.
 *
 * @param name Component name. Underscores are rendered as spaces.
 */
export function renderComponentBadge(name: string): ComponentBadge;
