import {
  getAllChartJSON,
  getChartJSON,
  LR_CHARTS,
  SINGLE_CHARTS,
} from "../lib/chart_data.ts";
import { logError, logInfo } from "../lib/logger.ts";

export class ChartDataHandler {
  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Handle weight endpoint specifically
    if (url.pathname === "/api/weight") {
      try {
        const chartData = await getChartJSON("SINGLE", SINGLE_CHARTS["Weight"]);
        return new Response(JSON.stringify(chartData), {
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        logError("Failed to fetch weight chart", {
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

      if (!type || !name) {
        return new Response(
          JSON.stringify({ error: "Invalid chart path" }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }

      try {
        let chartData;
        const capitalizedName = name.charAt(0).toUpperCase() +
          name.slice(1).toLowerCase();

        if (type === "single" && capitalizedName in SINGLE_CHARTS) {
          chartData = await getChartJSON(
            "SINGLE",
            SINGLE_CHARTS[capitalizedName],
          );
        } else if (type === "lr" && capitalizedName in LR_CHARTS) {
          chartData = await getChartJSON("LR", LR_CHARTS[capitalizedName]);
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
        logError("Failed to fetch individual chart", {
          type,
          name,
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
}
