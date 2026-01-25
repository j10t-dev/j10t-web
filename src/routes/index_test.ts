import { test, expect } from "bun:test";
import { PageRenderHandler } from "./index";
import { Eta } from "eta";

const testEta = new Eta({
  views: "./views",
  cache: false
});

test("PageRenderHandler - Constructor", () => {
  const handler = new PageRenderHandler(testEta);
  expect(typeof handler).toBe("object");
});

test("PageRenderHandler - handle renders template with data", async () => {
  const handler = new PageRenderHandler(testEta);

  const response = await handler.handle("index", { posts: [{ title: "Test Post", date: "2024-01-01", slug: "test" }] });

  expect(response instanceof Response).toBe(true);
  expect(response.headers.get("content-type")).toBe("text/html");

  const html = await response.text();
  expect(html).toContain("Test Post");
});

test("PageRenderHandler - handle returns Response object", async () => {
  const handler = new PageRenderHandler(testEta);

  const response = await handler.handle("measure");

  expect(response instanceof Response).toBe(true);
  expect(response.headers.get("content-type")).toBe("text/html");

  const html = await response.text();
  expect(html).toContain("<!DOCTYPE html>");
});

test("PageRenderHandler - handle different template names", async () => {
  const handler = new PageRenderHandler(testEta);

  const templates = [
    { name: "measure", expectedContent: "MEASUREMENTS" },
    { name: "weight", expectedContent: "WEIGHT" }
  ];

  for (const template of templates) {
    const response = await handler.handle(template.name);
    expect(response instanceof Response).toBe(true);
    expect(response.headers.get("content-type")).toBe("text/html");

    const html = await response.text();
    expect(html).toContain(template.expectedContent);
  }
});

test("PageRenderHandler - handle works with empty data", async () => {
  const handler = new PageRenderHandler(testEta);

  const response = await handler.handle("measure");
  expect(response instanceof Response).toBe(true);
  expect(response.headers.get("content-type")).toBe("text/html");

  const html = await response.text();
  expect(html).toContain("<!DOCTYPE html>");
  expect(html).toContain("MEASUREMENTS");
});
