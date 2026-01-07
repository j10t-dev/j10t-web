import { Router, RouterOptionsSchema } from "./router.ts";
import { StaticFileHandler } from "./static.ts";
import { ChartDataHandler } from "./charts.ts";
import { PageRenderHandler } from "./index.ts";
import { BlogHandler } from "./blog.ts";
import { assertEquals, assertThrows, assertStringIncludes } from "@std/assert";
import { Eta } from "@eta-dev/eta";

// Mock handlers extending real classes
class MockStaticFileHandler extends StaticFileHandler {
  constructor() { super(""); }
  override async handle(url: URL, req: Request) {
    return new Response("static", { status: 200 });
  }
}
class MockChartDataHandler extends ChartDataHandler {
  override async handle(_req: Request) {
    return new Response("chart", { status: 200 });
  }
}
class MockPageRenderHandler extends PageRenderHandler {
  constructor() { super({} as any); }
  override async handle(template: string, data?: Record<string, any>) {
    const dataInfo = data ? ` with ${Object.keys(data).join(',')}` : '';
    return new Response(template + dataInfo, { status: 200 });
  }
}
class MockBlogHandler extends BlogHandler {
  constructor() { super({} as any); }
  override getAllPosts() {
    return [{ title: "Test Post", date: new Date("2024-01-01"), slug: "test", html: "<p>Test</p>" }];
  }
}

Deno.test("Router handles static file route", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).staticHandler = new MockStaticFileHandler();
  const req = new Request("http://localhost/public/foo.js");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "static");
});

Deno.test("Router handles /api/charts", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).chartHandler = new MockChartDataHandler();
  const req = new Request("http://localhost/api/charts");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "chart");
});

Deno.test("Router handles /measure", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/measure");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "measure with title,currentPage");
});

Deno.test("Router handles / (index)", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).pageHandler = new MockPageRenderHandler();
  (router as any).blogHandler = new MockBlogHandler();
  const req = new Request("http://localhost/");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "index with title,currentPage,posts");
});

Deno.test("Router handles /weight", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/weight");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "weight with title,currentPage");
});

Deno.test("Router handles /about", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/about");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "about with title,currentPage");
});

Deno.test("Router handles /projects", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/projects");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "projects with title,currentPage");
});

Deno.test("Router returns 404 for unknown route", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  const req = new Request("http://localhost/unknown");
  const res = await router.handle(req);
  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Not found");
});

Deno.test("RouterOptionsSchema - Validates valid options with Eta instance", () => {
  const mockEta = new Eta({ views: "./views" });
  const validOptions = {
    publicDir: "/public",
    eta: mockEta,
  };

  const result = RouterOptionsSchema.safeParse(validOptions);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.publicDir, "/public");
    assertEquals(result.data.eta, mockEta);
  }
});

Deno.test("RouterOptionsSchema - Validates options with postsDir", () => {
  const mockEta = new Eta({ views: "./views" });
  const validOptions = {
    publicDir: "/public",
    eta: mockEta,
    postsDir: "./posts"
  };

  const result = RouterOptionsSchema.safeParse(validOptions);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.postsDir, "./posts");
  }
});

Deno.test("RouterOptionsSchema - Rejects empty publicDir", () => {
  const mockEta = new Eta({ views: "./views" });
  const invalidOptions = {
    publicDir: "",
    eta: mockEta,
  };

  const result = RouterOptionsSchema.safeParse(invalidOptions);
  assertEquals(result.success, false);
  if (!result.success) {
    assertStringIncludes(result.error.errors[0].message, "empty");
  }
});

Deno.test("RouterOptionsSchema - Rejects empty postsDir", () => {
  const mockEta = new Eta({ views: "./views" });
  const invalidOptions = {
    publicDir: "/public",
    eta: mockEta,
    postsDir: ""
  };

  const result = RouterOptionsSchema.safeParse(invalidOptions);
  assertEquals(result.success, false);
  if (!result.success) {
    assertStringIncludes(result.error.errors[0].message, "empty");
  }
});

Deno.test("RouterOptionsSchema - Rejects invalid eta instance", () => {
  const invalidOptions = {
    publicDir: "/public",
    eta: { notRender: "invalid" }, // Missing render method
  };

  const result = RouterOptionsSchema.safeParse(invalidOptions);
  assertEquals(result.success, false);
  if (!result.success) {
    assertStringIncludes(result.error.errors[0].message, "Eta instance");
  }
});

Deno.test("RouterOptionsSchema - Rejects missing publicDir", () => {
  const mockEta = new Eta({ views: "./views" });
  const invalidOptions = {
    eta: mockEta,
  };

  const result = RouterOptionsSchema.safeParse(invalidOptions);
  assertEquals(result.success, false);
});

Deno.test("RouterOptionsSchema - Rejects missing eta", () => {
  const invalidOptions = {
    publicDir: "/public",
  };

  const result = RouterOptionsSchema.safeParse(invalidOptions);
  assertEquals(result.success, false);
});

Deno.test("Router constructor - Throws on invalid options", () => {
  assertThrows(
    () => {
      new Router({ publicDir: "", eta: {} as any } as any);
    },
    Error,
    "Invalid Router options"
  );
});

Deno.test("Router constructor - Accepts valid options", {
  sanitizeResources: false,
  sanitizeOps: false,
}, () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({
    publicDir: "/public",
    eta: mockEta,
  });

  assertEquals(typeof router, "object");
}); 