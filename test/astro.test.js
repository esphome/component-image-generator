import assert from "node:assert/strict";
import { test } from "node:test";
import {
  badgeResponse,
  badgeStaticPaths,
  createBadgeEndpoint,
} from "../src/astro.js";
import { generateComponentImage } from "../src/index.js";

test("badgeStaticPaths lowercases params and keeps input order", () => {
  assert.deepEqual(badgeStaticPaths(["ESPHome", "dallas_temp", "a b"]), [
    { params: { name: "esphome" }, props: { name: "ESPHome" } },
    { params: { name: "dallas_temp" }, props: { name: "dallas_temp" } },
    { params: { name: "a b" }, props: { name: "a b" } },
  ]);
});

test("badgeStaticPaths accepts any iterable and a custom param", () => {
  const paths = badgeStaticPaths(new Set(["Wi_Fi"]), { param: "slug" });
  assert.deepEqual(paths, [
    { params: { slug: "wi_fi" }, props: { name: "Wi_Fi" } },
  ]);
});

test("badgeStaticPaths de-duplicates exact duplicates", () => {
  assert.equal(badgeStaticPaths(["lvgl", "sensor", "lvgl"]).length, 2);
});

test("badgeStaticPaths rejects names that collide when lowercased", () => {
  assert.throws(
    () => badgeStaticPaths(["ESPHome", "esphome"]),
    /"ESPHome" and "esphome" both map to "esphome"/,
  );
});

test("badgeStaticPaths rejects invalid names", () => {
  assert.throws(() => badgeStaticPaths(["a-b"]), /Invalid component name/);
  assert.throws(() => badgeStaticPaths([""]), /Invalid component name/);
  assert.throws(
    () => badgeStaticPaths(/** @type {any} */ ([42])),
    /Invalid component name: 42/,
  );
});

test("badgeResponse returns an SVG response", async () => {
  const res = badgeResponse("ESPHome");
  assert.equal(res.headers.get("content-type"), "image/svg+xml; charset=utf-8");
  assert.equal(await res.text(), generateComponentImage("ESPHome"));
});

test("badgeResponse rejects invalid names", () => {
  assert.throws(() => badgeResponse("../x"), /Invalid component name/);
  assert.throws(
    () => badgeResponse(/** @type {any} */ (undefined)),
    /Invalid component name/,
  );
});

test("createBadgeEndpoint with an array", async () => {
  const endpoint = createBadgeEndpoint(["ESPHome", "lvgl"]);
  assert.equal(endpoint.prerender, true);
  const paths = await endpoint.getStaticPaths();
  assert.deepEqual(
    paths.map((p) => p.params.name),
    ["esphome", "lvgl"],
  );
  const res = endpoint.GET({ props: paths[0].props });
  assert.equal(await res.text(), generateComponentImage("ESPHome"));
});

test("createBadgeEndpoint with sync and async functions and a param", async () => {
  const sync = createBadgeEndpoint(() => ["lvgl"], { param: "id" });
  assert.deepEqual((await sync.getStaticPaths())[0].params, { id: "lvgl" });
  const asyncFn = createBadgeEndpoint(async () => new Set(["sensor"]));
  assert.deepEqual((await asyncFn.getStaticPaths())[0].params, {
    name: "sensor",
  });
});

test("createBadgeEndpoint surfaces invalid names from getStaticPaths", async () => {
  const endpoint = createBadgeEndpoint(["bad-name"]);
  await assert.rejects(endpoint.getStaticPaths(), /Invalid component name/);
});
