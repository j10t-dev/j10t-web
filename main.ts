import { fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { Eta } from "@eta-dev/eta";
import { configure, getConsoleSink } from "jsr:@logtape/logtape";
import { logInfo } from "./lib/logger.ts";
import { Router } from "./routes/router.ts";

await configure({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: ["j10t-web"],
      lowestLevel: "info",
      sinks: ["console"],
    },
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console"],
    },
  ],
});

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
