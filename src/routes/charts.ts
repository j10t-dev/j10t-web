import {
  getAllChartJSON,
  getChartJSON,
  LR_CHARTS,
  SINGLE_CHARTS,
} from "../lib/chart_data";
import { logError, logInfo } from "../lib/logger";
import { z } from "zod";

// Zod schema for chart URL path parameters
export const ChartParamsSchema = z.object({
  type: z.enum(["single", "lr"], {
    errorMap: () => ({ message: "Chart type must be 'single' or 'lr'" })
  }),
  name: z.string()
    .min(1, "Chart name cannot be empty")
    .regex(/^[a-zA-Z0-9_-]+$/, "Chart name must only contain alphanumeric characters, hyphens, and underscores")
});

export type ChartParams = z.infer<typeof ChartParamsSchema>;

// Dependencies interface for testing
export interface ChartDataHandlerDeps {
  getAllChartJSON: () => Promise<any>;
  getChartJSON: (type: "SINGLE" | "LR" | string, name: string) => Promise<any>;
  logInfo: (...args: any[]) => void;
  logError: (...args: any[]) => void;
}

export class ChartDataHandler {
  private deps: ChartDataHandlerDeps;

  constructor(deps?: ChartDataHandlerDeps) {
    // Use provided dependencies or default to real implementations
    this.deps = deps ?? {
      getAllChartJSON,
      getChartJSON: getChartJSON as ChartDataHandlerDeps['getChartJSON'],
      logInfo,
      logError,
    };
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Handle weight endpoint specifically
    if (url.pathname === "/api/weight") {
      try {
        const chartData = await this.deps.getChartJSON("SINGLE", SINGLE_CHARTS["Weight"]);
        return new Response(JSON.stringify(chartData), {
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        this.deps.logError("Failed to fetch weight chart", {
          error: error instanceof Error ? error.message : String(error),
        });
        return new Response(
          JSON.stringify({ error: "Failed to fetch weight chart data" }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
    }

    // Handle individual chart requests: /api/charts/{type}/{name}
    const pattern = new URLPattern({ pathname: "/api/charts/:type/:name" });
    const match = pattern.exec(url);

    if (match) {
      const { type, name } = match.pathname.groups;

      // Validate URL parameters with Zod
      const paramsResult = ChartParamsSchema.safeParse({ type, name });

      if (!paramsResult.success) {
        const errorMessages = paramsResult.error.errors.map(e => e.message).join(', ');
        this.deps.logError("Invalid chart path parameters", {
          type,
          name,
          errors: paramsResult.error.errors,
        });
        return new Response(
          JSON.stringify({ error: `Invalid chart path: ${errorMessages}` }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }

      const validParams = paramsResult.data;

      try {
        let chartData;
        const capitalizedName = validParams.name.charAt(0).toUpperCase() +
          validParams.name.slice(1).toLowerCase();

        if (validParams.type === "single" && capitalizedName in SINGLE_CHARTS) {
          chartData = await this.deps.getChartJSON(
            "SINGLE",
            SINGLE_CHARTS[capitalizedName],
          );
        } else if (validParams.type === "lr" && capitalizedName in LR_CHARTS) {
          chartData = await this.deps.getChartJSON("LR", LR_CHARTS[capitalizedName]);
        } else {
          return new Response(
            JSON.stringify({ error: "Chart not found" }),
            { status: 404, headers: { "content-type": "application/json" } },
          );
        }

        return new Response(JSON.stringify(chartData), {
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        this.deps.logError("Failed to fetch individual chart", {
          type: validParams.type,
          name: validParams.name,
          error: error instanceof Error ? error.message : String(error),
        });
        return new Response(
          JSON.stringify({ error: "Failed to fetch chart data" }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
    }

    // Handle all charts request: /api/charts
    try {
      const data = await this.deps.getAllChartJSON();
      this.deps.logInfo("Fetched chart data", { count: data.length });
      return new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      this.deps.logError("Failed to fetch chart data", {
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
}
