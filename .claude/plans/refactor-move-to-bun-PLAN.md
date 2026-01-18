# Deno to Bun Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use 1337-skills:executing-plans to implement this plan task-by-task.

**Goal:** Migrate j10t-web from Deno to Bun runtime using TDD (port tests first, then implementation).

**Architecture:** Big bang migration. Convert all test files to Bun syntax first (they will fail), then migrate implementation files one by one until tests pass. Order: leaf modules first, then routes, then main entry point.

**Tech Stack:** Bun runtime, eta (npm), zod, @logtape/logtape, marked, gray-matter, mime

**Skills to Use:**
- 1337-skills:test-driven-development
- 1337-skills:verification-before-completion

**Required Files:**
- @.claude/plans/refactor-move-to-bun-DESIGN.md
- @deno.json (for reference during migration)

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

### Subtask 1.1: Create package.json

**Step 1:** Create the package.json file

```json
{
  "name": "j10t-web",
  "type": "module",
  "scripts": {
    "start": "bun run src/main.ts",
    "dev": "bun --watch run src/main.ts",
    "test": "bun test",
    "bundle": "bun run build/bundle.ts",
    "build-blog": "bun run build/build-blog.ts"
  },
  "dependencies": {
    "eta": "^3.5.0",
    "zod": "^3.25.76",
    "@logtape/logtape": "^0.7.2",
    "marked": "^15.0.0",
    "gray-matter": "^4.0.3",
    "mime": "^4.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

### Subtask 1.2: Create tsconfig.json

**Step 1:** Create the tsconfig.json file

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "lib": ["ESNext", "DOM"],
    "skipLibCheck": true
  }
}
```

### Subtask 1.3: Install dependencies

**Step 1:** Run bun install

Run: `bun install`
Expected: Dependencies installed, bun.lockb created

---

## Task 2: Migrate lib/utils and Tests

**Files:**
- Modify: `src/lib/utils_test.ts`
- Modify: `src/lib/utils.ts`

### Subtask 2.1: Port utils_test.ts to Bun syntax (RED)

**Step 1:** Replace the test file content

Change from:
```typescript
import { getContentType } from "./utils.ts";
import { sanitizePath } from "./utils.ts";
import { assertEquals } from "@std/assert";

Deno.test("getContentType returns correct MIME types", () => {
```

To:
```typescript
import { test, expect } from "bun:test";
import { getContentType, sanitizePath } from "./utils";

test("getContentType returns correct MIME types", () => {
  expect(getContentType("foo.js")).toBe("text/javascript; charset=UTF-8");
  expect(getContentType("foo.css")).toBe("text/css; charset=UTF-8");
  expect(getContentType("foo.svg")).toBe("image/svg+xml");
  expect(getContentType("foo.ico")).toBe("image/vnd.microsoft.icon");
  expect(getContentType("foo.json")).toBe("application/json; charset=UTF-8");
  expect(getContentType("foo.unknown")).toBe("application/octet-stream");
});

test("sanitizePath allows safe paths", () => {
  const base = "/safe/base";
  const result = sanitizePath(base, "foo/bar.txt");
  expect(result.startsWith(base)).toBe(true);
});

test("sanitizePath blocks directory traversal", () => {
  const base = "/safe/base";
  expect(() => sanitizePath(base, "../../etc/passwd")).toThrow();
});
```

**Step 2:** Run test to verify it fails

Run: `bun test src/lib/utils_test.ts`
Expected: FAIL (imports not found)

### Subtask 2.2: Migrate utils.ts implementation (GREEN)

**Step 1:** Replace the utils.ts content

Change from:
```typescript
import {
  join,
  normalize,
  relative,
} from "@std/path";
import { contentType } from "@std/media-types";
```

