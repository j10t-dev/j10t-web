// deno-lint-ignore-file no-explicit-any
import { ChartDataHandler, ChartParamsSchema } from "./charts.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("ChartDataHandler returns chart data on success", async () => {
  const mockData = [
    {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: "line",
      encoding: {
        x: { field: "date", type: "temporal" },
        y: { field: "value", type: "quantitative" }
      },
      data: { values: [{ date: "2024-01-01", value: 70 }] },
      width: 800,
      height: 400
    }
  ];

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
  assertEquals(body[0].$schema, "https://vega.github.io/schema/vega-lite/v5.json");
  assertEquals(body[0].mark, "line");
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
  const mockWeightChart = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: "line",
    encoding: {
      x: { field: "date", type: "temporal" },
      y: { field: "value", type: "quantitative", title: "Weight (kg)" }
    },
    data: { values: [{ date: "2024-01-01", value: 70 }] },
    width: 800,
    height: 400
  };

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
  const res = await handler.handle(new Request("http://localhost/api/weight"));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body, mockWeightChart);
  assertEquals(body.$schema, "https://vega.github.io/schema/vega-lite/v5.json");
});

Deno.test("ChartDataHandler returns 500 for /weight endpoint on error", async () => {
  const handler = new ChartDataHandler({
    getAllChartJSON: () => Promise.resolve([]),
    getChartJSON: () => { throw new Error("weight fetch failed"); },
    logInfo: () => {},
    logError: () => {},
  });
  const res = await handler.handle(new Request("http://localhost/api/weight"));
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