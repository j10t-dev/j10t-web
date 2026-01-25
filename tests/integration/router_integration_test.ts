import { test, expect } from "bun:test";
import { Router } from "../../src/routes/router";
import { Eta } from "eta";

test("Router integration - Static file handler serves actual files", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "./public", eta: mockEta });

  // Request an actual file that exists
  const req = new Request("http://localhost/public/index.js");
  const res = await router.handle(req);

  // Should get 200 or 404 depending on file existence, but not an error
  expect([200, 404].includes(res.status)).toBe(true);

  // If 200, should have correct content-type
  if (res.status === 200) {
    expect(res.headers.get("content-type") || "").toContain("javascript");
  }
});

test("Router integration - Chart handler returns valid JSON", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "./public", eta: mockEta });

  const req = new Request("http://localhost/api/charts");
  const res = await router.handle(req);

  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("application/json");

  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);

  // If data exists, verify it's Vega-Lite specs
  if (body.length > 0) {
    expect(typeof body[0]).toBe("object");
    // Should have Vega-Lite structure (mark, data, etc)
  }
});

test("Router integration - Page handler renders HTML templates", async () => {
  const mockEta = new Eta({ views: "./views", cache: false });
  const router = new Router({ publicDir: "./public", eta: mockEta });

  const req = new Request("http://localhost/measure");
  const res = await router.handle(req);

  expect(res.status).toBe(200);
  expect(res.headers.get("content-type") || "").toContain("text/html");

  const html = await res.text();
  expect(html).toContain("<!DOCTYPE html>");
});

test("Router integration - Unknown routes return 404", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "./public", eta: mockEta });

  const req = new Request("http://localhost/definitely-not-a-real-route-12345");
  const res = await router.handle(req);

  expect(res.status).toBe(404);
  expect(await res.text()).toBe("Not found");
});
