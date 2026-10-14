import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { main } from "../src/cli-main.js";
import { generateComponentImage } from "../src/index.js";

const CLI = fileURLToPath(new URL("../src/cli.js", import.meta.url));

/**
 * @returns {{ io: import("../src/cli-main.js").CliIo, out: string[], err: string[] }}
 */
function capture() {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const err = [];
  return {
    io: { stdout: (t) => out.push(t), stderr: (t) => err.push(t) },
    out,
    err,
  };
}

/**
 * @param {(dir: string) => void} fn
 */
function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "cig-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("main writes a lowercased file into --out-dir", () => {
  withTempDir((dir) => {
    const { io, out, err } = capture();
    assert.equal(main(["Wi_Fi", "--out-dir", dir], io), 0);
    const file = join(dir, "wi_fi.svg");
    assert.deepEqual(out, [`${file}\n`]);
    assert.deepEqual(err, []);
    assert.equal(readFileSync(file, "utf8"), generateComponentImage("Wi_Fi"));
  });
});

test("main creates missing output directories and accepts -o", () => {
  withTempDir((dir) => {
    const { io } = capture();
    const target = join(dir, "a", "b");
    assert.equal(main(["-o", target, "sensor"], io), 0);
    assert.ok(existsSync(join(target, "sensor.svg")));
  });
});

test("main writes to the current directory by default", () => {
  withTempDir((dir) => {
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      const { io, out } = capture();
      assert.equal(main(["lvgl"], io), 0);
      assert.deepEqual(out, ["lvgl.svg\n"]);
      assert.ok(existsSync(join(dir, "lvgl.svg")));
    } finally {
      process.chdir(cwd);
    }
  });
});

test("main prints help", () => {
  for (const flag of ["--help", "-h"]) {
    const { io, out } = capture();
    assert.equal(main([flag], io), 0);
    assert.match(out.join(""), /^Usage: esphome-component-image/);
  }
});

test("main rejects a missing name", () => {
  const { io, err } = capture();
  assert.equal(main([], io), 2);
  assert.match(err.join(""), /Expected exactly one component name/);
});

test("main rejects extra positionals", () => {
  const { io, err } = capture();
  assert.equal(main(["a", "b"], io), 2);
  assert.match(err.join(""), /Expected exactly one component name/);
});

test("main rejects invalid names", () => {
  for (const bad of ["../evil", "a-b", "a/b", ""]) {
    const { io, err } = capture();
    assert.equal(main([bad], io), 2, bad);
    assert.match(err.join(""), /Invalid component name/);
  }
});

test("main rejects unknown flags", () => {
  const { io, err } = capture();
  assert.equal(main(["--nope", "a"], io), 2);
  assert.match(err.join(""), /Usage:/);
});

test("main reports write failures", () => {
  withTempDir((dir) => {
    const blocker = join(dir, "file");
    writeFileSync(blocker, "x");
    const { io, err, out } = capture();
    assert.equal(main(["a", "-o", blocker], io), 1);
    assert.match(err.join(""), /Failed to write/);
    assert.deepEqual(out, []);
  });
});

test("bin: generates a file in the working directory", () => {
  withTempDir((dir) => {
    const res = spawnSync(process.execPath, [CLI, "ESPHome"], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(res.status, 0, res.stderr);
    assert.equal(res.stdout, "esphome.svg\n");
    assert.equal(
      readFileSync(join(dir, "esphome.svg"), "utf8"),
      generateComponentImage("ESPHome"),
    );
  });
});

test("bin: -o writes to another directory", () => {
  withTempDir((dir) => {
    const res = spawnSync(process.execPath, [CLI, "Dallas_Temp", "-o", dir], {
      encoding: "utf8",
    });
    assert.equal(res.status, 0, res.stderr);
    assert.ok(existsSync(join(dir, "dallas_temp.svg")));
  });
});

test("bin: failures exit non-zero with a message", () => {
  for (const args of [[], ["bad-name"], ["--unknown", "a"]]) {
    const res = spawnSync(process.execPath, [CLI, ...args], {
      encoding: "utf8",
    });
    assert.notEqual(res.status, 0);
    assert.notEqual(res.stderr, "");
    assert.equal(res.stdout, "");
  }
});

test("bin: --help exits 0", () => {
  const res = spawnSync(process.execPath, [CLI, "--help"], {
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Usage:/);
});
