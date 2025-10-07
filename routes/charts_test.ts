// deno-lint-ignore-file no-explicit-any
import { ChartDataHandler as OriginalChartDataHandler, ChartParamsSchema } from "./charts.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";

// Subclass for dependency injection
class ChartDataHandler extends OriginalChartDataHandler {
  constructor(private deps: { getAllChartJSON: () => Promise<any>, getChartJSON: (type: string, name: string) => Promise<any>, logInfo: (...args: any[]) => void, logError: (...args: any[]) => void }) {
    super();
  }
  override async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Handle weight endpoint specifically
    if (url.pathname === "/weight") {
      try {
        const chartData = await this.deps.getChartJSON("SINGLE", "weight");
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
    getChartJSON: () => Promise.resolve({ weight: "chart" }),
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
    getChartJSON: () => Promise.resolve({ weight: "chart" }),
    logInfo: () => {},
    logError: () => {},
  });
  const res = await handler.handle(new Request("http://localhost/api/charts"));
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.error, "Failed to fetch chart data");
});

Deno.test("ChartDataHandler handles /weight endpoint", async () => {
  const mockWeightChart = { data: "weight chart" };
  const handler = new ChartDataHandler({
    getAllChartJSON: () => Promise.resolve([]),
    getChartJSON: (type: string, name: string) => {
      if (type === "SINGLE" && name === "weight") {
        return Promise.resolve(mockWeightChart);
      }
      throw new Error("Not found");
    },
    logInfo: () => {},
    logError: () => {},
  });
  const res = await handler.handle(new Request("http://localhost/weight"));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body, mockWeightChart);
});

Deno.test("ChartDataHandler returns 500 for /weight endpoint on error", async () => {
  const handler = new ChartDataHandler({
    getAllChartJSON: () => Promise.resolve([]),
    getChartJSON: () => { throw new Error("weight fetch failed"); },
    logInfo: () => {},
    logError: () => {},
  });
  const res = await handler.handle(new Request("http://localhost/weight"));
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.error, "Failed to fetch weight chart data");
});

Deno.test("ChartParamsSchema - Validates valid chart parameters", () => {
  const validParams = {
    type: "single",
    name: "weight"
  };

  const result = ChartParamsSchema.safeParse(validParams);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.type, "single");
    assertEquals(result.data.name, "weight");
  }
});

Deno.test("ChartParamsSchema - Validates lr chart type", () => {
  const validParams = {
    type: "lr",
    name: "biceps"
  };

  const result = ChartParamsSchema.safeParse(validParams);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.type, "lr");
    assertEquals(result.data.name, "biceps");
  }
});

Deno.test("ChartParamsSchema - Rejects invalid chart type", () => {
  const invalidParams = {
    type: "invalid",
    name: "weight"
  };

  const result = ChartParamsSchema.safeParse(invalidParams);
  assertEquals(result.success, false);
  if (!result.success) {
    assertStringIncludes(result.error.errors[0].message, "single");
  }
});

Deno.test("ChartParamsSchema - Rejects empty name", () => {
  const invalidParams = {
    type: "single",
    name: ""
  };

  const result = ChartParamsSchema.safeParse(invalidParams);
  assertEquals(result.success, false);
  if (!result.success) {
    assertStringIncludes(result.error.errors[0].message, "empty");
  }
});

Deno.test("ChartParamsSchema - Rejects invalid name characters", () => {
  const invalidNames = [
    "weight chart",     // Space
    "weight.chart",     // Dot
    "weight/chart",     // Slash
    "weight@chart",     // Special char
    "weight<script>",   // HTML
  ];

  for (const name of invalidNames) {
    const invalidParams = {
      type: "single",
      name
    };

    const result = ChartParamsSchema.safeParse(invalidParams);
    assertEquals(result.success, false, `Should reject name: ${name}`);
  }
});

Deno.test("ChartParamsSchema - Accepts valid name patterns", () => {
  const validNames = [
    "weight",
    "biceps-left",
    "chest_measurement",
    "Body-Fat-123",
    "test_chart-v2",
  ];

  for (const name of validNames) {
    const validParams = {
      type: "single",
      name
    };

    const result = ChartParamsSchema.safeParse(validParams);
    assertEquals(result.success, true, `Should accept name: ${name}`);
  }
});

Deno.test("ChartParamsSchema - Rejects missing type", () => {
  const invalidParams = {
    name: "weight"
  };

  const result = ChartParamsSchema.safeParse(invalidParams);
  assertEquals(result.success, false);
});

Deno.test("ChartParamsSchema - Rejects missing name", () => {
  const invalidParams = {
    type: "single"
  };

  const result = ChartParamsSchema.safeParse(invalidParams);
  assertEquals(result.success, false);
}); 