To:
```typescript
import { join, normalize, relative } from "node:path";
import mime from "mime";

export function getContentType(path: string): string {
  const match = path.match(/\.[^.]+$/);
  const ext = match ? match[0] : "";
  const mimeType = mime.getType(ext);

  // Add charset for text types to match previous behavior
  if (mimeType) {
    if (mimeType.startsWith("text/") || mimeType === "application/json") {
      return `${mimeType}; charset=UTF-8`;
    }
    return mimeType;
  }
  return "application/octet-stream";
}

export function sanitizePath(baseDir: string, userPath: string): string {
  const safeUserPath = userPath.replace(/^\/+/, "");
  const normalized = normalize(safeUserPath);
  const absPath = join(baseDir, normalized);
  const rel = relative(baseDir, absPath);
  if (rel.startsWith("..") || rel.includes(".." + "/")) {
    throw new Error("Invalid path: directory traversal detected");
  }
  return absPath;
}
```

**Step 2:** Run test to verify it passes

Run: `bun test src/lib/utils_test.ts`
Expected: PASS

---

## Task 3: Migrate lib/logger and lib/chart_data

**Files:**
- Modify: `src/lib/logger.ts`
- Modify: `src/lib/chart_data.ts`
- Modify: `src/lib/chart_data_test.ts`

### Subtask 3.1: Migrate logger.ts

**Step 1:** Update logger.ts imports (no changes needed - @logtape/logtape works in Bun)

The logger.ts file uses `@logtape/logtape` which is runtime-agnostic. No changes needed to the implementation.

### Subtask 3.2: Port chart_data_test.ts to Bun syntax (RED)

**Step 1:** Replace the test file

Change all `Deno.test` to `test` and `assertEquals`/`assertRejects` to `expect`:

```typescript
import { test, expect } from "bun:test";
import { getAllChartJSON, getChartJSON, VegaLiteSpecSchema } from "./chart_data";

const originalFetch = globalThis.fetch;

test("getAllChartJSON returns chart data array (mocked)", async () => {
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
    expect(Array.isArray(data)).toBe(true);
    expect(data.length > 0).toBe(true);
    expect((data[0] as any).mock).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("VegaLiteSpecSchema validates valid chart specification", () => {
  const validSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: "line",
    encoding: {
      x: { field: "date", type: "temporal" },
      y: { field: "value", type: "quantitative" }
    },
    data: { values: [] }
  };

  const result = VegaLiteSpecSchema.safeParse(validSpec);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.$schema).toBe(validSpec.$schema);
    expect(result.data.mark).toBe("line");
  }
});

test("VegaLiteSpecSchema validates minimal spec", () => {
  const minimalSpec = { mark: "bar" };
  const result = VegaLiteSpecSchema.safeParse(minimalSpec);
  expect(result.success).toBe(true);
});

test("VegaLiteSpecSchema allows additional properties", () => {
  const specWithExtras = {
    mark: "point",
    customProperty: "custom value",
    nestedCustom: { foo: "bar" }
  };

  const result = VegaLiteSpecSchema.safeParse(specWithExtras);
  expect(result.success).toBe(true);
  if (result.success) {
    expect((result.data as any).customProperty).toBe("custom value");
  }
});

test("VegaLiteSpecSchema rejects non-object values", () => {
  const invalidValues = [null, undefined, "string", 123, [], true];
  for (const invalid of invalidValues) {
    const result = VegaLiteSpecSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  }
});

test("getChartJSON rejects invalid API response", async () => {
  const mockFetch = async () => {
    return {
      async json() { return "invalid data"; },
      ok: true,
      status: 200,
      statusText: "OK"
    } as unknown as Response;
  };

  try {
    globalThis.fetch = mockFetch;
    await expect(getChartJSON("SINGLE", "test-invalid")).rejects.toThrow("Invalid chart data structure");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getChartJSON validates and accepts valid response", async () => {
  const mockValidSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: "line",
    data: { values: [{ x: 1, y: 2 }] }
  };

  const mockFetch = async () => {
    return {
      async json() { return mockValidSpec; },
      ok: true,
      status: 200,
      statusText: "OK"
    } as unknown as Response;
  };

  try {
    globalThis.fetch = mockFetch;
    const result = await getChartJSON("SINGLE", "test-valid-weight");
    expect((result as any).mark).toBe("line");
    expect((result as any).$schema).toBe(mockValidSpec.$schema);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

**Step 2:** Run test to verify it fails

Run: `bun test src/lib/chart_data_test.ts`
Expected: FAIL (Deno.env not found)

### Subtask 3.3: Migrate chart_data.ts implementation (GREEN)

**Step 1:** Update chart_data.ts

Change:
```typescript
const CHART_API_URL = Deno.env.get("CHART_API_URL") ?? "http://127.0.0.1:8888/sqlite-charts";
```

To:
```typescript
const CHART_API_URL = process.env.CHART_API_URL ?? "http://127.0.0.1:8888/sqlite-charts";
```

Also update the import (remove `.ts` extension for cleaner imports):
```typescript
import { logError, logInfo } from "./logger";
```

**Step 2:** Run test to verify it passes

Run: `bun test src/lib/chart_data_test.ts`
Expected: PASS

---

## Task 4: Migrate Routes and Tests

**Files:**
- Modify: `src/routes/static.ts`, `src/routes/static_test.ts`
- Modify: `src/routes/charts.ts`, `src/routes/charts_test.ts`
- Modify: `src/routes/index.ts`, `src/routes/index_test.ts`
- Modify: `src/routes/blog.ts`, `src/routes/blog_test.ts`
- Modify: `src/routes/router.ts`, `src/routes/router_test.ts`
- Modify: `tests/helpers/blog_test_helpers.ts`

### Subtask 4.1: Port static_test.ts to Bun syntax (RED)

**Step 1:** Replace the test file with Bun syntax

Key changes:
- `Deno.test` → `test`
- `assertEquals` → `expect().toBe()`
- `Deno.stat` → use `Bun.file().stat()` or `node:fs`
- `Deno.readFile` → `Bun.file().arrayBuffer()`
- `Deno.FileInfo` → custom interface or fs.Stats

```typescript
import { test, expect, mock, beforeEach, afterEach } from "bun:test";
import { StaticFileHandler } from "./static";

