# Architecture

## Core Components

- **src/main.ts**: Entry point, sets up Eta templating and Router
- **Router (src/routes/router.ts)**: Central request dispatcher with handlers:
  - `StaticFileHandler`: Serves `/public/` directory
  - `ChartDataHandler`: `/api/charts` and individual endpoints (e.g., `/api/weight`)
  - `PageRenderHandler`: Eta templates for `/measure/`, `/weight/` views
  - `BlogHandler`: `/blog/` routes from generated TypeScript modules

## Data Flow

1. Chart data fetched from SQLite backend at `http://127.0.0.1:8888/sqlite-charts`
2. Cached for 1 hour
3. Charts categorised as SINGLE or LR (left/right measurements)
4. Frontend renders client-side via Vega-Lite
5. Individual endpoints support progressive loading

## Design Philosophy

- Minimal frontend—no heavy frameworks, vanilla JS
- No-JS fallback where possible
- Responsive Vega charts
- Bundle size critical (deployment target: Raspberry Pi)
