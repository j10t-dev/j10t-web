import { Router } from "./router.ts";
import { StaticFileHandler } from "./static.ts";
import { ChartDataHandler } from "./charts.ts";
import { PageRenderHandler } from "./index.ts";
import { BlogHandler } from "./blog.ts";
import { assertEquals } from "jsr:@std/assert";

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
    return [{ title: "Test Post", date: "2024-01-01", slug: "test", html: "<p>Test</p>" }];
  }
}

Deno.test("Router handles static file route", async () => {
  const router = new Router({ publicDir: "", eta: {} as any });
  (router as any).staticHandler = new MockStaticFileHandler();
  const req = new Request("http://localhost/public/foo.js");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "static");
});

Deno.test("Router handles /api/charts", async () => {
  const router = new Router({ publicDir: "", eta: {} as any });
  (router as any).chartHandler = new MockChartDataHandler();
  const req = new Request("http://localhost/api/charts");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "chart");
});

Deno.test("Router handles /measure", async () => {
  const router = new Router({ publicDir: "", eta: {} as any });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/measure");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "measure with title,currentPage");
});

Deno.test("Router handles / (index)", async () => {
  const router = new Router({ publicDir: "", eta: {} as any });
  (router as any).pageHandler = new MockPageRenderHandler();
  (router as any).blogHandler = new MockBlogHandler();
  const req = new Request("http://localhost/");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "index with title,currentPage,posts");
});

Deno.test("Router handles /weight", async () => {
  const router = new Router({ publicDir: "", eta: {} as any });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/weight");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "weight with title,currentPage");
});

Deno.test("Router handles /about", async () => {
  const router = new Router({ publicDir: "", eta: {} as any });
  (router as any).pageHandler = new MockPageRenderHandler();
  const req = new Request("http://localhost/about");
  const res = await router.handle(req);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "about with title,currentPage");
});

Deno.test("Router returns 404 for unknown route", async () => {
  const router = new Router({ publicDir: "", eta: {} as any });
  const req = new Request("http://localhost/unknown");
  const res = await router.handle(req);
  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Not found");
}); 