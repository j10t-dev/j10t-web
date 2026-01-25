# Deno to Bun Migration Design

## Overview

Migrate j10t-web from Deno to Bun runtime. Motivation: developer experience / vibes.

**Approach:** Big bang - convert everything at once
**TDD Strategy:** Port tests first (red), then migrate implementation (green)

---

## Dependency Mapping

| Deno (current) | Bun (target) | Notes |
|----------------|--------------|-------|
| `@std/path` | `node:path` | Built-in, identical API |
| `@std/fs` | `node:fs/promises` | Built-in |
| `@std/assert` | `bun:test` | `expect()` matchers |
| `@std/http` | Not needed | `Bun.serve()` handles it |
| `@std/media-types` | `mime` (npm) | Simple MIME lookup |
| `@std/front-matter` | `gray-matter` (npm) | Popular, well-maintained |
| `@deno/gfm` | `marked` (npm) | Simple, fast GFM |
| `@eta-dev/eta` | `eta` (npm) | Same package, npm version |
| `@logtape/logtape` | `@logtape/logtape` (npm) | Already supports Bun |
| `esbuild` + deno-loader | `Bun.build()` | Native bundler, faster |
| `zod` | `zod` | Unchanged |

---

## Code Changes Required

### HTTP Server (`src/main.ts`)

```typescript
// Deno
Deno.serve({ port: 8000 }, handler);

// Bun
Bun.serve({ port: 8000, fetch: handler });
```

### Path resolution

```typescript
// Deno
import { fromFileUrl, join } from "@std/path";
const __dirname = fromFileUrl(new URL(".", import.meta.url));

// Bun
import { join } from "node:path";
const __dirname = import.meta.dir;
```

### File reading

```typescript
// Deno
await Deno.readTextFile(path);

// Bun
await Bun.file(path).text();
```

### Static file serving

```typescript
// Deno
import { contentType } from "@std/media-types";

// Bun
import mime from "mime";
const type = mime.getType(filepath);
```

### Test syntax

```typescript
// Deno
import { assertEquals, assertThrows } from "@std/assert";
Deno.test("name", async () => {
  assertEquals(a, b);
});

// Bun
import { test, expect } from "bun:test";
test("name", async () => {
  expect(a).toBe(b);
});
```

---

## Migration Order (TDD)

### Phase 1: Setup
1. Create `package.json` with dependencies
2. Create `tsconfig.json`
3. Run `bun install`

### Phase 2: Port Tests (Red)
Convert in dependency order - leaf modules first:

1. `src/lib/utils_test.ts`
2. `src/lib/logger_test.ts`
3. `src/lib/chart_data_test.ts`
4. `src/routes/static_test.ts`
5. `src/routes/charts_test.ts`
6. `src/routes/index_test.ts`
7. `src/routes/blog_test.ts`
8. `src/routes/router_test.ts`
9. `tests/build_blog_test.ts`
10. `tests/main_test.ts`
11. `tests/integration/*_test.ts`

### Phase 3: Migrate Implementation (Green)
Same order - make each test file pass before moving on:

1. `src/lib/utils.ts`
2. `src/lib/logger.ts`
3. `src/lib/chart_data.ts`
4. `src/routes/static.ts`
5. `src/routes/charts.ts`
6. `src/routes/index.ts`
7. `src/routes/blog.ts`
8. `src/routes/router.ts`
9. `src/main.ts`
10. `build/build-blog.ts`
11. `build/esbuild.bundle.ts` → `build/bundle.ts`

### Phase 4: Cleanup
1. Delete `deno.json`, `deno.lock`
2. Update any scripts/CI
3. Test full server manually

---

## Config Files

### `package.json`

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

### `tsconfig.json`

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

---

## Scope Summary

- **14 test files** to port
- **13 implementation files** to migrate
- **2 config files** to create
- **1 build script** to rewrite

---

## Sources

- [Bun vs Deno 2025](https://pullflow.com/blog/deno-vs-bun-2025)
- [Bun.serve() docs](https://betterstack.com/community/guides/scaling-nodejs/nodejs-vs-deno-vs-bun/)
- [Bun File I/O](https://bun.com/docs/runtime/file-io)
- [Bun import.meta](https://bun.sh/docs/api/import-meta)
- [Bun vs esbuild](https://bun.com/docs/bundler/vs-esbuild)
- [LogTape multi-runtime](https://github.com/dahlia/logtape)
- [marked](https://www.npmjs.com/package/marked)
