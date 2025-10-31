# Restructure to src/ Directory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganise project structure to move all application code (`main.ts`, `routes/`, `lib/`) into `src/` directory, build scripts into `build/` directory, and all test files into `tests/` directory.

**Architecture:** Move `main.ts`, `routes/` and `lib/` into a new `src/` directory. Move build scripts (`build-blog.ts`, `esbuild.bundle.ts`) into a new `build/` directory. Move all test files (`main_test.ts`, `measure_test.ts`, `build_blog_test.ts`) to `tests/` directory. Keep generated content (`posts/`, `public/`) at the root. Update all import paths and deno.json tasks to use the new structure.

**Tech Stack:** Deno, TypeScript, filesystem operations, import path rewriting

---

## Task 1: Create New Directories

**Files:**
- Create: `src/` (directory)
- Create: `build/` (directory)

**Step 1: Create src directory**

Run:
```bash
mkdir -p src
```

Expected: Directory created successfully

**Step 2: Create build directory**

Run:
```bash
mkdir -p build
```

Expected: Directory created successfully

**Step 3: Verify directory creation**

Run:
```bash
ls -la | grep -E "^d.*(src|build)$"
```

Expected: Both `src` and `build` directories listed

---

## Task 2: Move Application Files to src/

**Files:**
- Move: `main.ts` → `src/main.ts`
- Move: `routes/` → `src/routes/`
- Move: `lib/` → `src/lib/`

