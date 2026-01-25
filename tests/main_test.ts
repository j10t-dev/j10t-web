import { test, expect } from "bun:test";
import { handler } from "../src/main";

test("handler returns home page with navigation and recent posts", async () => {
  const req = new Request("http://localhost:8000/");
  const res = await handler(req);
  expect(res.status).toBe(200);
  const text = await res.text();
  expect(text).toContain("about");
  expect(text).toContain("words");
  expect(text).toContain("Recent");
  expect(text).toContain("j10t");
});

test("handler returns measure page with chart container", async () => {
  const req = new Request("http://localhost:8000/measure");
  const res = await handler(req);
  expect(res.status).toBe(200);
  const text = await res.text();
  expect(text).toContain('<div id="vis"');
  expect(text).toContain("vega@5");
});

test("handler returns 404 for unknown route", async () => {
  const req = new Request("http://localhost:8000/unknown");
  const res = await handler(req);
  expect(res.status).toBe(404);
  const text = await res.text();
  expect(text).toBe("Not found");
});

test("GET / handles errors gracefully", async () => {
  try {
    const req = new Request("http://localhost/");
    const res = await handler(req);
    expect(res instanceof Response).toBe(true);
    expect([200, 404, 500].includes(res.status)).toBe(true);
  } catch (error) {
    throw new Error(`Handler should not throw: ${error}`);
  }
});

test("GET /api/charts handles backend down gracefully", async () => {
  const req = new Request("http://localhost/api/charts");
  const res = await handler(req);

  expect(res instanceof Response).toBe(true);
  expect([200, 500].includes(res.status)).toBe(true);
});

test("POST requests are handled without throwing", async () => {
  const req = new Request("http://localhost/", { method: "POST", body: "test" });
  const res = await handler(req);

  expect(res instanceof Response).toBe(true);
  expect([200, 404, 405].includes(res.status)).toBe(true);
});

test("Invalid URL path returns 404", async () => {
  const req = new Request("http://localhost/../../../../etc/passwd");
  const res = await handler(req);

  expect(res.status).toBe(404);
});
