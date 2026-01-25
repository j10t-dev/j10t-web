import { test, expect } from "bun:test";
import { getAllChartJSON, getChartJSON, VegaLiteSpecSchema } from "./chart_data";

const originalFetch = globalThis.fetch;

test("getAllChartJSON returns chart data array (mocked)", async () => {
  let called = 0;
  const mockFetch = async (url: string | URL | Request, opts?: RequestInit) => {
    called++;
    return {
      json() {
        return {
          $schema: "https://vega.github.io/schema/vega-lite/v5.json",
          mock: true,
          url,
          opts,
        } as any;
      },
      ok: true,
    } as Response;
  };

  try {
    globalThis.fetch = mockFetch as any;
    const data = await getAllChartJSON();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length > 0).toBe(true);
    expect((data[0] as any).mock).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("VegaLiteSpecSchema validates valid chart specification", () => {
  const validSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: "line",
    encoding: {
      x: { field: "date", type: "temporal" },
      y: { field: "value", type: "quantitative" }
    },
    data: { values: [] }
  };

  const result = VegaLiteSpecSchema.safeParse(validSpec);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.$schema).toBe(validSpec.$schema);
    expect(result.data.mark).toBe("line");
  }
});

test("VegaLiteSpecSchema validates minimal spec", () => {
  const minimalSpec = { mark: "bar" };
  const result = VegaLiteSpecSchema.safeParse(minimalSpec);
  expect(result.success).toBe(true);
});

test("VegaLiteSpecSchema allows additional properties", () => {
  const specWithExtras = {
    mark: "point",
    customProperty: "custom value",
    nestedCustom: { foo: "bar" }
  };

  const result = VegaLiteSpecSchema.safeParse(specWithExtras);
  expect(result.success).toBe(true);
  if (result.success) {
    expect((result.data as any).customProperty).toBe("custom value");
  }
});

test("VegaLiteSpecSchema rejects non-object values", () => {
  const invalidValues = [null, undefined, "string", 123, [], true];
  for (const invalid of invalidValues) {
    const result = VegaLiteSpecSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  }
});

test("getChartJSON rejects invalid API response", async () => {
  const mockFetch = async () => {
    return {
      async json() { return "invalid data"; },
      ok: true,
      status: 200,
      statusText: "OK"
    } as unknown as Response;
  };

  try {
    globalThis.fetch = mockFetch;
    await expect(getChartJSON("SINGLE", "test-invalid")).rejects.toThrow("Invalid chart data structure");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getChartJSON validates and accepts valid response", async () => {
  const mockValidSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: "line",
    data: { values: [{ x: 1, y: 2 }] }
  };

  const mockFetch = async () => {
    return {
      async json() { return mockValidSpec; },
      ok: true,
      status: 200,
      statusText: "OK"
    } as unknown as Response;
  };

  try {
    globalThis.fetch = mockFetch;
    const result = await getChartJSON("SINGLE", "test-valid-weight");
    expect((result as any).mark).toBe("line");
    expect((result as any).$schema).toBe(mockValidSpec.$schema);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
