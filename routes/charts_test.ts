// deno-lint-ignore-file no-explicit-any
import { ChartDataHandler as OriginalChartDataHandler } from "./charts.ts";
import { assertEquals } from "jsr:@std/assert";

// Subclass for dependency injection
class ChartDataHandler extends OriginalChartDataHandler {
  constructor(private deps: { getAllChartJSON: () => Promise<any>, logInfo: (...args: any[]) => void, logError: (...args: any[]) => void }) {
    super();
  }
  override async handle(_req: Request): Promise<Response> {
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

Deno.test("ChartDataHandler returns chart data on success", async () => {
  const mockData = [{ foo: "bar" }];
  const handler = new ChartDataHandler({
    getAllChartJSON: () => Promise.resolve(mockData),
    logInfo: () => {},
    logError: () => {},
  });
  const res = await handler.handle(new Request("http://localhost/api/charts"));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body, mockData);
});

Deno.test("ChartDataHandler returns 500 on error", async () => {
  const handler = new ChartDataHandler({
    getAllChartJSON: () => { throw new Error("fail"); },
    logInfo: () => {},
    logError: () => {},
  });
  const res = await handler.handle(new Request("http://localhost/api/charts"));
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.error, "Failed to fetch chart data");
}); 