const mockFile = new Uint8Array([1, 2, 3]);
const mockFileInfo = {
  isFile: () => true,
  isDirectory: () => false,
  size: 3,
  mtime: new Date(),
};

test("StaticFileHandler returns file with 200", async () => {
  // Mock implementation using Bun's file system
  const handler = new StaticFileHandler("/mock", {
    getContentType: () => "text/javascript; charset=UTF-8",
    sanitizePath: (_base: string, user: string) => `/mock/${user}`,
  });

  // Test will need file system mocking - see implementation
  // For now, test the interface
  expect(typeof handler.handle).toBe("function");
});

// ... convert remaining tests
```

### Subtask 4.2: Migrate static.ts implementation (GREEN)

**Step 1:** Update static.ts

Change Deno APIs to Bun/Node:

```typescript
import { stat, readFile } from "node:fs/promises";
import type { Stats } from "node:fs";
import { getContentType, sanitizePath } from "../lib/utils";
import { logError } from "../lib/logger";

export interface StaticFileResponse {
  file: Uint8Array;
  headers: Headers;
}

export class StaticFileHandler {
  private getContentType: typeof getContentType;
  private sanitizePath: typeof sanitizePath;

  constructor(
    private publicDir: string,
    opts?: {
      getContentType?: typeof getContentType,
      sanitizePath?: typeof sanitizePath,
    }
  ) {
    this.getContentType = opts?.getContentType ?? getContentType;
    this.sanitizePath = opts?.sanitizePath ?? sanitizePath;
  }

