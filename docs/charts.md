# Charts

## API Endpoints

- `/api/charts` — all chart data
- `/api/weight`, `/api/[metric]` — individual charts for progressive loading

## Data Source

SQLite backend at `http://127.0.0.1:8888/sqlite-charts` with POST endpoints:
- `/single` — single measurement charts
- `/LR` — left/right measurement charts

## Caching

Data cached for 1 hour. On fetch errors, fall back to cached data.

## Types

Chart specs use `TopLevelSpec` from vega-lite. Always use fetch for HTTP requests.
