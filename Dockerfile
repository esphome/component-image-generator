FROM alpine:3.18 as font

RUN apk add --no-cache \
  curl \
  unzip

RUN curl https://fonts.google.com/download?family=Montserrat -o /tmp/montserrat.zip && \
  mkdir -p /usr/share/fonts/ttf-montserrat/ && \
  unzip /tmp/montserrat.zip -d /usr/share/fonts/ttf-montserrat/ && \
  rm -rf /tmp/montserrat.zip

FROM alpine:3.18 as generator

RUN apk add --no-cache \
  inkscape \
  bash \
  minify

COPY --from=font /usr/share/fonts/ttf-montserrat/static/*.ttf /usr/share/fonts/ttf-montserrat/

RUN mkdir /app

COPY --chmod=777 generate.sh template.svg /app

WORKDIR /out

ENTRYPOINT ["/app/generate.sh"]
