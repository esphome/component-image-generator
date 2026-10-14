import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "astro";
import { generateComponentImage } from "../src/index.js";

const root = new URL("./fixtures/astro-site/", import.meta.url);
/** @type {string | undefined} */
let outDir;

after(async () => {
  if (outDir) await rm(outDir, { recursive: true, force: true });
});

test(
  "Astro site renders the component and the static endpoint",
  { timeout: 120_000 },
  async () => {
    outDir = await mkdtemp(join(tmpdir(), "astro-site-"));
    await build({
      root: fileURLToPath(root),
      outDir,
      logLevel: "error",
    });

    const html = await readFile(join(outDir, "index.html"), "utf8");
    assert.match(html, /<svg [^>]*viewBox="0 0 146 25"/);
    assert.match(html, /<svg [^>]*class="badge"/);
    assert.match(html, /<svg [^>]*aria-label="ESPHome"/);
    assert.match(html, /<svg [^>]*aria-label="dallas temp"/);
    assert.ok(html.includes('fill="#fffffc"'));

    for (const name of ["ESPHome", "dallas_temp"]) {
      const file = join(outDir, "badges", `${name.toLowerCase()}.svg`);
      assert.ok((await stat(file)).isFile());
      assert.equal(await readFile(file, "utf8"), generateComponentImage(name));
    }
  },
);
