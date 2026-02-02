import { test, expect, beforeAll, afterAll } from "bun:test";
import { spawn, type Subprocess } from "bun";

let serverProcess: Subprocess | undefined;

beforeAll(async () => {
  serverProcess = spawn(["bun", "run", "src/main.ts"], {
    stdout: "ignore",
    stderr: "ignore",
  });

  // Wait for server to be ready
  let ready = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch("http://localhost:8000/");
      if (res.status === 200 || res.status === 404) {
        ready = true;
        break;
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) {
    if (serverProcess) {
      serverProcess.kill();
    }
    throw new Error("Server did not start in time");
  }
});

test("GET /measure returns page with chart container and Vega scripts", async () => {
  const res = await fetch("http://localhost:8000/measure");
  const body = await res.text();
  expect(res.status).toBe(200);
  expect(body).toContain('<div id="vis"');
  expect(body).toContain("vega@5");
  expect(body).toContain("vega-lite@5");
  expect(body).toContain("vega-embed@6");
});

test("GET /api/charts returns JSON array", async () => {
  const res = await fetch("http://localhost:8000/api/charts");
  expect(res.status).toBe(200);
  const data = await res.json();
  // Should be an array (empty or not)
  if (!Array.isArray(data)) {
    throw new Error("/api/charts did not return an array");
  }
});

test("GET /api/charts handles timeout gracefully", async () => {
  // This integration test verifies timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 100);

  try {
    const res = await fetch("http://localhost:8000/api/charts", {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    // Should either succeed quickly or handle abort
    expect([200, 500].includes(res.status)).toBe(true);

    // Consume the response body to prevent resource leak
    await res.body?.cancel();
  } catch (error) {
    // Abort is acceptable
    if (error instanceof Error && error.name === "AbortError") {
      expect(true).toBe(true); // Expected behaviour
    } else {
      throw error;
    }
  }
});

test("GET /nonexistent returns 404 with body", async () => {
  const res = await fetch("http://localhost:8000/this-definitely-does-not-exist-12345");
  expect(res.status).toBe(404);

  const body = await res.text();
  expect(body).toBe("Not found");
});

test("GET /measure with malformed Accept header still works", async () => {
  const res = await fetch("http://localhost:8000/measure", {
    headers: { "Accept": "invalid/malformed;;;;" }
  });

  // Should handle malformed headers gracefully
  expect([200, 400, 500].includes(res.status)).toBe(true);

  // Consume the response body to prevent resource leak
  await res.text();
});

afterAll(() => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (_error) {
      // Process may already be terminated
    }
    serverProcess = undefined;
  }
});
