import { getAllChartJSON, getChartJSON, VegaLiteSpecSchema } from "./chart_data.ts";
import { assertEquals, assertRejects } from "@std/assert";

// Save the original fetch
const originalFetch = globalThis.fetch;

Deno.test("getAllChartJSON returns chart data array (mocked)", async () => {
  let called = 0;
  globalThis.fetch = async (url, opts) => {
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
  const data = await getAllChartJSON();
  assertEquals(Array.isArray(data), true);
  assertEquals(data.length > 0, true);
  // Use type assertion to access mock property for test only
  assertEquals((data[0] as any).mock, true);
  globalThis.fetch = originalFetch;
});

Deno.test("VegaLiteSpecSchema validates valid chart specification", () => {
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
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.$schema, validSpec.$schema);
    assertEquals(result.data.mark, "line");
  }
});

Deno.test("VegaLiteSpecSchema validates minimal spec", () => {
  const minimalSpec = {
    mark: "bar"
  };

  const result = VegaLiteSpecSchema.safeParse(minimalSpec);
  assertEquals(result.success, true);
});

Deno.test("VegaLiteSpecSchema allows additional properties", () => {
  const specWithExtras = {
    mark: "point",
    customProperty: "custom value",
    nestedCustom: { foo: "bar" }
  };

  const result = VegaLiteSpecSchema.safeParse(specWithExtras);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals((result.data as any).customProperty, "custom value");
  }
});

Deno.test("VegaLiteSpecSchema rejects non-object values", () => {
  const invalidValues = [null, undefined, "string", 123, [], true];

  for (const invalid of invalidValues) {
    const result = VegaLiteSpecSchema.safeParse(invalid);
    assertEquals(result.success, false);
  }
});

Deno.test("getChartJSON rejects invalid API response", async () => {
  globalThis.fetch = async () => {
    return {
      async json() {
        return "invalid data";
      },
      ok: true,
      status: 200,
      statusText: "OK"
    } as unknown as Response;
  };

  await assertRejects(
    async () => await getChartJSON("SINGLE", "test-invalid"),
    Error,
    "Invalid chart data structure"
  );

  globalThis.fetch = originalFetch;
});

Deno.test("getChartJSON validates and accepts valid response", async () => {
  const mockValidSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: "line",
    data: { values: [{ x: 1, y: 2 }] }
  };

  globalThis.fetch = async () => {
    return {
      async json() {
        return mockValidSpec;
      },
      ok: true,
      status: 200,
      statusText: "OK"
    } as unknown as Response;
  };

  const result = await getChartJSON("SINGLE", "test-valid-weight");
  assertEquals((result as any).mark, "line");
  assertEquals((result as any).$schema, mockValidSpec.$schema);

  globalThis.fetch = originalFetch;
});
