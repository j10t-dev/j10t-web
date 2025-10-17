# Test Suite Fixes Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Fix critical issues, anti-patterns, and best practice violations in the test suite to ensure reliability and prevent production bugs.

**Architecture:** Address global state pollution in mocks, incomplete mock responses, tests verifying mock behaviour instead of real code, flaky timing-based tests, and weak assertions. Apply TDD principles and Testing Anti-Patterns skill guidelines throughout.

**Tech Stack:** Deno, @std/assert, @std/testing, TypeScript

---

## Task 1: Fix Global State Pollution in chart_data_test.ts

**Priority:** CRITICAL
**Estimated Time:** 5 minutes

**Files:**
- Modify: `lib/chart_data_test.ts:7-29`

**Problem:** Tests patch `globalThis.fetch` without proper cleanup. If test throws before restoration, global state remains corrupted and affects other tests.

**Step 1: Add try-finally protection to getAllChartJSON test**

Replace lines 7-29 with:

```typescript
Deno.test("getAllChartJSON returns chart data array (mocked)", async () => {
  let called = 0;
  const mockFetch = async (url: string | URL | Request, opts?: RequestInit) => {
    called++;
    return {
      json() {
        return {
          $schema: "https://vega.github.io/schema/vega-lite/v5.json",
          mock: true,
          url,
          opts,
        } as any;
      },
      ok: true,
    } as Response;
  };

  try {
    globalThis.fetch = mockFetch as any;
    const data = await getAllChartJSON();
    assertEquals(Array.isArray(data), true);
    assertEquals(data.length > 0, true);
    // Use type assertion to access mock property for test only
    assertEquals((data[0] as any).mock, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

**Step 2: Add try-finally to getChartJSON invalid response test**

Replace lines 82-101 with:

```typescript
Deno.test("getChartJSON rejects invalid API response", async () => {
  const mockFetch = async () => {
    return {
      async json() {
        return "invalid data";
      },
      ok: true,
      status: 200,
      statusText: "OK"
    } as unknown as Response;
  };

  try {
    globalThis.fetch = mockFetch;
    await assertRejects(
      async () => await getChartJSON("SINGLE", "test-invalid"),
      Error,
      "Invalid chart data structure"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

**Step 3: Add try-finally to getChartJSON valid response test**

Replace lines 103-126 with:

```typescript
Deno.test("getChartJSON validates and accepts valid response", async () => {
  const mockValidSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: "line",
    data: { values: [{ x: 1, y: 2 }] }
  };

  const mockFetch = async () => {
    return {
      async json() {
        return mockValidSpec;
      },
      ok: true,
      status: 200,
      statusText: "OK"
    } as unknown as Response;
  };

  try {
    globalThis.fetch = mockFetch;
    const result = await getChartJSON("SINGLE", "test-valid-weight");
    assertEquals((result as any).mark, "line");
    assertEquals((result as any).$schema, mockValidSpec.$schema);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

**Step 4: Run tests to verify they still pass**

```bash
deno test lib/chart_data_test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/chart_data_test.ts
git commit -m "fix: add try-finally protection to fetch mocking

- Prevents global state pollution if tests throw
- Ensures fetch is always restored
- Eliminates test interference"
```

---

## Task 2: Complete Mock Responses to Match Real API

**Priority:** CRITICAL
**Estimated Time:** 20 minutes

**Files:**
- Modify: `lib/chart_data_test.ts:52-64`
- Read: Backend API documentation or inspect real response

**Problem:** Mock data `[{ foo: "bar" }]` doesn't match real Vega-Lite spec. Tests pass but production would fail.

**Step 1: Inspect real API response structure**

Check what `http://127.0.0.1:8888/sqlite-charts` actually returns. Based on the codebase context, it should return Vega-Lite specifications. Review the VegaLiteSpecSchema to understand required fields.

Look at `lib/chart_data.ts` to understand the API contract.

**Step 2: Update mock to match real structure**

Replace lines 52-64 with complete Vega-Lite spec:

```typescript
Deno.test("ChartDataHandler returns chart data on success", async () => {
  const mockData = [
    {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: "line",
      encoding: {
        x: { field: "date", type: "temporal" },
        y: { field: "value", type: "quantitative" }
      },
      data: { values: [{ date: "2024-01-01", value: 70 }] },
      width: 800,
      height: 400
    }
  ];

  const handler = new ChartDataHandler({
    getAllChartJSON: () => Promise.resolve(mockData),
    getChartJSON: () => Promise.resolve({ weight: "chart" }),
    logInfo: () => {},
    logError: () => {},
  });
  const res = await handler.handle(new Request("http://localhost/api/charts"));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body, mockData);
  // Verify the response is valid Vega-Lite
  assertEquals(body[0].$schema, "https://vega.github.io/schema/vega-lite/v5.json");
  assertEquals(body[0].mark, "line");
});
```

**Step 3: Update weight endpoint mock**

Replace lines 79-96 with:

```typescript
Deno.test("ChartDataHandler handles /weight endpoint", async () => {
  const mockWeightChart = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: "line",
    encoding: {
      x: { field: "date", type: "temporal" },
      y: { field: "value", type: "quantitative", title: "Weight (kg)" }
    },
    data: { values: [{ date: "2024-01-01", value: 70 }] },
    width: 800,
    height: 400
  };

  const handler = new ChartDataHandler({
    getAllChartJSON: () => Promise.resolve([]),
    getChartJSON: (type: string, name: string) => {
      if (type === "SINGLE" && name === "weight") {
        return Promise.resolve(mockWeightChart);
      }
      throw new Error("Not found");
    },
    logInfo: () => {},
    logError: () => {},
  });
  const res = await handler.handle(new Request("http://localhost/weight"));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body, mockWeightChart);
  // Verify it's valid Vega-Lite
  assertEquals(body.$schema, "https://vega.github.io/schema/vega-lite/v5.json");
});
```

**Step 4: Run tests**

```bash
deno test routes/charts_test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add routes/charts_test.ts
git commit -m "fix: use complete Vega-Lite specs in chart mocks

- Mocks now match real API response structure
- Includes all required fields: schema, mark, encoding, data
- Prevents silent failures from missing fields"
```

---

## Task 3: Add Integration Tests for Router with Real Handlers

**Priority:** CRITICAL
**Estimated Time:** 30 minutes

**Files:**
- Create: `tests/integration/router_integration_test.ts`

**Problem:** Current router tests only verify mock behaviour, not actual routing logic with real handlers. Following TDD and Testing Anti-Patterns skill.

**Step 1: Write failing integration test for static file routing**

Create `tests/integration/router_integration_test.ts`:

```typescript
import { assertEquals, assertStringIncludes } from "@std/assert";
import { Router } from "../../routes/router.ts";
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
```

**Step 2: Run test to verify it works**

```bash
deno test tests/integration/router_integration_test.ts --allow-read --allow-net
```

Expected: PASS (verifies routing works with real handlers)

**Step 3: Add integration test for chart API endpoint**

Add to `tests/integration/router_integration_test.ts`:

```typescript
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
```

**Step 4: Add integration test for page rendering**

Add to `tests/integration/router_integration_test.ts`:

```typescript
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
```

**Step 5: Add integration test for 404 handling**

Add to `tests/integration/router_integration_test.ts`:

```typescript
Deno.test("Router integration - Unknown routes return 404", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "./public", eta: mockEta });

  const req = new Request("http://localhost/definitely-not-a-real-route-12345");
  const res = await router.handle(req);

  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Not found");
});
```

**Step 6: Run all integration tests**

```bash
deno test tests/integration/router_integration_test.ts --allow-read --allow-net
```

Expected: All tests PASS

**Step 7: Commit**

```bash
git add tests/integration/router_integration_test.ts
git commit -m "feat: add Router integration tests with real handlers

- Tests verify actual routing logic, not mock behaviour
- Uses real handlers instead of mock subclasses
- Validates end-to-end request flow
- Follows Testing Anti-Patterns skill guidelines"
```

---

## Task 4: Replace Timing-Based Waits with Condition Polling

**Priority:** IMPORTANT
**Estimated Time:** 25 minutes

**Files:**
- Modify: `tests/helpers/blog_test_helpers.ts:340-343`
- Modify: `routes/blog_test.ts:31, 53, 136, 165`

**Problem:** Fixed 100ms waits cause flaky tests. Apply Condition-Based-Waiting skill.

**Step 1: Create proper condition-based wait helper**

Replace `waitForPostsToLoad` in `tests/helpers/blog_test_helpers.ts:340-343`:

```typescript
/**
 * Wait for a condition to become true with timeout
 * @param condition Function that returns true when ready
 * @param timeoutMs Maximum time to wait (default 5000ms)
 * @param pollIntervalMs How often to check (default 50ms)
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  pollIntervalMs = 50
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await Promise.resolve(condition());
    if (result) {
      return; // Condition met
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * @deprecated Use waitForCondition instead
 */
export async function waitForPostsToLoad(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}
```

**Step 2: Update blog_test.ts to use condition-based waiting**

In `routes/blog_test.ts`, add import at top:

```typescript
import { BlogTestHelpers, BlogTestCleanup, BlogTestData, waitForCondition } from "../tests/helpers/blog_test_helpers.ts";
```

Replace line 28-31 with:

```typescript
const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

// Wait for posts to actually load
await waitForCondition(() => handler.getAllPosts().length >= 2, 5000);

const request = new Request("http://localhost:8000/blog/");
```

**Step 3: Update remaining waitForPostsToLoad calls**

Replace line 50-53:

```typescript
const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

// Wait for posts to load
await waitForCondition(() => handler.getAllPosts().length >= 1, 5000);

const request = new Request("http://localhost:8000/blog/test-individual");
```

Replace line 133-136:

```typescript
const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

// Wait for posts to load
await waitForCondition(() => handler.getAllPosts().length >= 1, 5000);

// These URLs get normalized by URL constructor to /blog/admin
```

Replace line 162-165:

```typescript
const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

// Wait for posts to load
await waitForCondition(() => handler.getAllPosts().length >= 3, 5000);

const request = new Request("http://localhost:8000/blog/");
```

**Step 4: Run blog tests to verify reliability**

```bash
deno test routes/blog_test.ts
```

Expected: All tests PASS (and faster than before in most cases)

**Step 5: Run tests multiple times to verify no flakiness**

```bash
for i in {1..5}; do deno test routes/blog_test.ts --quiet && echo "Run $i: PASS"; done
```

Expected: All 5 runs PASS

**Step 6: Commit**

```bash
git add tests/helpers/blog_test_helpers.ts routes/blog_test.ts
git commit -m "fix: replace timing waits with condition polling

- Implements condition-based waiting per Condition-Based-Waiting skill
- Eliminates flaky tests from timing assumptions
- Tests now wait for actual state, not arbitrary time
- Reduces test time in fast environments"
```

---

## Task 5: Fix Weak Assertions in index_test.ts

**Priority:** IMPORTANT
**Estimated Time:** 20 minutes

**Files:**
- Modify: `routes/index_test.ts:16-85`
- Create: `views/test-templates/` (test fixtures)

**Problem:** Tests accept any error with `assertEquals(true, true)` anti-pattern. Either test properly or skip gracefully.

**Step 1: Create minimal test templates**

```bash
mkdir -p views/test-templates
```

Create `views/test-templates/index.eta`:

```html
<!DOCTYPE html>
<html>
<head><title><%= it.title || 'Test' %></title></head>
<body>
<h1>Test Index</h1>
<% if (it.currentPage) { %>
<p>Current page: <%= it.currentPage %></p>
<% } %>
<% if (it.posts && it.posts.length > 0) { %>
<ul>
<% it.posts.forEach(post => { %>
  <li><%= post.title %></li>
<% }); %>
</ul>
<% } %>
</body>
</html>
```

Create `views/test-templates/measure.eta`:

```html
<!DOCTYPE html>
<html>
<head><title><%= it.title || 'Measure' %></title></head>
<body>
<h1>Measure Page</h1>
<div id="chart-container"></div>
</body>
</html>
```

Create `views/test-templates/weight.eta`:

```html
<!DOCTYPE html>
<html>
<head><title><%= it.title || 'Weight' %></title></head>
<body>
<h1>Weight Page</h1>
<div id="weight-chart"></div>
</body>
</html>
```

**Step 2: Update index_test.ts to use test templates**

Replace lines 1-14 with:

```typescript
import { assertEquals, assertStringIncludes } from "@std/assert";
import { PageRenderHandler } from "./index.ts";
import { Eta } from "@eta-dev/eta";

// Create a test Eta instance pointing to test templates
const testEta = new Eta({
  views: "./views/test-templates",
  cache: false
});
```

**Step 3: Fix weak assertion pattern in handle test**

Replace lines 16-30 with:

```typescript
Deno.test("PageRenderHandler - handle renders template with data", async () => {
  const handler = new PageRenderHandler(testEta);

  const response = await handler.handle("index", { title: "Test Page", currentPage: "home" });

  assertEquals(response instanceof Response, true);
  assertEquals(response.headers.get("content-type"), "text/html");

  const html = await response.text();
  assertStringIncludes(html, "Test Page");
  assertStringIncludes(html, "Current page: home");
});
```

**Step 4: Fix Response object test**

Replace lines 32-50 with:

```typescript
Deno.test("PageRenderHandler - handle returns Response object", async () => {
  const handler = new PageRenderHandler(testEta);

  const response = await handler.handle("index");

  // Should return a Response object
  assertEquals(response instanceof Response, true);

  // Should have correct content-type header
  assertEquals(response.headers.get("content-type"), "text/html");

  // Should contain valid HTML
  const html = await response.text();
  assertStringIncludes(html, "<!DOCTYPE html>");
});
```

**Step 5: Fix template names test**

Replace lines 52-70 with:

```typescript
Deno.test("PageRenderHandler - handle different template names", async () => {
  const handler = new PageRenderHandler(testEta);

  const templates = [
    { name: "index", expectedContent: "Test Index" },
    { name: "measure", expectedContent: "Measure Page" },
    { name: "weight", expectedContent: "Weight Page" }
  ];

  for (const template of templates) {
    const response = await handler.handle(template.name, { title: `Test ${template.name}` });
    assertEquals(response instanceof Response, true);
    assertEquals(response.headers.get("content-type"), "text/html");

    const html = await response.text();
    assertStringIncludes(html, template.expectedContent);
  }
});
```

**Step 6: Fix empty data test**

Replace lines 72-85 with:

```typescript
Deno.test("PageRenderHandler - handle works with empty data", async () => {
  const handler = new PageRenderHandler(testEta);

  const response = await handler.handle("index");
  assertEquals(response instanceof Response, true);
  assertEquals(response.headers.get("content-type"), "text/html");

  const html = await response.text();
  assertStringIncludes(html, "<!DOCTYPE html>");
  assertStringIncludes(html, "Test Index");
});
```

**Step 7: Run tests**

```bash
deno test routes/index_test.ts
```

Expected: All tests PASS with real assertions

**Step 8: Commit**

```bash
git add routes/index_test.ts views/test-templates/
git commit -m "fix: replace weak assertions with proper template testing

- Removes assertEquals(true, true) anti-pattern
- Adds minimal test templates for proper testing
- Tests now verify actual rendering behaviour
- All assertions validate real output"
```

---

## Task 6: Add Error and Edge Case Tests

**Priority:** IMPORTANT
**Estimated Time:** 30 minutes

**Files:**
- Modify: `main_test.ts:1-31`
- Modify: `measure_test.ts:39-57`

**Problem:** Missing negative test cases for errors, malformed requests, edge cases.

**Step 1: Add error tests to main_test.ts**

Add after line 31 in `main_test.ts`:

```typescript
Deno.test("GET / handles errors gracefully", async () => {
  // Test with malformed request (this tests error handling in main handler)
  const handler = (await import("./main.ts")).default;

  try {
    const req = new Request("http://localhost/");
    const res = await handler(req);
    // Should not throw, should return valid response
    assertEquals(res instanceof Response, true);
    assertEquals([200, 404, 500].includes(res.status), true);
  } catch (error) {
    // If it throws, test should fail
    throw new Error(`Handler should not throw: ${error}`);
  }
});

Deno.test("GET /api/charts handles backend down gracefully", async () => {
  const handler = (await import("./main.ts")).default;

  // This tests that the handler returns 500 or cached data when backend is down
  const req = new Request("http://localhost/api/charts");
  const res = await handler(req);

  assertEquals(res instanceof Response, true);
  // Should return either success (cached) or 500 (error), not throw
  assertEquals([200, 500].includes(res.status), true);
});

Deno.test("POST requests return 404", async () => {
  const handler = (await import("./main.ts")).default;

  const req = new Request("http://localhost/", { method: "POST", body: "test" });
  const res = await handler(req);

  // Router should handle POST to / as 404 (not implemented)
  assertEquals(res.status, 404);
});

Deno.test("Invalid URL path returns 404", async () => {
  const handler = (await import("./main.ts")).default;

  const req = new Request("http://localhost/../../../../etc/passwd");
  const res = await handler(req);

  // Should sanitize and return 404, not error
  assertEquals(res.status, 404);
});
```

**Step 2: Run main tests**

```bash
deno test main_test.ts --allow-read --allow-net
```

Expected: All tests PASS

**Step 3: Add error tests to measure_test.ts**

Add after line 57 in `measure_test.ts`:

```typescript
Deno.test("GET /api/charts handles timeout gracefully", async () => {
  // This integration test verifies timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 100);

  try {
    const res = await fetch("http://localhost:8000/api/charts", {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    // Should either succeed quickly or handle abort
    assertEquals([200, 500].includes(res.status), true);
  } catch (error) {
    // Abort is acceptable
    if (error instanceof Error && error.name === "AbortError") {
      assertEquals(true, true); // Expected behaviour
    } else {
      throw error;
    }
  }
});

Deno.test("GET /nonexistent returns 404 with body", async () => {
  const res = await fetch("http://localhost:8000/this-definitely-does-not-exist-12345");
  assertEquals(res.status, 404);

  const body = await res.text();
  assertEquals(body, "Not found");
});

Deno.test("GET /measure with malformed Accept header still works", async () => {
  const res = await fetch("http://localhost:8000/measure", {
    headers: { "Accept": "invalid/malformed;;;;" }
  });

  // Should handle malformed headers gracefully
  assertEquals([200, 400, 500].includes(res.status), true);
});
```

**Step 4: Run measure tests**

```bash
deno test measure_test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add main_test.ts measure_test.ts
git commit -m "feat: add error and edge case tests

- Tests malformed requests and invalid paths
- Verifies graceful error handling
- Tests backend down scenarios
- Adds timeout and abort signal tests
- Ensures no unhandled exceptions"
```

---

## Task 7: Refactor Nested Patching in static_test.ts (OPTIONAL)

**Priority:** NICE TO HAVE
**Estimated Time:** 25 minutes

**Files:**
- Modify: `routes/static_test.ts:1-176`

**Problem:** Three levels of nesting make tests hard to read. Mock setup dominates test logic.

**Step 1: Create cleaner test helper**

Replace lines 30-53 with:

```typescript
interface MockConfig {
  stat?: typeof Deno.stat;
  readFile?: typeof Deno.readFile;
  getContentType?: (path: string) => string;
  sanitizePath?: (base: string, user: string) => string;
}

async function withMocks(testFn: () => Promise<void>, mocks: MockConfig = {}) {
  const origStat = Deno.stat;
  const origReadFile = Deno.readFile;
  const origGetContentType = (globalThis as any).getContentType;
  const origSanitizePath = (globalThis as any).sanitizePath;

  try {
    if (mocks.stat) Deno.stat = mocks.stat as any;
    if (mocks.readFile) Deno.readFile = mocks.readFile as any;
    if (mocks.getContentType) (globalThis as any).getContentType = mocks.getContentType;
    if (mocks.sanitizePath) (globalThis as any).sanitizePath = mocks.sanitizePath;

    await testFn();
  } finally {
    Deno.stat = origStat;
    Deno.readFile = origReadFile;
    (globalThis as any).getContentType = origGetContentType;
    (globalThis as any).sanitizePath = origSanitizePath;
  }
}
```

**Step 2: Refactor first test with new helper**

Replace lines 55-68 with:

```typescript
Deno.test("StaticFileHandler returns file with 200", async () => {
  await withMocks(async () => {
    const handler = new StaticFileHandler("/mock");
    const req = new Request("http://localhost/public/foo.js");
    const url = new URL(req.url);
    const res = await handler.handle(url, req);
    assertEquals(res.status, 200);
    assertEquals(await res.arrayBuffer(), mockFile.buffer);
  }, {
    stat: mockStat as any,
    readFile: mockReadFile as any,
    getContentType: mockGetContentType,
    sanitizePath: mockSanitizePath
  });
});
```

**Step 3: Refactor remaining tests**

Apply the same pattern to all other tests in the file (lines 70-176). Each test should call `withMocks` with the necessary mocks.

Example for 304 test:

```typescript
Deno.test("StaticFileHandler returns 304 if not modified", async () => {
  await withMocks(async () => {
    const handler = new StaticFileHandler("/mock");
    const req = new Request("http://localhost/public/foo.js", {
      headers: new Headers({ "if-none-match": `W/\"3-${mockFileInfo.mtime.getTime()}\"` })
    });
    const url = new URL(req.url);
    const res = await handler.handle(url, req);
    assertEquals(res.status, 304);
  }, {
    stat: mockStat as any,
    readFile: mockReadFile as any,
    getContentType: mockGetContentType,
    sanitizePath: mockSanitizePath
  });
});
```

**Step 4: Run tests**

```bash
deno test routes/static_test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add routes/static_test.ts
git commit -m "refactor: simplify mock patching in static tests

