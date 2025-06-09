import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { Eta } from "@eta-dev/eta";
import { getContentType } from "./lib/utils.ts";
import { getAllChartJSON } from "./lib/chart_data.ts";

const __dirname = fromFileUrl(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const VIEWS_DIR = join(__dirname, 'views');

const eta = new Eta({ views: VIEWS_DIR });

console.log('VIEWS_DIR:', VIEWS_DIR);

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Serve static files
  if (url.pathname.startsWith('/public/')) {
    try {
      const filePath = join(PUBLIC_DIR, url.pathname.replace('/public/', ''));
      const file = await Deno.readFile(filePath);
      const contentType = getContentType(filePath);
      return new Response(file, { headers: { 'content-type': contentType } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  }
  // Chart data API
  if (url.pathname === '/api/charts') {
    try {
      const data = await getAllChartJSON();
      return new Response(JSON.stringify(data), {
        headers: { 'content-type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify([]), {
        headers: { 'content-type': 'application/json' },
      });
    }
  }
  // Render measure page
  if (url.pathname === '/measure') {
    const body = await eta.renderAsync("measure", {});
    return new Response(body, { headers: { 'content-type': 'text/html' } });
  }
  // Render index page
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const body = await eta.renderAsync("index", {});
    return new Response(body, { headers: { 'content-type': 'text/html' } });
  }
  return new Response('Not found', { status: 404 });
}

if (import.meta.main) {
  console.log('Listening on http://localhost:8000');
  serve(handler, { port: 8000 });
}
