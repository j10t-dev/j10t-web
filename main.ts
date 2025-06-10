import { fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { Eta } from "@eta-dev/eta";
import { getContentType, sanitizePath } from "./lib/utils.ts";
import { getAllChartJSON } from "./lib/chart_data.ts";
import { logError, logInfo } from "./lib/logger.ts";

const __dirname = fromFileUrl(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const VIEWS_DIR = join(__dirname, "views");

const eta = new Eta({ views: VIEWS_DIR });

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Serve static files
  if (url.pathname.startsWith("/public/")) {
    try {
      const relPath = url.pathname.replace("/public/", "");
      const filePath = sanitizePath(PUBLIC_DIR, relPath);
      const fileInfo = await Deno.stat(filePath);
      if (!fileInfo.isFile) throw new Error("Not a file");
      const file = await Deno.readFile(filePath);
      const contentType = getContentType(filePath);
      // Caching headers
      const lastModified = fileInfo.mtime?.toUTCString() ?? undefined;
      const etag = `W/\"${fileInfo.size}-${fileInfo.mtime?.getTime() ?? 0}\"`;
      const headers = new Headers({
        "content-type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      });
      if (lastModified) headers.set("Last-Modified", lastModified);
      headers.set("ETag", etag);
      // Conditional requests
      const ifNoneMatch = req.headers.get("if-none-match");
      const ifModifiedSince = req.headers.get("if-modified-since");
      if (
        (ifNoneMatch && ifNoneMatch === etag) ||
        (ifModifiedSince && lastModified && ifModifiedSince === lastModified)
      ) {
        return new Response(null, { status: 304, headers });
      }
      return new Response(file, { headers });
    } catch (err) {
      logError("Static file not found", {
        path: url.pathname,
        error: err instanceof Error ? err.message : String(err),
      });
      return new Response("Not found", { status: 404 });
    }
  }
  // Chart data API
  if (url.pathname === "/api/charts") {
    try {
      const data = await getAllChartJSON();
      logInfo("Fetched chart data", { count: data.length });
      return new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      logError("Failed to fetch chart data", {
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response(
        JSON.stringify({ error: "Failed to fetch chart data" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }
  }
  // Render measure page
  if (url.pathname === "/measure") {
    const body = await eta.renderAsync("measure", {});
    return new Response(body, { headers: { "content-type": "text/html" } });
  }
  // Render index page
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const body = await eta.renderAsync("index", {});
    return new Response(body, { headers: { "content-type": "text/html" } });
  }
  logError("Route not found", { path: url.pathname });
  return new Response("Not found", { status: 404 });
}

if (import.meta.main) {
  console.log("Listening on http://localhost:8000");
  Deno.serve({ port: 8000 }, handler);
}
