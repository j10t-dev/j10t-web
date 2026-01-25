import { join } from "node:path";
import { Eta } from "eta";
import { configure, getConsoleSink } from "@logtape/logtape";
import { logInfo } from "./lib/logger";
import { Router } from "./routes/router";

await configure({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: ["j10t-web"],
      level: "info",
      sinks: ["console"],
    },
    {
      category: ["logtape", "meta"],
      level: "warning",
      sinks: ["console"],
    },
  ],
});

const __dirname = import.meta.dir;
const PUBLIC_DIR = join(__dirname, "..", "public");
const VIEWS_DIR = join(__dirname, "..", "views");
const POSTS_DIR = join(__dirname, "..", "posts");

const eta = new Eta({ views: VIEWS_DIR });
const router = new Router({ publicDir: PUBLIC_DIR, eta, postsDir: POSTS_DIR });

export async function handler(req: Request): Promise<Response> {
  return await router.handle(req);
}

if (import.meta.main) {
  logInfo("Listening on http://localhost:8000");
  Bun.serve({ port: 8000, fetch: handler });
}
