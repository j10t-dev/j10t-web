import { getAllChartJSON } from "./chart_data.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";

// Save the original fetch
const originalFetch = globalThis.fetch;

Deno.test("getAllChartJSON returns chart data array (mocked)", async () => {
  let called = 0;
  globalThis.fetch = async (url, opts) => {
    called++;
    return {
      async json() {
        return { mock: true, url, opts };
      },
      ok: true,
    } as Response;
  };
  const data = await getAllChartJSON();
  assertEquals(Array.isArray(data), true);
  assertEquals(data.length > 0, true);
  assertEquals(data[0].mock, true);
  globalThis.fetch = originalFetch;
}); 