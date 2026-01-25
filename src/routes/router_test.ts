import { Router, RouterOptionsSchema } from "./router";
import { StaticFileHandler } from "./static";
import { ChartDataHandler } from "./charts";
import { PageRenderHandler } from "./index";
import { BlogHandler } from "./blog";
import { test, expect } from "bun:test";
import { Eta } from "eta";

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

test("Router handles static file route", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).staticHandler = new MockStaticFileHandler();
  const req = new Request("http://localhost/public/foo.js");
  const res = await router.handle(req);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("static");
});

test("Router handles /api/charts", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).chartHandler = new MockChartDataHandler();
  const req = new Request("http://localhost/api/charts");
  const res = await router.handle(req);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("chart");
});

test("Router handles /measure", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/measure");
  const res = await router.handle(req);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("measure with title,currentPage");
});

test("Router handles / (index)", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).pageHandler = new MockPageRenderHandler();
  (router as any)._blogHandler = new MockBlogHandler();
  const req = new Request("http://localhost/");
  const res = await router.handle(req);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("index with title,currentPage,posts");
});

test("Router handles /weight", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/weight");
  const res = await router.handle(req);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("weight with title,currentPage");
});

test("Router handles /about", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/about");
  const res = await router.handle(req);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("about with title,currentPage");
});

test("Router handles /projects", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/projects");
  const res = await router.handle(req);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("projects with title,currentPage");
});

test("Router handles /health endpoint", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  const req = new Request("http://localhost/health");
  const res = await router.handle(req);
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("application/json");
  const body = await res.json();
  expect(body).toEqual({ status: "ok" });
});

test("Router returns 404 for unknown route", async () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({ publicDir: "/public", eta: mockEta });
  const req = new Request("http://localhost/unknown");
  const res = await router.handle(req);
  expect(res.status).toBe(404);
  expect(await res.text()).toBe("Not found");
});

test("RouterOptionsSchema - Validates valid options with Eta instance", () => {
  const mockEta = new Eta({ views: "./views" });
  const validOptions = {
    publicDir: "/public",
    eta: mockEta,
  };

  const result = RouterOptionsSchema.safeParse(validOptions);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.publicDir).toBe("/public");
    expect(result.data.eta).toBe(mockEta);
  }
});

test("RouterOptionsSchema - Validates options with postsDir", () => {
  const mockEta = new Eta({ views: "./views" });
  const validOptions = {
    publicDir: "/public",
    eta: mockEta,
    postsDir: "./posts"
  };

  const result = RouterOptionsSchema.safeParse(validOptions);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.postsDir).toBe("./posts");
  }
});

test("RouterOptionsSchema - Rejects empty publicDir", () => {
  const mockEta = new Eta({ views: "./views" });
  const invalidOptions = {
    publicDir: "",
    eta: mockEta,
  };

  const result = RouterOptionsSchema.safeParse(invalidOptions);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].message).toContain("empty");
  }
});

test("RouterOptionsSchema - Rejects empty postsDir", () => {
  const mockEta = new Eta({ views: "./views" });
  const invalidOptions = {
    publicDir: "/public",
    eta: mockEta,
    postsDir: ""
  };

  const result = RouterOptionsSchema.safeParse(invalidOptions);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].message).toContain("empty");
  }
});

test("RouterOptionsSchema - Rejects invalid eta instance", () => {
  const invalidOptions = {
    publicDir: "/public",
    eta: { notRender: "invalid" }, // Missing render method
  };

  const result = RouterOptionsSchema.safeParse(invalidOptions);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.errors[0].message).toContain("Eta instance");
  }
});

test("RouterOptionsSchema - Rejects missing publicDir", () => {
  const mockEta = new Eta({ views: "./views" });
  const invalidOptions = {
    eta: mockEta,
  };

  const result = RouterOptionsSchema.safeParse(invalidOptions);
  expect(result.success).toBe(false);
});

test("RouterOptionsSchema - Rejects missing eta", () => {
  const invalidOptions = {
    publicDir: "/public",
  };

  const result = RouterOptionsSchema.safeParse(invalidOptions);
  expect(result.success).toBe(false);
});

test("Router constructor - Throws on invalid options", () => {
  expect(() => {
    new Router({ publicDir: "", eta: {} as any } as any);
  }).toThrow("Invalid Router options");
});

test("Router constructor - Accepts valid options", () => {
  const mockEta = new Eta({ views: "./views" });
  const router = new Router({
    publicDir: "/public",
    eta: mockEta,
  });

  expect(typeof router).toBe("object");
});
