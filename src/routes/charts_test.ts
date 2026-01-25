import { ChartDataHandler, ChartParamsSchema } from "./charts";
import { test, expect } from "bun:test";

test("ChartDataHandler returns chart data on success", async () => {
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
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual(mockData);
  expect(body[0].$schema).toBe("https://vega.github.io/schema/vega-lite/v5.json");
  expect(body[0].mark).toBe("line");
});

test("ChartDataHandler returns 500 on error", async () => {
  const handler = new ChartDataHandler({
    getAllChartJSON: () => { throw new Error("fail"); },
    getChartJSON: () => Promise.resolve({ weight: "chart" }),
    logInfo: () => {},
    logError: () => {},
  });
  const res = await handler.handle(new Request("http://localhost/api/charts"));
  expect(res.status).toBe(500);
  const body = await res.json();
  expect(body.error).toBe("Failed to fetch chart data");
});

test("ChartDataHandler handles /weight endpoint", async () => {
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
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual(mockWeightChart);
  expect(body.$schema).toBe("https://vega.github.io/schema/vega-lite/v5.json");
});

test("ChartDataHandler returns 500 for /weight endpoint on error", async () => {
  const handler = new ChartDataHandler({
    getAllChartJSON: () => Promise.resolve([]),
    getChartJSON: () => { throw new Error("weight fetch failed"); },
    logInfo: () => {},
    logError: () => {},
  });
  const res = await handler.handle(new Request("http://localhost/api/weight"));
  expect(res.status).toBe(500);
  const body = await res.json();
  expect(body.error).toBe("Failed to fetch weight chart data");
});

test("ChartParamsSchema - Validates valid chart parameters", () => {
  const validParams = {
    type: "single",
    name: "weight"
  };

  const result = ChartParamsSchema.safeParse(validParams);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.type).toBe("single");
    expect(result.data.name).toBe("weight");
  }
});

test("ChartParamsSchema - Validates lr chart type", () => {
  const validParams = {
    type: "lr",
    name: "biceps"
  };

  const result = ChartParamsSchema.safeParse(validParams);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.type).toBe("lr");
    expect(result.data.name).toBe("biceps");
  }
});

test("ChartParamsSchema - Rejects invalid chart type", () => {
  const invalidParams = {
    type: "invalid",
    name: "weight"
  };

  const result = ChartParamsSchema.safeParse(invalidParams);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].message).toContain("single");
  }
});

test("ChartParamsSchema - Rejects empty name", () => {
  const invalidParams = {
    type: "single",
    name: ""
  };

  const result = ChartParamsSchema.safeParse(invalidParams);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].message).toContain("empty");
  }
});

test("ChartParamsSchema - Rejects invalid name characters", () => {
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
    expect(result.success).toBe(false);
  }
});

test("ChartParamsSchema - Accepts valid name patterns", () => {
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
    expect(result.success).toBe(true);
  }
});

test("ChartParamsSchema - Rejects missing type", () => {
  const invalidParams = {
    name: "weight"
  };

  const result = ChartParamsSchema.safeParse(invalidParams);
  expect(result.success).toBe(false);
});

test("ChartParamsSchema - Rejects missing name", () => {
  const invalidParams = {
    type: "single"
  };

  const result = ChartParamsSchema.safeParse(invalidParams);
  expect(result.success).toBe(false);
});