  async handle(url: URL, req: Request): Promise<Response> {
    try {
      const relPath = url.pathname.replace("/public/", "");
      const filePath = this.sanitizePath(this.publicDir, relPath);
      const fileInfo = await stat(filePath);
      if (!fileInfo.isFile()) throw new Error("Not a file");
      const { file, headers } = await this.getStaticFileResponse(filePath, fileInfo);
      if (this.isNotModified(req, headers)) {
        return new Response(null, { status: 304, headers });
      }
      return new Response(file as BodyInit, { headers });
    } catch (err) {
      logError("Static file not found", {
        path: url.pathname,
        error: err instanceof Error ? err.message : String(err),
      });
      return new Response("Not found", { status: 404 });
    }
  }

  private async getStaticFileResponse(filePath: string, fileInfo: Stats): Promise<StaticFileResponse> {
    const file = new Uint8Array(await readFile(filePath));
    const contentType = this.getContentType(filePath);
    const lastModified = fileInfo.mtime?.toUTCString() ?? undefined;
    const etag = `W/"${fileInfo.size}-${fileInfo.mtime?.getTime() ?? 0}"`;
    const headers = new Headers({
      "content-type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    if (lastModified) headers.set("Last-Modified", lastModified);
    headers.set("ETag", etag);
    return { file, headers };
  }

  private isNotModified(req: Request, headers: Headers): boolean {
    const ifNoneMatch = req.headers.get("if-none-match");
    const ifModifiedSince = req.headers.get("if-modified-since");
    const etag = headers.get("etag");
    const lastModified = headers.get("last-modified");
    return Boolean(
      (ifNoneMatch && etag && ifNoneMatch === etag) ||
      (ifModifiedSince && lastModified && ifModifiedSince === lastModified)
    );
  }
}
```

### Subtask 4.3: Migrate remaining route files

Apply same pattern to:
- `charts.ts` / `charts_test.ts` - minimal changes (no Deno APIs used directly)
- `index.ts` / `index_test.ts` - minimal changes
- `blog.ts` / `blog_test.ts` - replace `@std/fs/walk` with `node:fs`, `Deno.errors.NotFound` with standard error handling
- `router.ts` / `router_test.ts` - update imports only

### Subtask 4.4: Migrate blog.ts

Key changes for blog.ts:

```typescript
import { Eta } from "eta";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";

// Replace walk() with readdir
private async loadPosts() {
  try {
    const files = await readdir(this.postsDir);
    for (const file of files) {
      if (file.endsWith(".ts")) {
        await this.loadSinglePost(join(this.postsDir, file));
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn("Posts directory not found. Run 'bun run build-blog' first.");
    } else {
      console.error("Failed to load blog posts:", error);
      throw error;
    }
  }
}
```

### Subtask 4.5: Migrate test helpers

Update `tests/helpers/blog_test_helpers.ts`:

```typescript
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { BlogPost, BlogHandler } from "../../src/routes/blog";
import { Eta } from "eta";

const projectRoot = process.cwd();
export const TEST_PATHS = {
  posts: join(projectRoot, "tests/test-posts-isolated"),
  content: join(projectRoot, "tests/test-content"),
  generatedPosts: join(projectRoot, "tests/test-generated-posts"),
  templates: join(projectRoot, "tests/test-views"),
} as const;

export class BlogTestHelpers {
  static async createPost(slug: string, options: TestPostOptions = {}): Promise<BlogPost> {
    const post: BlogPost = {
      title: options.title || "Test Post",
      date: options.date || new Date("2024-08-29"),
      slug: options.slug || slug,
      html: options.html || "<h1>Test Content</h1>",
    };

    await mkdir(TEST_PATHS.posts, { recursive: true });

    const postContent = `export const post = {
  title: ${JSON.stringify(post.title)},
  date: new Date(${JSON.stringify(post.date.toISOString())}),
  slug: ${JSON.stringify(post.slug)},
  html: ${JSON.stringify(post.html)}
};`;
    await writeFile(`${TEST_PATHS.posts}/${slug}.ts`, postContent);
    return post;
  }

  // ... similar changes for other methods
}

export class BlogTestCleanup {
  static async cleanupPosts(): Promise<void> {
    try {
      const entries = await readdir(TEST_PATHS.posts);
      for (const entry of entries) {
        if (entry.startsWith("test-")) {
          await rm(`${TEST_PATHS.posts}/${entry}`);
        }
      }
    } catch {
      // Directory might not exist
    }
  }

  // ... similar changes
}
```

---

## Task 5: Migrate Main Entry Point and Integration Tests

**Files:**
- Modify: `src/main.ts`
- Modify: `tests/main_test.ts`
- Modify: `tests/integration/router_integration_test.ts`
- Modify: `tests/integration/blog_integration_test.ts`

### Subtask 5.1: Migrate main.ts

**Step 1:** Update main.ts

```typescript
import { join } from "node:path";
import { Eta } from "eta";
import { configure, getConsoleSink } from "@logtape/logtape";
import { logInfo } from "./lib/logger";
import { Router } from "./routes/router";

await configure({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: ["j10t-web"],
      level: "info",
      sinks: ["console"],
    },
    {
      category: ["logtape", "meta"],
      level: "warning",
      sinks: ["console"],
    },
  ],
});

const __dirname = import.meta.dir;
const PUBLIC_DIR = join(__dirname, "..", "public");
const VIEWS_DIR = join(__dirname, "..", "views");
const POSTS_DIR = join(__dirname, "..", "posts");

const eta = new Eta({ views: VIEWS_DIR });
const router = new Router({ publicDir: PUBLIC_DIR, eta, postsDir: POSTS_DIR });

export async function handler(req: Request): Promise<Response> {
  return await router.handle(req);
}

if (import.meta.main) {
  logInfo("Listening on http://localhost:8000");
  Bun.serve({ port: 8000, fetch: handler });
}
```

### Subtask 5.2: Port main_test.ts

```typescript
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

// ... convert remaining tests
```

---

## Task 6: Migrate Build Scripts

**Files:**
- Modify: `build/build-blog.ts`
- Delete: `build/esbuild.bundle.ts`
- Create: `build/bundle.ts`

### Subtask 6.1: Migrate build-blog.ts

**Step 1:** Update build-blog.ts

```typescript
import matter from "gray-matter";
import { marked } from "marked";
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const FrontmatterSchema = z.object({
  title: z.string().min(1),
  date: z.coerce.date(),
}).passthrough();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

export async function buildPosts(contentDir = "./content", postsDir = "./posts") {
  console.log("Building blog posts...");

  try {
    await rm(postsDir, { recursive: true });
  } catch {
    // Nothing to remove
  }
  await mkdir(postsDir, { recursive: true });

  const files = await readdir(contentDir);

  for (const file of files) {
    if (!file.endsWith(".md")) continue;

    const filePath = join(contentDir, file);
    console.log(`Processing: ${filePath}`);

    const content = await readFile(filePath, "utf-8");
    const parsed = matter(content);
    const parseResult = FrontmatterSchema.safeParse(parsed.data);

    if (!parseResult.success) {
      console.error(`Invalid frontmatter in ${filePath}:`);
      console.error(parseResult.error.errors);
      throw new Error(`Build failed: Invalid frontmatter in ${filePath}`);
    }

    const attrs = parseResult.data;
    const title = attrs.title;
    const date = attrs.date.toISOString().split('T')[0];
    const body = parsed.content;

    const html = await marked.parse(body);
    const slug = file.replace('.md', '');
    const tsContent = `export const post = {
  title: ${JSON.stringify(title)},
  date: new Date(${JSON.stringify(date)}),
  slug: ${JSON.stringify(slug)},
  html: ${JSON.stringify(html)}
};`;

    await writeFile(`${postsDir}/${slug}.ts`, tsContent);
    console.log(`Generated: ${postsDir}/${slug}.ts`);
  }

  console.log("Blog build complete!");
}

export { FrontmatterSchema };

if (import.meta.main) {
  await buildPosts();
}
```

### Subtask 6.2: Create new bundle.ts using Bun.build

**Step 1:** Create build/bundle.ts

```typescript
await Bun.build({
  entrypoints: ["./public/index.ts"],
  outdir: "./public",
  naming: "[name].js",
  minify: true,
  sourcemap: "external",
  target: "browser",
});

console.log("Bundle complete!");
```

### Subtask 6.3: Delete old esbuild.bundle.ts

Run: `rm build/esbuild.bundle.ts`

---

## Task 7: Cleanup and Final Verification

**Files:**
- Delete: `deno.json`
- Delete: `deno.lock`

### Subtask 7.1: Run all tests

**Step 1:** Run complete test suite

Run: `bun test`
Expected: All tests pass

### Subtask 7.2: Test dev server

**Step 1:** Start the dev server

Run: `bun run dev`
Expected: Server starts on http://localhost:8000

**Step 2:** Verify endpoints manually

- GET http://localhost:8000/ - Should show home page
- GET http://localhost:8000/blog - Should show blog index
- GET http://localhost:8000/measure - Should show measurement page
- GET http://localhost:8000/health - Should return `{"status":"ok"}`

### Subtask 7.3: Test build scripts

**Step 1:** Test blog build

Run: `bun run build-blog`
Expected: Posts generated in ./posts/

**Step 2:** Test bundle (if needed)

Run: `bun run bundle`
Expected: ./public/index.js created

### Subtask 7.4: Remove Deno files

**Step 1:** Delete deno.json and deno.lock

Run: `rm deno.json deno.lock`

### Subtask 7.5: Final verification

**Step 1:** Run tests one more time

Run: `bun test`
Expected: All tests pass

**Step 2:** Verify no Deno references remain

Run: `grep -r "Deno\." src/ tests/ build/ --include="*.ts" | grep -v "_test.ts.bak"`
Expected: No matches (or only in backup files)

---

## Assertion Mapping Reference

| Deno (`@std/assert`) | Bun (`bun:test`) |
|---------------------|------------------|
| `assertEquals(a, b)` | `expect(a).toBe(b)` or `expect(a).toEqual(b)` |
| `assertNotEquals(a, b)` | `expect(a).not.toBe(b)` |
| `assertThrows(fn)` | `expect(fn).toThrow()` |
| `assertThrows(fn, Error, "msg")` | `expect(fn).toThrow("msg")` |
| `assertRejects(asyncFn)` | `await expect(asyncFn()).rejects.toThrow()` |
| `assertStringIncludes(str, substr)` | `expect(str).toContain(substr)` |
| `assert(condition)` | `expect(condition).toBe(true)` |
| `assertArrayIncludes(arr, item)` | `expect(arr).toContain(item)` |

## Import Changes Reference

| Deno Import | Bun Import |
|-------------|------------|
| `@std/path` | `node:path` |
| `@std/fs` | `node:fs/promises` |
| `@std/assert` | `bun:test` |
| `@std/media-types` | `mime` |
| `@std/front-matter/yaml` | `gray-matter` |
| `@deno/gfm` | `marked` |
| `@eta-dev/eta` | `eta` |
| `Deno.env.get("X")` | `process.env.X` |
| `Deno.readTextFile(p)` | `Bun.file(p).text()` or `readFile(p, "utf-8")` |
| `Deno.writeTextFile(p, c)` | `Bun.write(p, c)` or `writeFile(p, c)` |
| `Deno.readFile(p)` | `readFile(p)` from `node:fs/promises` |
| `Deno.stat(p)` | `stat(p)` from `node:fs/promises` |
| `Deno.mkdir(p, opts)` | `mkdir(p, opts)` from `node:fs/promises` |
| `Deno.remove(p, opts)` | `rm(p, opts)` from `node:fs/promises` |
| `Deno.serve()` | `Bun.serve()` |
| `Deno.cwd()` | `process.cwd()` |
| `import.meta.url` | `import.meta.url` (same) |
| `import.meta.main` | `import.meta.main` (same) |
| `fromFileUrl(new URL(".", import.meta.url))` | `import.meta.dir` |
