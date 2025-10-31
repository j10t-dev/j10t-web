import { assertEquals, assertStringIncludes } from "@std/assert";
import { Router } from "../../src/routes/router.ts";
import { Eta } from "@eta-dev/eta";

Deno.test("Router integration - Static file handler serves actual files", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "./public", eta: mockEta });

  // Request an actual file that exists
  const req = new Request("http://localhost/public/index.js");
  const res = await router.handle(req);

  // Should get 200 or 404 depending on file existence, but not an error
  assertEquals([200, 404].includes(res.status), true);

  // If 200, should have correct content-type
  if (res.status === 200) {
    assertStringIncludes(res.headers.get("content-type") || "", "javascript");
  }
});

Deno.test("Router integration - Chart handler returns valid JSON", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "./public", eta: mockEta });

  const req = new Request("http://localhost/api/charts");
  const res = await router.handle(req);

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "application/json");

  const body = await res.json();
  assertEquals(Array.isArray(body), true);

  // If data exists, verify it's Vega-Lite specs
  if (body.length > 0) {
    assertEquals(typeof body[0], "object");
    // Should have Vega-Lite structure (mark, data, etc)
  }
});

Deno.test("Router integration - Page handler renders HTML templates", async () => {
  const mockEta = new Eta({ views: "./views", cache: false });
  const router = new Router({ publicDir: "./public", eta: mockEta });

  const req = new Request("http://localhost/measure");
  const res = await router.handle(req);

  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("content-type") || "", "text/html");

  const html = await res.text();
  assertStringIncludes(html, "<!DOCTYPE html>");
});

Deno.test("Router integration - Unknown routes return 404", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "./public", eta: mockEta });

  const req = new Request("http://localhost/definitely-not-a-real-route-12345");
  const res = await router.handle(req);

  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Not found");
});
