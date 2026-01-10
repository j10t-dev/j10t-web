FROM denoland/deno:2.5.0 AS builder
WORKDIR /app
COPY . .
RUN deno cache src/main.ts
RUN deno task build-blog
RUN deno task bundle

FROM denoland/deno:2.5.0
WORKDIR /app
COPY --from=builder /app /app
COPY --from=builder /deno-dir /deno-dir
EXPOSE 8000
CMD ["run", "--allow-net", "--allow-read", "--allow-env=CHART_API_URL", "src/main.ts"]
