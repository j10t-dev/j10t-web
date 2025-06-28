# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `deno task dev` (includes file watching)
- **Run production server**: `deno task start`
- **Run tests**: `deno task test`
- **Bundle frontend assets**: `deno task bundle`
- **Run single test file**: `deno test --allow-net --allow-read --allow-run --allow-env --allow-write <file_path>`

## Architecture Overview

This is a Deno-based web application that serves Vega-Lite charts for fitness measurement tracking. The architecture follows a clean separation of concerns:

### Core Components

- **main.ts**: Entry point that sets up the Eta templating engine and Router
- **Router (routes/router.ts)**: Central request dispatcher with three handler classes:
  - `StaticFileHandler`: Serves static files from `/public/` directory
  - `ChartDataHandler`: Provides chart data via `/api/charts` endpoint
  - `PageRenderHandler`: Renders HTML pages using Eta templates

### Data Flow

1. Chart data is fetched from external API at `http://127.0.0.1:8888/charts`
2. Data is cached for 1 hour to reduce external API calls
3. Charts are categorized as either SINGLE (single measurement) or LR (left/right measurements)
4. Frontend renders charts client-side using Vega-Lite library

### Key Libraries

- **@eta-dev/eta**: Server-side templating engine
- **@std/http**: Deno's standard HTTP utilities
- **vega-lite**: Chart specification and rendering (client-side)

## Project-Specific Guidelines

### Chart Data Handling
- Always use fetch for HTTP requests to maintain consistency
- Implement proper error handling with fallback to cached data
- Chart types are strictly typed: `TopLevelSpec` from vega-lite

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