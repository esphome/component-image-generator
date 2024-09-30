FROM alpine:3.18 AS generator

RUN apk add --no-cache \
  inkscape \
  bash \
  minify

COPY ttf-montserrat/static/*.ttf /usr/share/fonts/ttf-montserrat/

RUN mkdir /app

COPY --chmod=777 generate.sh template.svg /app

WORKDIR /out

ENTRYPOINT ["/app/generate.sh"]
