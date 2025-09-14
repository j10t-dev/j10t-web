import { StaticFileHandler } from "./static.ts";
import { ChartDataHandler } from "./charts.ts";
import { PageRenderHandler } from "./index.ts";
import { BlogHandler } from "./blog.ts";
import { logError } from "../lib/logger.ts";
import { Eta } from "@eta-dev/eta";

export type RouteHandler = (req: Request) => Promise<Response>;

export interface RouterOptions {
  publicDir: string;
  eta: Eta;
  postsDir?: string;
}

export class Router {
  private staticHandler: StaticFileHandler;
  private chartHandler: ChartDataHandler;
  private pageHandler: PageRenderHandler;
  private blogHandler: BlogHandler;

  constructor({ publicDir, eta, postsDir }: RouterOptions) {
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
      case "/measure":
        return await this.pageHandler.handle("measure", { title: "Measurements", currentPage: "measure" });
      case "/weight":
        return await this.pageHandler.handle("weight", { title: "Weight", currentPage: "weight" });
      case "/":
      case "/index.html":
        const posts = this.blogHandler.getAllPosts();
        return await this.pageHandler.handle("index", { title: "j10t", currentPage: "home", posts });
      default:
        logError("Route not found", { path: url.pathname });
        return new Response("Not found", { status: 404 });
    }
  }
} 