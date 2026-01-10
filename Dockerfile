FROM denoland/deno:2.5.0 AS builder
WORKDIR /app
COPY deno.json ./
RUN deno install --entrypoint src/main.ts --no-lock
COPY . .
RUN deno cache --no-lock src/main.ts

FROM denoland/deno:2.5.0
WORKDIR /app
COPY --from=builder /app /app
COPY --from=builder /deno-dir /deno-dir
EXPOSE 8000
CMD ["run", "--allow-net", "--allow-read", "src/main.ts"]
