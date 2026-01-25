# j10t-web

Bun-based web application serving Vega-Lite charts for fitness measurement tracking.

## Commands

- `bun run dev` — development server with watch
- `bun test` — run tests
- `bun run bundle` — bundle frontend assets
- `bun run build-blog` — convert markdown posts to TypeScript modules

## Testing

Unit tests are co-located (`*_test.ts`). Integration tests: `bun test tests/integration/`

## Documentation

- [Architecture](docs/architecture.md) — components, data flow, design philosophy
- [Blog System](docs/blog-system.md) — markdown-to-module pipeline
- [Charts](docs/charts.md) — data handling, caching, API endpoints
