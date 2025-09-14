import { handler } from "./main.ts";
import { assertEquals, assertStringIncludes } from "jsr:@std/assert";

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
