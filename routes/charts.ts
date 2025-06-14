import { getAllChartJSON } from "../lib/chart_data.ts";
import { logError, logInfo } from "../lib/logger.ts";

export class ChartDataHandler {
  async handle(_req: Request): Promise<Response> {
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
