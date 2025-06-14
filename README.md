# Lifts FE (Deno Edition)

A minimal, fast, and modern frontend for displaying VEGA charts using Deno and
vanilla JS. No React or heavy frameworks.

## Features

- Deno HTTP server
- Vega charts rendered client-side
- Simple, maintainable structure

## Getting Started

1. Install [Deno](https://deno.land/manual/getting_started/installation)
2. Run the server:
   ```sh
   deno run --allow-net --allow-read main.ts
   ```
3. Open your browser at [http://localhost:8000](http://localhost:8000)

## Project Structure

- `main.ts` — Deno server entry point
- `routes/` — API endpoints (e.g., chart data)
- `views/` — HTML templates
- `public/` — Static assets (JS, CSS, Vega libs)

## To-do

- Add more pages/styles

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
