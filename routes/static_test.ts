// deno-lint-ignore-file no-explicit-any
import { StaticFileHandler } from "./static.ts";
import { assertEquals } from "jsr:@std/assert";

const mockFile = new Uint8Array([1, 2, 3]);
const mockFileInfo = {
  isFile: true,
  isDirectory: false,
  isSymlink: false,
  size: 3,
  mtime: new Date(),
  atime: new Date(),
  birthtime: new Date(),
  dev: 0, ino: 0, mode: 0, nlink: 1, uid: 0, gid: 0, rdev: 0, blksize: 0, blocks: 0,
};

function mockStat(_path: string) {
  return Promise.resolve(mockFileInfo as unknown as Deno.FileInfo);
}
function mockReadFile(_path: string) {
  return Promise.resolve(mockFile);
}
function mockGetContentType(_path: string) {
  return "text/javascript; charset=UTF-8";
}
function mockSanitizePath(_base: string, user: string) {
  return `/mock/${user}`;
}

async function withPatchedStatAndReadFile(testFn: () => Promise<void>) {
  const origStat = Deno.stat;
  const origReadFile = Deno.readFile;
  try {
    await testFn();
  } finally {
    Deno.stat = origStat;
    Deno.readFile = origReadFile;
  }
}

// Utility to patch and restore global utils
async function withPatchedUtils(testFn: () => Promise<void>, getContentType = mockGetContentType, sanitizePath = mockSanitizePath) {
  const origGetContentType = (globalThis as any).getContentType;
  const origSanitizePath = (globalThis as any).sanitizePath;
  (globalThis as any).getContentType = getContentType;
  (globalThis as any).sanitizePath = sanitizePath;
  try {
    await testFn();
  } finally {
    (globalThis as any).getContentType = origGetContentType;
    (globalThis as any).sanitizePath = origSanitizePath;
  }
}

Deno.test("StaticFileHandler returns file with 200", async () => {
  await withPatchedStatAndReadFile(async () => {
    await withPatchedUtils(async () => {
      Deno.stat = mockStat as any;
      Deno.readFile = mockReadFile as any;
      const handler = new StaticFileHandler("/mock");
      const req = new Request("http://localhost/public/foo.js");
      const url = new URL(req.url);
      const res = await handler.handle(url, req);
      assertEquals(res.status, 200);
      assertEquals(await res.arrayBuffer(), mockFile.buffer);
    });
  });
});

Deno.test("StaticFileHandler returns 404 if not found", async () => {
  await withPatchedStatAndReadFile(async () => {
    Deno.stat = () => { throw new Error("not found"); };
    const handler = new StaticFileHandler("/mock");
    const req = new Request("http://localhost/public/missing.js");
    const url = new URL(req.url);
    const res = await handler.handle(url, req);
    assertEquals(res.status, 404);
  });
});

Deno.test("StaticFileHandler returns 304 if not modified", async () => {
  await withPatchedStatAndReadFile(async () => {
    await withPatchedUtils(async () => {
      Deno.stat = mockStat as any;
      Deno.readFile = mockReadFile as any;
      const handler = new StaticFileHandler("/mock");
      const req = new Request("http://localhost/public/foo.js", { headers: new Headers({ "if-none-match": `W/\"3-${mockFileInfo.mtime.getTime()}\"` }) });
      const url = new URL(req.url);
      const res = await handler.handle(url, req);
      assertEquals(res.status, 304);
    });
  });
});

Deno.test("StaticFileHandler returns 404 if path is directory", async () => {
  await withPatchedStatAndReadFile(async () => {
    Deno.stat = () => Promise.resolve({ ...mockFileInfo, isFile: false } as unknown as Deno.FileInfo);
    const handler = new StaticFileHandler("/mock");
    const req = new Request("http://localhost/public/dir/");
    const url = new URL(req.url);
    const res = await handler.handle(url, req);
    assertEquals(res.status, 404);
  });
});

Deno.test("StaticFileHandler returns 404 if sanitizePath throws", async () => {
  const handler = new StaticFileHandler("/mock", {
    sanitizePath: () => { throw new Error("sanitize fail"); }
  });
  const req = new Request("http://localhost/public/foo.js");
  const url = new URL(req.url);
  const res = await handler.handle(url, req);
  assertEquals(res.status, 404);
});

Deno.test("StaticFileHandler returns 404 if getContentType throws", async () => {
  await withPatchedStatAndReadFile(async () => {
    Deno.stat = mockStat as any;
    Deno.readFile = mockReadFile as any;
    const handler = new StaticFileHandler("/mock", {
      getContentType: () => { throw new Error("content type fail"); },
      sanitizePath: mockSanitizePath,
    });
    const req = new Request("http://localhost/public/foo.js");
    const url = new URL(req.url);
    const res = await handler.handle(url, req);
    assertEquals(res.status, 404);
  });
});

Deno.test("StaticFileHandler returns 304 if not modified (If-Modified-Since)", async () => {
  await withPatchedStatAndReadFile(async () => {
    await withPatchedUtils(async () => {
      Deno.stat = mockStat as any;
      Deno.readFile = mockReadFile as any;
      const handler = new StaticFileHandler("/mock");
      const lastModified = mockFileInfo.mtime.toUTCString();
      const req = new Request("http://localhost/public/foo.js", { headers: new Headers({ "if-modified-since": lastModified }) });
      const url = new URL(req.url);
      const res = await handler.handle(url, req);
      assertEquals(res.status, 304);
    });
  });
});

// Test: Response headers (Content-Type, Cache-Control, ETag, Last-Modified, X-Content-Type-Options)
Deno.test("StaticFileHandler sets correct response headers", async () => {
  await withPatchedStatAndReadFile(async () => {
    await withPatchedUtils(async () => {
      Deno.stat = mockStat as any;
      Deno.readFile = mockReadFile as any;
      const handler = new StaticFileHandler("/mock");
      const req = new Request("http://localhost/public/foo.js");
      const url = new URL(req.url);
      const res = await handler.handle(url, req);
      const headers = res.headers;
      assertEquals(headers.get("content-type"), "text/javascript; charset=UTF-8");
      assertEquals(headers.get("cache-control"), "public, max-age=31536000, immutable");
      assertEquals(headers.get("x-content-type-options"), "nosniff");
      assertEquals(headers.get("etag"), `W/\"3-${mockFileInfo.mtime.getTime()}\"`);
      assertEquals(headers.get("last-modified"), mockFileInfo.mtime.toUTCString());
    });
  });
});

Deno.test("StaticFileHandler returns 'Not found' body for 404", async () => {
  await withPatchedStatAndReadFile(async () => {
    Deno.stat = () => { throw new Error("not found"); };
    const handler = new StaticFileHandler("/mock");
    const req = new Request("http://localhost/public/missing.js");
    const url = new URL(req.url);
    const res = await handler.handle(url, req);
    assertEquals(res.status, 404);
    assertEquals(await res.text(), "Not found");
  });
});