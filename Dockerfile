FROM denoland/deno:2.5.0 AS builder
WORKDIR /app
COPY . .
RUN deno cache src/main.ts
RUN deno task build-blog
RUN deno task bundle

FROM denoland/deno:2.5.0
WORKDIR /app

# Copy only runtime-necessary files (not content/, tests/, build/)
COPY --from=builder /app/src /app/src
COPY --from=builder /app/posts /app/posts
COPY --from=builder /app/public /app/public
COPY --from=builder /app/views /app/views
COPY --from=builder /app/deno.json /app/deno.json
COPY --from=builder /app/deno.lock /app/deno.lock

# Copy Deno cache (required for runtime)
COPY --from=builder /deno-dir /deno-dir

# Use existing non-root deno user from base image
RUN chown -R deno:deno /app
USER deno

EXPOSE 8000
CMD ["run", "--allow-net", "--allow-read", "--allow-env=CHART_API_URL", "src/main.ts"]