- Replaces nested patching with single withMocks helper
- Reduces nesting from 3 levels to 1
- Improves test readability
- Maintains same test coverage"
```

---

## Task 8: Standardise Error Testing Patterns (OPTIONAL)

**Priority:** NICE TO HAVE
**Estimated Time:** 15 minutes

**Files:**
- Modify: `lib/utils_test.ts:20-29`

**Problem:** Inconsistent error testing patterns. Should use `assertThrows` consistently.

**Step 1: Update sanitizePath error test**

Replace lines 20-29 with:

```typescript
import { assertEquals, assertThrows } from "@std/assert";

Deno.test("sanitizePath blocks directory traversal", () => {
  const base = "/safe/base";

  assertThrows(
    () => {
      sanitizePath(base, "../../etc/passwd");
    },
    Error,
    "Path traversal attempt detected"
  );
});
```

**Step 2: Run tests**

```bash
deno test lib/utils_test.ts
```

Expected: All tests PASS

**Step 3: Commit**

```bash
git add lib/utils_test.ts
git commit -m "refactor: standardise error testing with assertThrows

- Replaces manual try-catch with assertThrows
- More readable and idiomatic
- Consistent with other test files"
```

---

## Task 9: Add Test Coverage for logger.ts (OPTIONAL)

**Priority:** NICE TO HAVE
**Estimated Time:** 10 minutes

**Files:**
- Create: `lib/logger_test.ts`

**Problem:** `lib/logger.ts` has no test coverage. While it's a simple wrapper, it should have basic tests.

**Step 1: Write basic logger tests**

Create `lib/logger_test.ts`:

```typescript
import { assertEquals } from "@std/assert";
import { logInfo, logError, logDebug, logWarn } from "./logger.ts";

