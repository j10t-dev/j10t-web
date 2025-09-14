import { assertEquals, assertStringIncludes } from "jsr:@std/assert";

let serverProcess: Deno.ChildProcess | undefined;

Deno.test({
  name: "setup server",
  fn: async () => {
    const command = new Deno.Command("deno", {
      args: ["run", "--allow-net", "--allow-read", "main.ts"],
      stdout: "null",
      stderr: "null",
    });
    serverProcess = command.spawn();
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
    if (!ready) throw new Error("Server did not start in time");
  },
  sanitizeResources: false,
  sanitizeOps: false,
  only: false,
});

Deno.test("GET /measure returns page with chart container and Vega scripts", async () => {
  const res = await fetch("http://localhost:8000/measure");
  const body = await res.text();
  assertEquals(res.status, 200);
  assertStringIncludes(body, '<div id="vis"');
  assertStringIncludes(body, "vega@5");
  assertStringIncludes(body, "vega-lite@5");
  assertStringIncludes(body, "vega-embed@6");
});

Deno.test("GET /api/charts returns JSON array", async () => {
  const res = await fetch("http://localhost:8000/api/charts");
  assertEquals(res.status, 200);
  const data = await res.json();
  // Should be an array (empty or not)
  if (!Array.isArray(data)) {
    throw new Error("/api/charts did not return an array");
  }
});

Deno.test({
  name: "teardown server",
  fn: async () => {
    if (serverProcess) {
      try {
        serverProcess.kill("SIGTERM");
        await serverProcess.status;
      } catch (_error) {
        // Process may already be terminated
      }
      serverProcess = undefined;
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
  only: false,
});