**Step 1: Move main.ts to src/**

Run:
```bash
git mv main.ts src/main.ts
```

Expected: File moved successfully

**Step 2: Move routes directory to src/**

Run:
```bash
git mv routes src/routes
```

Expected: Directory moved successfully

**Step 3: Move lib directory to src/**

Run:
```bash
git mv lib src/lib
```

Expected: Directory moved successfully

**Step 4: Verify moves**

Run:
```bash
ls -la src/
```

Expected: Lists `main.ts`, `routes/` and `lib/` inside `src/`

---

## Task 3: Move Build Scripts to build/

**Files:**
- Move: `build-blog.ts` → `build/build-blog.ts`
- Move: `esbuild.bundle.ts` → `build/esbuild.bundle.ts`

**Step 1: Move build-blog.ts**

Run:
```bash
git mv build-blog.ts build/build-blog.ts
```

Expected: File moved successfully

**Step 2: Move esbuild.bundle.ts**

Run:
```bash
git mv esbuild.bundle.ts build/esbuild.bundle.ts
```

Expected: File moved successfully

**Step 3: Verify moves**

Run:
```bash
ls -la build/
```

Expected: Lists both build scripts in `build/`

---

## Task 4: Move Test Files to tests/

**Files:**
- Move: `main_test.ts` → `tests/main_test.ts`
- Move: `measure_test.ts` → `tests/measure_test.ts`
- Move: `build_blog_test.ts` → `tests/build_blog_test.ts`

**Step 1: Move main_test.ts**

Run:
```bash
git mv main_test.ts tests/main_test.ts
```

Expected: File moved successfully

**Step 2: Move measure_test.ts**

Run:
```bash
git mv measure_test.ts tests/measure_test.ts
```

Expected: File moved successfully

**Step 3: Move build_blog_test.ts**

Run:
```bash
git mv build_blog_test.ts tests/build_blog_test.ts
```

Expected: File moved successfully

**Step 4: Verify moves**

Run:
```bash
ls -la tests/*.ts
```

Expected: Lists all three test files in `tests/`

---

## Task 5: Update Import Paths in src/main.ts

**Files:**
- Modify: `src/main.ts:4-5`

**Step 1: Read current imports**

Current code (src/main.ts:4-5):
```typescript
import { logInfo } from "./lib/logger.ts";
import { Router } from "./routes/router.ts";
```

**Step 2: Verify imports still work**

Since main.ts is now in `src/` with `lib/` and `routes/` as siblings, the relative imports should remain unchanged.

**Step 3: Verify main.ts type checks**

Run:
```bash
deno check src/main.ts
```

Expected: No type errors

---

## Task 6: Update deno.json Tasks

**Files:**
- Modify: `deno.json:2-7`

**Step 1: Read current tasks**

Current code (deno.json:2-7):
```json
"tasks": {
  "start": "deno run --allow-net --allow-read main.ts",
  "dev": "deno run --allow-net --allow-read --watch main.ts",
  "test": "deno test --allow-net --allow-read --allow-run --allow-env --allow-write",
  "bundle": "deno run -A esbuild.bundle.ts",
  "build-blog": "deno run --allow-read --allow-write --allow-env build-blog.ts"
}
```

**Step 2: Update task paths**

New code:
```json
"tasks": {
  "start": "deno run --allow-net --allow-read src/main.ts",
  "dev": "deno run --allow-net --allow-read --watch src/main.ts",
  "test": "deno test --allow-net --allow-read --allow-run --allow-env --allow-write",
  "bundle": "deno run -A build/esbuild.bundle.ts",
  "build-blog": "deno run --allow-read --allow-write --allow-env build/build-blog.ts"
}
```

**Step 3: Verify tasks work**

Run:
```bash
deno task build-blog
```

Expected: Blog build completes successfully

Run:
```bash
deno task bundle
```

Expected: Bundle completes successfully

---

## Task 7: Update Import Paths in build/build-blog.ts

**Files:**
- Modify: `build/build-blog.ts`

**Step 1: Check for application imports**

Run:
```bash
grep -n "from ['\"]\./" build/build-blog.ts
```

Expected: Shows any local imports (likely none, but check)

**Step 2: Update any imports if needed**

If build-blog.ts imports from application code:
- `from "./lib/..."` → `from "../src/lib/..."`
- `from "./routes/..."` → `from "../src/routes/..."`
- `from "./main.ts"` → `from "../src/main.ts"`

**Step 3: Verify script type checks**

Run:
```bash
deno check build/build-blog.ts
```

Expected: No type errors

**Step 4: Run the script to verify**

Run:
```bash
deno task build-blog
```

Expected: Script runs successfully

---

## Task 8: Update Import Paths in build/esbuild.bundle.ts

**Files:**
- Modify: `build/esbuild.bundle.ts`

**Step 1: Check for application imports**

Run:
```bash
grep -n "from ['\"]\./" build/esbuild.bundle.ts
```

Expected: Shows any local imports

**Step 2: Update any imports if needed**

If esbuild.bundle.ts imports from application code:
- `from "./lib/..."` → `from "../src/lib/..."`
- `from "./routes/..."` → `from "../src/routes/..."`
- `from "./main.ts"` → `from "../src/main.ts"`

**Step 3: Verify script type checks**

Run:
```bash
deno check build/esbuild.bundle.ts
```

Expected: No type errors

**Step 4: Run bundle task to verify**

Run:
```bash
deno task bundle
```

Expected: Bundle completes successfully

---

## Task 9: Update Import Paths in tests/build_blog_test.ts

**Files:**
- Modify: `tests/build_blog_test.ts`

**Step 1: Check current imports**

Run:
```bash
grep -n "from ['\"]" tests/build_blog_test.ts
```

Expected: Shows import statements

**Step 2: Update import of build-blog.ts**

If it imports from build-blog.ts, update:
```typescript
// Before (when file was at root)
import { ... } from "./build-blog.ts";

// After (now in tests/)
import { ... } from "../build/build-blog.ts";
```

**Step 3: Verify test file type checks**

Run:
```bash
deno check tests/build_blog_test.ts
```

Expected: No type errors

**Step 4: Run the test**

Run:
```bash
deno test tests/build_blog_test.ts
```

Expected: Test passes

---

## Task 10: Update Import Paths in tests/main_test.ts

**Files:**
- Modify: `tests/main_test.ts`

**Step 1: Check current imports**

Run:
```bash
grep -n "from ['\"]" tests/main_test.ts
```

Expected: Shows import statements

**Step 2: Update import of main.ts**

If it imports from main.ts, update:
```typescript
// Before (when file was at root)
import { handler } from "./main.ts";

// After (main.ts now in src/)
import { handler } from "../src/main.ts";
```

**Step 3: Update any imports from routes/lib**

Update imports referencing application code:
- `from "./routes/..."` → `from "../src/routes/..."`
- `from "./lib/..."` → `from "../src/lib/..."`

**Step 4: Verify test file type checks**

Run:
```bash
deno check tests/main_test.ts
```

Expected: No type errors

**Step 5: Run the test**

Run:
```bash
deno test tests/main_test.ts
```

Expected: Test passes

---

## Task 11: Update Import Paths in tests/measure_test.ts

**Files:**
- Modify: `tests/measure_test.ts`

**Step 1: Check current imports**

Run:
```bash
grep -n "from ['\"]" tests/measure_test.ts
```

Expected: Shows import statements

**Step 2: Update imports as needed**

Update any relative imports:
- Imports from `routes/` → `../src/routes/`
- Imports from `lib/` → `../src/lib/`
- Imports from `main.ts` → `../src/main.ts`

**Step 3: Verify test file type checks**

Run:
```bash
deno check tests/measure_test.ts
```

Expected: No type errors

**Step 4: Run the test**

Run:
```bash
deno test tests/measure_test.ts
```

Expected: Test passes

---

## Task 12: Verify src/routes/ and src/lib/ Internal Imports

**Files:**
- Check: `src/routes/*.ts`
- Check: `src/lib/*.ts`

**Step 1: Check imports between routes and lib**

Run:
```bash
grep -rn "from.*\.\./lib" src/routes/
```

Expected: Shows route files importing from lib (paths should still work as both are now in src/)

**Step 2: Verify all route files type check**

Run:
```bash
deno check src/routes/*.ts
```

Expected: No type errors

**Step 3: Verify all lib files type check**

Run:
```bash
deno check src/lib/*.ts
```

Expected: No type errors

**Step 4: Run all tests in src/routes/**

Run:
```bash
deno test src/routes/
```

Expected: All tests pass

**Step 5: Run all tests in src/lib/**

Run:
```bash
deno test src/lib/
```

Expected: All tests pass

---

## Task 13: Update Integration Test Imports

**Files:**
- Modify: `tests/integration/*_test.ts`

**Step 1: List integration test files**

Run:
```bash
ls -la tests/integration/
```

Expected: Shows integration test files

**Step 2: Check imports in integration tests**

Run:
```bash
grep -rn "from ['\"].*main\|from ['\"].*routes\|from ['\"].*lib" tests/integration/
```

Expected: Shows imports referencing main application code

**Step 3: Update imports to use new paths**

For each file found, update imports like:
- `from "../../main.ts"` → `from "../../src/main.ts"`
- `from "../../routes/..."` → `from "../../src/routes/..."`
- `from "../../lib/..."` → `from "../../src/lib/..."`

**Step 4: Verify integration tests type check**

Run:
```bash
deno check tests/integration/*.ts
```

Expected: No type errors

**Step 5: Run integration tests**

Run:
```bash
deno test tests/integration/
```

Expected: All tests pass

---

## Task 14: Update Test Helper Imports

**Files:**
- Modify: `tests/helpers/*`

**Step 1: Check helper files**

Run:
```bash
ls -la tests/helpers/
```

Expected: Shows test helper files

**Step 2: Check imports in helper files**

Run:
```bash
grep -rn "from ['\"].*\.\." tests/helpers/
```

Expected: Shows any imports from parent directories

**Step 3: Update imports if needed**

Update any imports referencing application code:
- `from "../../routes/..."` → `from "../../src/routes/..."`
- `from "../../lib/..."` → `from "../../src/lib/..."`
- `from "../../main.ts"` → `from "../../src/main.ts"`

**Step 4: Verify helpers type check**

Run:
```bash
deno check tests/helpers/*.ts
```

Expected: No type errors

---

## Task 15: Update src/main.ts Directory References

**Files:**
- Modify: `src/main.ts:25-27`

**Step 1: Read current directory references**

Current code (src/main.ts:25-27):
```typescript
const __dirname = fromFileUrl(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const VIEWS_DIR = join(__dirname, "views");
```

**Step 2: Update to reference parent directories**

New code:
```typescript
const __dirname = fromFileUrl(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const VIEWS_DIR = join(__dirname, "..", "views");
```

**Step 3: Verify main.ts type checks**

Run:
```bash
deno check src/main.ts
```

Expected: No type errors

**Step 4: Test server can find views and public**

Run:
```bash
deno task dev &
sleep 2
curl http://localhost:8000 -I
pkill -f "deno run"
```

Expected: Server starts and responds successfully

---

## Task 16: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Read relevant sections**

Run:
```bash
grep -n "main.ts\|routes/\|lib/\|build-blog" CLAUDE.md | head -20
```

Expected: Shows references to structure

**Step 2: Update architecture overview**

Update the "Architecture Overview" section to reflect new structure:

```markdown
### Core Components

- **src/main.ts**: Entry point that sets up the Eta templating engine and Router
- **Router (src/routes/router.ts)**: Central request dispatcher with four handler classes:
  - `StaticFileHandler`: Serves static files from `/public/` directory
  - `ChartDataHandler`: Provides chart data via `/api/charts` endpoint
  - `PageRenderHandler`: Renders HTML pages using Eta templates
  - `BlogHandler`: Serves blog posts from generated TypeScript modules
```

**Step 3: Update development commands**

Update commands to reflect new paths:
```markdown
- **Start development server**: `deno task dev` (includes file watching)
- **Run production server**: `deno task start`
- **Run tests**: `deno task test`
- **Bundle frontend assets**: `deno task bundle`
- **Build blog posts**: `deno task build-blog`
- **Run single test file**: `deno test --allow-net --allow-read --allow-run --allow-env --allow-write <file_path>`
```

**Step 4: Update test structure guidelines**

Update test file locations:
```markdown
### Test File Locations
```
build/
  build-blog.ts               # Build scripts
  esbuild.bundle.ts

src/
  main.ts                     # Application entry point
  lib/
    chart_data.ts
    chart_data_test.ts        # Unit tests co-located
    logger.ts
    logger_test.ts            # Unit tests co-located
    utils.ts
    utils_test.ts

  routes/
    blog.ts
    blog_test.ts             # Unit tests co-located
    router.ts
    router_test.ts           # Unit tests co-located
    charts.ts
    charts_test.ts
    static.ts
    static_test.ts
    index.ts
    index_test.ts

tests/
  main_test.ts               # Main entry point tests
  measure_test.ts            # Measurement tests
  build_blog_test.ts         # Build script tests
  integration/               # Multi-module integration tests
    blog_integration_test.ts
  helpers/                  # Test utilities and helpers
    blog_test_helpers.ts
```
```

**Step 5: Update test commands section**

Update test commands to reflect new paths:
```markdown
### Test Commands
- **Run all tests**: `deno task test`
- **Run unit tests in src**: `deno test src/`
- **Run tests directory**: `deno test tests/`
- **Run integration tests only**: `deno test tests/integration/`
- **Run specific test file**: `deno test --allow-all path/to/file_test.ts`
```

---

## Task 17: Run Full Test Suite

**Files:**
- Test: All test files

**Step 1: Run all tests**

Run:
```bash
deno task test
```

Expected: All tests pass with no errors

**Step 2: If any tests fail, debug and fix**

For each failing test:
1. Read the error message
2. Check if it's an import path issue
3. Fix the import path
4. Re-run tests

**Step 3: Verify development server works**

Run:
```bash
deno task dev &
sleep 2
curl http://localhost:8000
curl http://localhost:8000/blog/
pkill -f "deno run"
```

Expected: Server responds correctly to both requests

**Step 4: Verify production server works**

Run:
```bash
deno task start &
sleep 2
curl http://localhost:8000
pkill -f "deno run"
```

Expected: Server responds correctly

---

## Task 18: Update README.md (if applicable)

**Files:**
- Modify: `README.md` (if it references file structure)

**Step 1: Check README for structural references**

Run:
```bash
grep -n "main.ts\|routes/\|lib/\|build-blog" README.md
```

Expected: Shows any references to structure

**Step 2: Update README if needed**

If README contains development instructions or architecture diagrams, update them to reflect:
- `src/main.ts` as entry point
- `src/routes/` and `src/lib/` for application code
- Build scripts in `build/` directory
- Tests in `tests/` directory

---

## Task 19: Update .gitignore (if needed)

**Files:**
- Check: `.gitignore`

**Step 1: Check if build outputs need ignoring**

Run:
```bash
cat .gitignore
```

Expected: Shows current ignore patterns

**Step 2: Add build-related patterns if needed**

Ensure the following patterns exist if they generate output:
```gitignore
# Build outputs (if any)
/build/dist/
/build/*.js
```

Note: Only add if the build scripts generate output files

---

## Task 20: Final Verification and Summary

**Files:**
- Test: Entire project

**Step 1: Verify directory structure**

Run:
```bash
tree -L 2 -I 'node_modules|.git|public|views|posts|content|docs'
```

Expected output structure:
```
.
├── deno.json
├── deno.lock
├── CLAUDE.md
├── README.md
├── browser.json
├── .gitignore
├── build/
│   ├── build-blog.ts
│   └── esbuild.bundle.ts
├── src/
│   ├── main.ts
│   ├── lib/
│   └── routes/
└── tests/
    ├── main_test.ts
    ├── measure_test.ts
    ├── build_blog_test.ts
    ├── helpers/
    └── integration/
```

**Step 2: Run all quality checks**

Run all tests:
```bash
deno task test
```

Expected: All tests pass

Run type checking:
```bash
deno check src/main.ts
```

Expected: No type errors

**Step 3: Test all deno tasks**

```bash
# Test build-blog
deno task build-blog

# Test bundle
deno task bundle

# Test dev server (run briefly)
timeout 5s deno task dev || true

# Test production server
deno task start &
sleep 2
curl http://localhost:8000 -I
pkill -f "deno run"
```

Expected: All tasks execute successfully

**Step 4: Review git status**

Run:
```bash
git status
```

Expected: Shows modified and moved files ready to stage

---

## Completion Checklist

After completing all tasks, verify:

- [ ] All application code is in `src/` directory
- [ ] Build scripts are in `build/` directory
- [ ] All test files are in `tests/` directory
- [ ] Unit tests remain co-located with source in `src/`
- [ ] All tests pass (`deno task test`)
- [ ] Development server starts (`deno task dev`)
- [ ] Production server starts (`deno task start`)
- [ ] Blog build works (`deno task build-blog`)
- [ ] Bundle works (`deno task bundle`)
- [ ] Documentation (CLAUDE.md, README.md) updated
- [ ] No broken imports remain
- [ ] Git status shows expected changes

---

## Rollback Plan

If issues arise, rollback with:

```bash
# View current changes
git status

# Discard all changes and moves
git reset --hard HEAD

# Or selectively undo moves
git mv src/main.ts .
git mv src/routes routes
git mv src/lib lib
git mv build/build-blog.ts .
git mv build/esbuild.bundle.ts .
git mv tests/main_test.ts .
git mv tests/measure_test.ts .
git mv tests/build_blog_test.ts .
```
