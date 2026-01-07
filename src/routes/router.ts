import { StaticFileHandler } from "./static.ts";
import { ChartDataHandler } from "./charts.ts";
import { PageRenderHandler } from "./index.ts";
import { BlogHandler } from "./blog.ts";
import { logError } from "../lib/logger.ts";
import { Eta } from "@eta-dev/eta";
import { z } from "zod";

export type RouteHandler = (req: Request) => Promise<Response>;

// Zod schema for RouterOptions validation
export const RouterOptionsSchema = z.object({
  publicDir: z.string().min(1, "publicDir cannot be empty"),
  eta: z.custom<Eta>((val) => {
    return val && typeof val === 'object' && 'render' in val && typeof (val as any).render === 'function';
  }, {
    message: "eta must be a valid Eta instance with a render method"
  }),
  postsDir: z.string().min(1, "postsDir cannot be empty").optional(),
});

export type RouterOptions = z.infer<typeof RouterOptionsSchema>;

export class Router {
  private staticHandler: StaticFileHandler;
  private chartHandler: ChartDataHandler;
  private pageHandler: PageRenderHandler;
  private blogHandler: BlogHandler;

  constructor(options: RouterOptions) {
    // Validate options with Zod
    const parseResult = RouterOptionsSchema.safeParse(options);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid Router options: ${errorMessages}`);
    }

    const { publicDir, eta, postsDir } = parseResult.data;

    this.staticHandler = new StaticFileHandler(publicDir);
    this.chartHandler = new ChartDataHandler();
    this.pageHandler = new PageRenderHandler(eta);
    this.blogHandler = new BlogHandler(eta, postsDir);
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/public/")) {
      return await this.staticHandler.handle(url, req);
    }
    if (url.pathname.startsWith("/api/charts") || url.pathname === "/api/weight") {
      return await this.chartHandler.handle(req);
    }
    if (url.pathname.startsWith("/blog")) {
      return await this.blogHandler.handle(req);
    }
    switch (url.pathname) {
      case "/about":
        return await this.pageHandler.handle("about", { title: "About", currentPage: "about" });
      case "/projects":
        return await this.pageHandler.handle("projects", { title: "Projects", currentPage: "projects" });
      case "/measure":
        return await this.pageHandler.handle("measure", { title: "Measurements", currentPage: "measure" });
      case "/weight":
        return await this.pageHandler.handle("weight", { title: "Weight", currentPage: "weight" });
      case "/":
      case "/index.html": {
        const posts = this.blogHandler.getFormattedPosts();
        return await this.pageHandler.handle("index", { title: "j10t", currentPage: "home", posts });
      }
      default:
        logError("Route not found", { path: url.pathname });
        return new Response("Not found", { status: 404 });
    }
  }
} 