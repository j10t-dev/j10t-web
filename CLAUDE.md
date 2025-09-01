# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `deno task dev` (includes file watching)
- **Run production server**: `deno task start`
- **Run tests**: `deno task test`
- **Bundle frontend assets**: `deno task bundle`
- **Build blog posts**: `deno run --allow-read --allow-write build-blog.ts`
- **Run single test file**: `deno test --allow-net --allow-read --allow-run --allow-env --allow-write <file_path>`

## Test Structure Guidelines

### Test Organization
- **Unit tests**: Co-located with source files using `_test.ts` suffix (e.g., `router.ts` → `router_test.ts`)
- **Integration tests**: Located in `/tests/integration/` directory
- **Test helpers**: Located in `/tests/helpers/` directory
- **Naming convention**: Use `_test.ts` suffix consistently (Deno standard)

### Test File Locations
```
lib/
  chart_data.ts
  chart_data_test.ts      # Unit tests co-located
  logger.ts
  logger_test.ts          # Unit tests co-located

routes/
  blog.ts
  blog_test.ts           # Unit tests co-located
  router.ts
  router_test.ts         # Unit tests co-located

tests/
  integration/           # Multi-module integration tests
    blog_integration_test.ts
  helpers/              # Test utilities and helpers
    blog_test_helpers.ts
```

### Test Commands
- **Run all tests**: `deno task test`
- **Run unit tests only**: `deno test **/*_test.ts --ignore=tests/`
- **Run integration tests only**: `deno test tests/integration/`
- **Run specific test file**: `deno test --allow-all path/to/file_test.ts`

## Architecture Overview

This is a Deno-based web application that serves Vega-Lite charts for fitness measurement tracking. The architecture follows a clean separation of concerns:

### Core Components

- **main.ts**: Entry point that sets up the Eta templating engine and Router
- **Router (routes/router.ts)**: Central request dispatcher with four handler classes:
  - `StaticFileHandler`: Serves static files from `/public/` directory
  - `ChartDataHandler`: Provides chart data via `/api/charts` endpoint and individual chart endpoints (e.g., `/api/weight`)
  - `PageRenderHandler`: Renders HTML pages using Eta templates (supports `/measure/`, `/weight/` views)
  - `BlogHandler`: Serves blog posts from generated TypeScript modules (`/blog/` routes)

### Data Flow

1. Chart data is fetched from SQLite backend API at `http://127.0.0.1:8888/sqlite-charts`
2. Data is cached for 1 hour to reduce external API calls
3. Charts are categorized as either SINGLE (single measurement) or LR (left/right measurements)
4. Frontend renders charts client-side using Vega-Lite library
5. Individual chart endpoints support progressive loading (e.g., `/api/weight` for weight-only view)

### Key Libraries

- **@eta-dev/eta**: Server-side templating engine
- **@std/http**: Deno's standard HTTP utilities
- **@deno/gfm**: GitHub Flavored Markdown rendering for blog posts
- **vega-lite**: Chart specification and rendering (client-side)

## Project-Specific Guidelines

### Blog Implementation
- Blog posts are written in markdown in `/content/*.md` directory
- Build script converts markdown to TypeScript modules in `/posts/` directory
- Posts support frontmatter (title, date) or auto-generate from filename
- Blog routes: `/blog/` (index) and `/blog/[slug]` (individual posts)
- No JavaScript required for core blog functionality

### Chart Data Handling
- Always use fetch for HTTP requests to maintain consistency
- Implement proper error handling with fallback to cached data
- Chart types are strictly typed: `TopLevelSpec` from vega-lite
- SQLite backend provides `/single` and `/LR` endpoints with POST requests
- Individual chart views support progressive loading for better performance

### Performance Considerations
- Bundle size optimization is critical (deployment target: Raspberry Pi)
- Use dynamic imports where possible
- Chart data is cached with 1-hour expiry

### TypeScript Usage
- All components must use TypeScript for type safety
- Strict mode is enabled in compiler options
- Use proper type annotations for Vega-Lite specifications

### Security & Deployment
- Designed for cloudflare tunnel deployment
- Static file serving includes security protections
- No client-side JavaScript framework dependencies (vanilla JS approach)

### Design Philosophy
- Minimal, fast, modern frontend without heavy frameworks
- Support for no-JS option where possible
- Responsive Vega charts for different screen sizes