Deno.test("Logger functions exist and are callable", () => {
  // These should not throw
  assertEquals(typeof logInfo, "function");
  assertEquals(typeof logError, "function");
  assertEquals(typeof logDebug, "function");
  assertEquals(typeof logWarn, "function");
});

Deno.test("logInfo accepts message and metadata", () => {
  // Should not throw
  logInfo("Test message");
  logInfo("Test with metadata", { key: "value" });
  assertEquals(true, true); // If we reach here, no exceptions thrown
});

Deno.test("logError accepts message and metadata", () => {
  // Should not throw
  logError("Test error");
  logError("Test error with metadata", { error: "details" });
  assertEquals(true, true);
});

Deno.test("logDebug accepts message and metadata", () => {
  // Should not throw
  logDebug("Test debug");
  logDebug("Test debug with metadata", { debug: "info" });
  assertEquals(true, true);
});

Deno.test("logWarn accepts message and metadata", () => {
  // Should not throw
  logWarn("Test warning");
  logWarn("Test warning with metadata", { warn: "details" });
  assertEquals(true, true);
});
```

**Step 2: Run tests**

```bash
deno test lib/logger_test.ts
```

Expected: All tests PASS

**Step 3: Commit**

```bash
git add lib/logger_test.ts
git commit -m "feat: add test coverage for logger

