import { assertEquals, assertStringIncludes } from "@std/assert";
import { PageRenderHandler } from "./index.ts";
import { Eta } from "@eta-dev/eta";

const testEta = new Eta({
  views: "./views",
  cache: false
});

Deno.test("PageRenderHandler - Constructor", () => {
  const handler = new PageRenderHandler(testEta);
  assertEquals(typeof handler, "object");
});

Deno.test("PageRenderHandler - handle renders template with data", async () => {
  const handler = new PageRenderHandler(testEta);

  const response = await handler.handle("index", { posts: [{ title: "Test Post", date: "2024-01-01", slug: "test" }] });

  assertEquals(response instanceof Response, true);
  assertEquals(response.headers.get("content-type"), "text/html");

  const html = await response.text();
  assertStringIncludes(html, "Test Post");
});

Deno.test("PageRenderHandler - handle returns Response object", async () => {
  const handler = new PageRenderHandler(testEta);

  const response = await handler.handle("measure");

  assertEquals(response instanceof Response, true);
  assertEquals(response.headers.get("content-type"), "text/html");

  const html = await response.text();
  assertStringIncludes(html, "<!DOCTYPE html>");
});

Deno.test("PageRenderHandler - handle different template names", async () => {
  const handler = new PageRenderHandler(testEta);

  const templates = [
    { name: "measure", expectedContent: "MEASUREMENTS" },
    { name: "weight", expectedContent: "WEIGHT" }
  ];

  for (const template of templates) {
    const response = await handler.handle(template.name);
    assertEquals(response instanceof Response, true);
    assertEquals(response.headers.get("content-type"), "text/html");

    const html = await response.text();
    assertStringIncludes(html, template.expectedContent);
  }
});

Deno.test("PageRenderHandler - handle works with empty data", async () => {
  const handler = new PageRenderHandler(testEta);

  const response = await handler.handle("measure");
  assertEquals(response instanceof Response, true);
  assertEquals(response.headers.get("content-type"), "text/html");

  const html = await response.text();
  assertStringIncludes(html, "<!DOCTYPE html>");
  assertStringIncludes(html, "MEASUREMENTS");
});