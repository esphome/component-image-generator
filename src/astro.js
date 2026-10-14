import { generateComponentImage, isValidComponentName } from "./index.js";

/**
 * @typedef {import("../types/astro.js").BadgeStaticPath} BadgeStaticPath
 * @typedef {import("../types/astro.js").BadgeStaticPathsOptions} BadgeStaticPathsOptions
 * @typedef {import("../types/astro.js").BadgeNames} BadgeNames
 */

/**
 * Build Astro `getStaticPaths` entries for a set of component names.
 *
 * @param {Iterable<string>} names
 * @param {BadgeStaticPathsOptions} [options]
 * @returns {BadgeStaticPath[]}
 */
export function badgeStaticPaths(names, options = {}) {
  const param = options.param ?? "name";
  /** @type {Map<string, string>} */
  const seen = new Map();
  /** @type {BadgeStaticPath[]} */
  const paths = [];
  for (const name of names) {
    if (typeof name !== "string" || !isValidComponentName(name)) {
      throw new Error(`Invalid component name: ${JSON.stringify(name)}`);
    }
    const slug = name.toLowerCase();
    const previous = seen.get(slug);
    if (previous === name) continue;
    if (previous !== undefined) {
      throw new Error(
        `Component names ${JSON.stringify(previous)} and ${JSON.stringify(name)} both map to ${JSON.stringify(slug)}`,
      );
    }
    seen.set(slug, name);
    paths.push({ params: { [param]: slug }, props: { name } });
  }
  return paths;
}

/**
 * Build an SVG `Response` for a component name.
 *
 * @param {string} name
 * @returns {Response}
 */
export function badgeResponse(name) {
  if (typeof name !== "string" || !isValidComponentName(name)) {
    throw new Error(`Invalid component name: ${JSON.stringify(name)}`);
  }
  return new Response(generateComponentImage(name), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
  });
}

/**
 * Create the exports for an Astro static endpoint such as
 * `src/pages/images/[name].svg.ts`.
 *
 * @param {BadgeNames} names
 * @param {BadgeStaticPathsOptions} [options]
 */
export function createBadgeEndpoint(names, options) {
  return {
    getStaticPaths: async () => {
      const resolved = typeof names === "function" ? await names() : names;
      return badgeStaticPaths(resolved, options);
    },
    /** @param {{ props: { name: string } }} context */
    GET: ({ props }) => badgeResponse(props.name),
    prerender: true,
  };
}
