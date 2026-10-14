/** One entry returned from Astro's `getStaticPaths`. */
export interface BadgeStaticPath {
  params: Record<string, string>;
  props: { name: string };
}

export interface BadgeStaticPathsOptions {
  /** Name of the dynamic route parameter. Defaults to `"name"`. */
  param?: string;
}

/** Component names, or a (possibly async) function returning them. */
export type BadgeNames =
  Iterable<string> | (() => Iterable<string> | Promise<Iterable<string>>);

/**
 * Build Astro `getStaticPaths` entries for a set of component names.
 * Throws for invalid names and for names that collide once lowercased.
 */
export function badgeStaticPaths(
  names: Iterable<string>,
  options?: BadgeStaticPathsOptions,
): BadgeStaticPath[];

/** Build an `image/svg+xml` response for a component name. */
export function badgeResponse(name: string): Response;

/**
 * Create the exports for an Astro static endpoint such as
 * `src/pages/images/[name].svg.ts`.
 */
export function createBadgeEndpoint(
  names: BadgeNames,
  options?: BadgeStaticPathsOptions,
): {
  getStaticPaths: () => Promise<BadgeStaticPath[]>;
  GET: (context: { props: { name: string } }) => Response;
  prerender: true;
};
