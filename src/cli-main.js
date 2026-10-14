import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  componentImageFileName,
  generateComponentImage,
  isValidComponentName,
} from "./index.js";

const USAGE = `Usage: esphome-component-image <name> [--out-dir <dir>]

Generate the SVG name badge for an ESPHome component. Underscores in the name
are rendered as spaces. The image is written to <out-dir>/<lowercased name>.svg.

Options:
  -o, --out-dir <dir>  Directory to write the SVG to (default: current directory)
  -h, --help           Show this help
`;

/**
 * @typedef {object} CliIo
 * @property {(text: string) => void} stdout
 * @property {(text: string) => void} stderr
 */

/**
 * Run the CLI.
 *
 * @param {string[]} argv Arguments after the program name.
 * @param {CliIo} io Output sinks.
 * @returns {number} Process exit code.
 */
export function main(argv, io) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        "out-dir": { type: "string", short: "o" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (err) {
    io.stderr(`${/** @type {Error} */ (err).message}\n\n${USAGE}`);
    return 2;
  }

  if (parsed.values.help) {
    io.stdout(USAGE);
    return 0;
  }

  const [name, ...extra] = parsed.positionals;
  if (name === undefined || extra.length > 0) {
    io.stderr(`Expected exactly one component name.\n\n${USAGE}`);
    return 2;
  }
  if (!isValidComponentName(name)) {
    io.stderr(
      `Invalid component name "${name}": only letters, digits, underscores, hyphens and spaces are allowed.\n`,
    );
    return 2;
  }

  const outDir = parsed.values["out-dir"] ?? ".";
  const file = join(outDir, componentImageFileName(name));
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(file, generateComponentImage(name));
  } catch (err) {
    io.stderr(
      `Failed to write ${file}: ${/** @type {Error} */ (err).message}\n`,
    );
    return 1;
  }
  io.stdout(`${file}\n`);
  return 0;
}
