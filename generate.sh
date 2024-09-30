#!/bin/bash

if ! command -v inkscape &>/dev/null; then
  echo "inkscape could not be found"
  exit 1
fi

name=$1
lower_name=${name,,}

basedir=$(dirname "$0")

text="component-text"

# Convert underscores to spaces in generated image text
name="${name//_/ }"
sed "s/COMPONENT/$name/" <$basedir/template.svg >/tmp/$lower_name.svg

width=$(inkscape --actions="select-by-id:$text; query-width;" /tmp/$lower_name.svg 2>/dev/null)
width=$(printf '%.*f' 0 $width)

viewport_width=$(echo "($width + 10)" | bc)
path_horizontal=$(echo "($width + 5)" | bc)

sed -i s/VIEWPORT_WIDTH/$viewport_width/ /tmp/$lower_name.svg
sed -i s/PATH_HORIZONTAL/$path_horizontal/ /tmp/$lower_name.svg

inkscape --actions="select-by-id:$text; object-to-path;export-plain-svg;export-filename:/tmp/$lower_name.svg;export-do" /tmp/$lower_name.svg 2>/dev/null

if command -v minify >/dev/null 2>&1; then
  minify -q -o $lower_name.svg /tmp/$lower_name.svg
else
  cp /tmp/$lower_name.svg $lower_name.svg
fi
