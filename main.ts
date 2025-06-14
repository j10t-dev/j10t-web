import { fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { Eta } from "@eta-dev/eta";
import { logInfo } from "./lib/logger.ts";
import { Router } from "./routes/router.ts";

const __dirname = fromFileUrl(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const VIEWS_DIR = join(__dirname, "views");

const eta = new Eta({ views: VIEWS_DIR });
const router = new Router({ publicDir: PUBLIC_DIR, eta });

export async function handler(req: Request): Promise<Response> {
  return await router.handle(req);
}

if (import.meta.main) {
  logInfo("Listening on http://localhost:8000");
  Deno.serve({ port: 8000 }, handler);
}