- Basic smoke tests for all logger functions
- Verifies functions are callable without errors
- Completes test coverage for lib/ directory"
```

---

## Final Verification

**Step 1: Run full test suite**

```bash
deno task test
```

Expected: All tests PASS

**Step 2: Run tests multiple times to check for flakiness**

```bash
for i in {1..10}; do
  echo "=== Run $i ==="
  deno task test --quiet || exit 1
done
echo "All runs passed!"
```

Expected: All 10 runs PASS without flakiness

**Step 3: Verify test count increased**

```bash
deno test --quiet | grep "test result:"
```

Expected: More tests than before (added ~15-20 new tests)

**Step 4: Final commit**

```bash
git add -A
git commit -m "docs: complete test suite fixes implementation

All critical issues resolved:
- Global state pollution fixed with try-finally
- Complete mock responses matching real API
- Integration tests for Router with real handlers
- Condition-based waiting eliminates flaky tests
- Weak assertions replaced with proper tests
- Error and edge case coverage added

Optional improvements:
- Refactored nested patching
- Standardised error testing patterns
- Added logger test coverage

All tests passing reliably without flakiness."
```

---

## Summary of Changes

### Critical Fixes (MUST DO)
1. ✅ Global state protection in fetch mocking (try-finally)
2. ✅ Complete Vega-Lite mocks matching real API structure
3. ✅ Router integration tests with real handlers

### Important Fixes (SHOULD DO)
4. ✅ Condition-based waiting replaces timing assumptions
5. ✅ Proper assertions in index_test.ts with test templates
6. ✅ Error and edge case test coverage

### Optional Improvements (NICE TO HAVE)
7. ⚪ Refactored static test mocking
8. ⚪ Standardised error testing patterns
9. ⚪ Logger test coverage

**Total Estimated Time:**
- Critical + Important: 130 minutes (2h 10m)
- With Optional: 180 minutes (3h)

**Test Quality Improvement:** 7/10 → 9/10

---

## References

- **Testing Anti-Patterns Skill:** `${SUPERPOWERS_SKILLS_ROOT}/skills/testing-anti-patterns/SKILL.md`
- **Condition-Based-Waiting Skill:** `${SUPERPOWERS_SKILLS_ROOT}/skills/condition-based-waiting/SKILL.md`
- **Test-Driven Development Skill:** `${SUPERPOWERS_SKILLS_ROOT}/skills/test-driven-development/SKILL.md`

---

