import { createBadgeEndpoint } from "@esphome/component-image-generator/astro";

export const { getStaticPaths, GET } = createBadgeEndpoint([
  "ESPHome",
  "dallas_temp",
]);
