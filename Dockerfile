FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build-blog
RUN bun run bundle

FROM oven/bun:1-alpine
WORKDIR /app

# Copy only runtime-necessary files (not content/, tests/, build/)
COPY --from=builder /app/src /app/src
COPY --from=builder /app/posts /app/posts
COPY --from=builder /app/public /app/public
COPY --from=builder /app/views /app/views
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules

# Create non-root user
RUN addgroup -S -g 1001 bungroup && \
    adduser -S -u 1001 -G bungroup bunuser && \
    chown -R bunuser:bungroup /app
USER bunuser

EXPOSE 8000
CMD ["bun", "run", "src/main.ts"]
