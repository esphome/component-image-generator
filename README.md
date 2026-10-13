# ESPHome Component Image Generator

This is a small tool to generate images for ESPHome components that are used on the [ESPHome website](https://esphome.io).

It is pure JavaScript (Node.js 22 or newer): the text is laid out and converted to outlines with [opentype.js](https://github.com/opentypejs/opentype.js) using the bundled Montserrat Black font, so no Inkscape, Docker or native dependencies are needed.

## CLI

```bash
npx github:esphome/component-image-generator ESPHome
```

This writes `esphome.svg` (the lowercased name plus `.svg`) to the current directory. Underscores in the name are rendered as spaces. Names may only contain letters, digits, underscores and spaces.

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
import { generateComponentImage } from "@esphome/component-image-generator";

const svg = generateComponentImage("dallas_temp"); // SVG markup as a string
```

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
npm run typecheck
npm test
npm run test:coverage
```

Optionally, compare the output with the original Inkscape based pipeline (needs `inkscape` and Montserrat installed where fontconfig can find it; not run in CI):

```bash
node scripts/compare-inkscape.mjs [name ...]
```
