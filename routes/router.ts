import { StaticFileHandler } from "./static.ts";
import { ChartDataHandler } from "./charts.ts";
import { PageRenderHandler } from "./index.ts";
import { logError } from "../lib/logger.ts";
import { Eta } from "@eta-dev/eta";

export type RouteHandler = (req: Request) => Promise<Response>;

export interface RouterOptions {
  publicDir: string;
  eta: Eta;
}

export class Router {
  private staticHandler: StaticFileHandler;
  private chartHandler: ChartDataHandler;
  private pageHandler: PageRenderHandler;

  constructor({ publicDir, eta }: RouterOptions) {
    this.staticHandler = new StaticFileHandler(publicDir);
    this.chartHandler = new ChartDataHandler();
    this.pageHandler = new PageRenderHandler(eta);
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/public/")) {
      return await this.staticHandler.handle(url, req);
    }
    if (url.pathname.startsWith("/api/charts") || url.pathname === "/api/weight") {
      return await this.chartHandler.handle(req);
    }
    switch (url.pathname) {
      case "/measure":
        return await this.pageHandler.handle("measure");
      case "/weight":
        return await this.pageHandler.handle("weight");
      case "/":
      case "/index.html":
        return await this.pageHandler.handle("index");
      default:
        logError("Route not found", { path: url.pathname });
        return new Response("Not found", { status: 404 });
    }
  }
} 