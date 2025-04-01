# Lifts FE (Deno Edition)

A minimal, fast, and modern frontend for displaying VEGA charts using Deno and vanilla JS. No React or heavy frameworks.

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
