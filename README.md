# ESPHome Component Image Generator

This is a small tool to generate images for ESPHome components that are used on the [ESPHome website](https://esphome.io).

It is pure JavaScript (Node.js 22 or newer): the text is laid out and converted to outlines with [opentype.js](https://github.com/opentypejs/opentype.js) using the bundled Montserrat Black font, so no Inkscape, Docker or native dependencies are needed.

## CLI

```bash
npx github:esphome/component-image-generator ESPHome
```

This writes `esphome.svg` (the lowercased name plus `.svg`) to the current directory. Underscores in the name are rendered as spaces. Names may only contain letters, digits, underscores, hyphens and spaces.

<!-- prettier-ignore -->
| Option                                           | Description                                      |
| ------------------------------------------------ | ------------------------------------------------ |
| `-o`, `--out-dir DIR`                            | Directory to write the SVG to (default: current) |
| `-h`, `--help`                                   | Show usage                                       |

The command above produces the following SVG:

![ESPHome](esphome.svg)

## As a dev dependency (esphome-docs)

```bash
npm install --save-dev github:esphome/component-image-generator#v2.0.0
```

Add a script to `package.json`:

```json
{
  "scripts": {
    "component-image": "esphome-component-image"
  }
}
```

Then generate an image with:

```bash
npm run component-image -- my_component -o public/images
```

## Programmatic API

```js
import {
  generateComponentImage,
  renderComponentBadge,
} from "@esphome/component-image-generator";

const svg = generateComponentImage("dallas_temp"); // standalone SVG document

const badge = renderComponentBadge("dallas_temp");
// { label: "dallas temp", width: 178, height: 25, viewBox: "0 0 178 25", body: "<path .../><path .../>" }
```

Output is deterministic: the same name always gives byte-identical SVG. The font is embedded in the library (`src/font-data.js`, generated from the bundled TTF by `npm run embed-font`), so it keeps working after a bundler such as Vite or Astro has inlined it.

## Astro

The package works with Astro 5 or newer (`astro` is an optional peer dependency).

### Inline component

```astro
---
import ComponentBadge from "@esphome/component-image-generator/ComponentBadge.astro";
---

<ComponentBadge name="dallas_temp" class="component-badge" height="25" />
```

`name` is the component name. Every other prop is passed through to the `<svg>` element and overrides the defaults (`viewBox`, `role="img"` and an `aria-label` with the badge text).

### Static `.svg` endpoint

To serve badges as files (for example for lazily loaded `<img>` tags), create a dynamic endpoint such as `src/pages/images/[name].svg.ts`:

```ts
import { createBadgeEndpoint } from "@esphome/component-image-generator/astro";

export const { getStaticPaths, GET } = createBadgeEndpoint(async () => {
  // Any iterable of component names, or a (possibly async) function returning one.
  return ["ESPHome", "dallas_temp"];
});
```

A static build then writes `images/esphome.svg` and `images/dallas_temp.svg`, identical to the CLI output. The route parameter is the lowercased name; pass `{ param: "slug" }` as the second argument if your file is named `[slug].svg.ts`. The build fails if a name is invalid or two names collide once lowercased (exact duplicates are ignored).

The building blocks are exported too, for custom endpoints:

<!-- prettier-ignore -->
| Export                                                  | Description                                             |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `badgeStaticPaths(names, options?)`                     | `getStaticPaths` entries: `{ params: { name }, props }` |
| `badgeResponse(name)`                                   | `Response` with the SVG and an `image/svg+xml` type     |
| `createBadgeEndpoint(names, opts?)`                     | `{ getStaticPaths, GET, prerender: true }` for a route  |

## GitHub Action

```yaml
- uses: esphome/component-image-generator@main
  with:
    component: ESPHome
```

The image is written to the workspace as `esphome.svg`.

## Development

```bash
npm ci
npm run format:check
npm run typecheck
npm test
npm run test:coverage   # enforces 100% line, branch and function coverage
```

`npm test` includes an integration test that builds a small Astro site (`test/fixtures/astro-site`) using both the component and the endpoint helper.

Optionally, compare the output with the original Inkscape based pipeline (needs `inkscape` and Montserrat installed where fontconfig can find it; not run in CI):

```bash
node scripts/compare-inkscape.mjs [name ...]
```
