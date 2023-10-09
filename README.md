# ESPHome Component Image Generator

This is a small tool to generate images for ESPHome components that are used on the [ESPHome website](https://esphome.io).

## Usage

```bash
docker run --rm -it -v "${PWD}":/out ghcr.io/esphome/component-image-generator:latest ESPHome
```

This command produces the following SVG:

![ESPHome](esphome.svg)
