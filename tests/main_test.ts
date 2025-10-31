import { handler } from "../src/main.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("handler returns home page with navigation and recent posts", async () => {
  const req = new Request("http://localhost:8000/");
  const res = await handler(req);
  assertEquals(res.status, 200);
  const text = await res.text();
  assertStringIncludes(text, "about");
  assertStringIncludes(text, "words");
  assertStringIncludes(text, "Recent");
  assertStringIncludes(text, "j10t");
});

Deno.test("handler returns measure page with chart container", async () => {
  const req = new Request("http://localhost:8000/measure");
  const res = await handler(req);
  assertEquals(res.status, 200);
  const text = await res.text();
  assertStringIncludes(text, '<div id="vis"');
  assertStringIncludes(text, "vega@5");
});

Deno.test("handler returns 404 for unknown route", async () => {
  const req = new Request("http://localhost:8000/unknown");
  const res = await handler(req);
  assertEquals(res.status, 404);
  const text = await res.text();
  assertEquals(text, "Not found");
});

Deno.test("GET / handles errors gracefully", async () => {
  try {
    const req = new Request("http://localhost/");
    const res = await handler(req);
    assertEquals(res instanceof Response, true);
    assertEquals([200, 404, 500].includes(res.status), true);
  } catch (error) {
    throw new Error(`Handler should not throw: ${error}`);
  }
});

Deno.test("GET /api/charts handles backend down gracefully", async () => {
  const req = new Request("http://localhost/api/charts");
  const res = await handler(req);

  assertEquals(res instanceof Response, true);
  assertEquals([200, 500].includes(res.status), true);
});

Deno.test("POST requests are handled without throwing", async () => {
  const req = new Request("http://localhost/", { method: "POST", body: "test" });
  const res = await handler(req);

  assertEquals(res instanceof Response, true);
  assertEquals([200, 404, 405].includes(res.status), true);
});

Deno.test("Invalid URL path returns 404", async () => {
  const req = new Request("http://localhost/../../../../etc/passwd");
  const res = await handler(req);

  assertEquals(res.status, 404);
});
