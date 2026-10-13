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
