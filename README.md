# j10t-web

A minimal, fast, and modern frontend for displaying VEGA charts using Bun and
vanilla JS. No React or heavy frameworks.

## Features

- Bun HTTP server
- Vega charts rendered client-side
- Simple, maintainable structure

## Getting Started

1. Install [Bun](https://bun.sh/)
2. Install dependencies:
   ```sh
   bun install
   ```
3. Run the server:
   ```sh
   bun run dev
   ```
4. Open your browser at [http://localhost:8000](http://localhost:8000)

## Development Commands

- `bun run dev` — Start development server with file watching
- `bun run start` — Run production server
- `bun test` — Run all tests
- `bun run bundle` — Bundle frontend assets
- `bun run build-blog` — Build blog posts from markdown

## Deployment

Build a standalone binary for Raspberry Pi (ARM64):

```bash
bun build --compile --minify --target=bun-linux-arm64 src/main.ts --outfile j10t-web
```

Deploy to Raspberry Pi:

```bash
rsync -av \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='bun.lock' \
  --exclude='backlog.md' \
  --exclude='docs/' \
  --exclude='content/' \
  ./ admin@pihost.local:/home/admin/opt/j10t-web/
```

## Project Structure

```
.
├── build/           # Build scripts
├── src/             # Application source code
│   ├── main.ts     # Server entry point
│   ├── lib/        # Shared utilities
│   └── routes/     # Route handlers and API endpoints
├── tests/           # Test files
├── views/           # HTML templates
└── public/          # Static assets (JS, CSS, Vega libs)
```

## API Documentation

### GET /api/charts

Returns an array of [Vega-Lite TopLevelSpec](https://vega.github.io/vega-lite/docs/spec.html) chart specifications for all supported measurements.

**Request:**
- Method: `GET`
- URL: `/api/charts`
- Body: _None_

**Response:**
- Status: `200 OK`
- Content-Type: `application/json`
- Body: JSON array of Vega-Lite TopLevelSpec objects. Each object describes a chart. Example structure:

  ```json
  [
    {
      "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
      "data": { ... },
      "mark": "bar",
      "encoding": { ... },
      ...
    },
    ...
  ]
  ```
  See [Vega-Lite documentation](https://vega.github.io/vega-lite/docs/spec.html) for the full schema.

**Error Responses:**
- Status: `500 Internal Server Error`
- Content-Type: `application/json`
- Body: `{ "error": "Failed to fetch chart data" }`

**Notes:**
- The endpoint does not require authentication.
- The response array may be empty if no charts are available.
- All chart specifications conform to the Vega-Lite TopLevelSpec format.
