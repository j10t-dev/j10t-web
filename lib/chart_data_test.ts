import { getAllChartJSON } from "./chart_data.ts";
import { assertEquals } from "jsr:@std/assert";

// Save the original fetch
const originalFetch = globalThis.fetch;

Deno.test("getAllChartJSON returns chart data array (mocked)", async () => {
  let called = 0;
  globalThis.fetch = async (url, opts) => {
    called++;
    return {
      async json() {
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
