import { StaticFileHandler } from "./static";
import { test, expect } from "bun:test";
import type { Stats } from "node:fs";

const mockFile = new Uint8Array([1, 2, 3]);
const mockFileInfo: Stats = {
  isFile: () => true,
  isDirectory: () => false,
  isSymbolicLink: () => false,
  size: 3,
  mtime: new Date("2024-01-01T00:00:00Z"),
  atime: new Date(),
  birthtime: new Date(),
  dev: 0, ino: 0, mode: 0, nlink: 1, uid: 0, gid: 0, rdev: 0, blksize: 0, blocks: 0,
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isFIFO: () => false,
  isSocket: () => false,
  atimeMs: 0, mtimeMs: 0, ctimeMs: 0, birthtimeMs: 0,
  ctime: new Date(),
} as Stats;

const mockStat = async (_path: string) => mockFileInfo;
const mockReadFile = async (_path: string) => Buffer.from(mockFile);
const mockGetContentType = (_path: string) => "text/javascript; charset=UTF-8";
const mockSanitizePath = (_base: string, user: string) => `/mock/${user}`;

test("StaticFileHandler returns file with 200", async () => {
  const handler = new StaticFileHandler("/mock", {
    getContentType: mockGetContentType,
    sanitizePath: mockSanitizePath,
    stat: mockStat,
    readFile: mockReadFile,
  });
  const req = new Request("http://localhost/public/foo.js");
  const url = new URL(req.url);
  const res = await handler.handle(url, req);
  expect(res.status).toBe(200);
  const body = new Uint8Array(await res.arrayBuffer());
  expect(body).toEqual(mockFile);
});

test("StaticFileHandler returns 404 if not found", async () => {
  const handler = new StaticFileHandler("/mock", {
    stat: () => { throw new Error("not found"); },
  });
  const req = new Request("http://localhost/public/missing.js");
  const url = new URL(req.url);
  const res = await handler.handle(url, req);
  expect(res.status).toBe(404);
});

test("StaticFileHandler returns 304 if not modified (ETag)", async () => {
  const handler = new StaticFileHandler("/mock", {
    getContentType: mockGetContentType,
    sanitizePath: mockSanitizePath,
    stat: mockStat,
    readFile: mockReadFile,
  });
  const etag = `W/"3-${mockFileInfo.mtime!.getTime()}"`;
  const req = new Request("http://localhost/public/foo.js", {
    headers: new Headers({ "if-none-match": etag })
  });
  const url = new URL(req.url);
  const res = await handler.handle(url, req);
  expect(res.status).toBe(304);
});

test("StaticFileHandler returns 404 if path is directory", async () => {
  const dirInfo = { ...mockFileInfo, isFile: () => false } as Stats;
  const handler = new StaticFileHandler("/mock", {
    stat: async (_path: string) => dirInfo,
  });
  const req = new Request("http://localhost/public/dir/");
  const url = new URL(req.url);
  const res = await handler.handle(url, req);
  expect(res.status).toBe(404);
});

test("StaticFileHandler returns 404 if sanitizePath throws", async () => {
  const handler = new StaticFileHandler("/mock", {
    sanitizePath: () => { throw new Error("sanitize fail"); }
  });
  const req = new Request("http://localhost/public/foo.js");
  const url = new URL(req.url);
  const res = await handler.handle(url, req);
  expect(res.status).toBe(404);
});

test("StaticFileHandler returns 404 if getContentType throws", async () => {
  const handler = new StaticFileHandler("/mock", {
    getContentType: () => { throw new Error("content type fail"); },
    sanitizePath: mockSanitizePath,
    stat: mockStat,
    readFile: mockReadFile,
  });
  const req = new Request("http://localhost/public/foo.js");
  const url = new URL(req.url);
  const res = await handler.handle(url, req);
  expect(res.status).toBe(404);
});

test("StaticFileHandler returns 304 if not modified (If-Modified-Since)", async () => {
  const handler = new StaticFileHandler("/mock", {
    getContentType: mockGetContentType,
    sanitizePath: mockSanitizePath,
    stat: mockStat,
    readFile: mockReadFile,
  });
  const lastModified = mockFileInfo.mtime!.toUTCString();
  const req = new Request("http://localhost/public/foo.js", {
    headers: new Headers({ "if-modified-since": lastModified })
  });
  const url = new URL(req.url);
  const res = await handler.handle(url, req);
  expect(res.status).toBe(304);
});

test("StaticFileHandler sets correct response headers", async () => {
  const handler = new StaticFileHandler("/mock", {
    getContentType: mockGetContentType,
    sanitizePath: mockSanitizePath,
    stat: mockStat,
    readFile: mockReadFile,
  });
  const req = new Request("http://localhost/public/foo.js");
  const url = new URL(req.url);
  const res = await handler.handle(url, req);
  const headers = res.headers;
  expect(headers.get("content-type")).toBe("text/javascript; charset=UTF-8");
  expect(headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  expect(headers.get("x-content-type-options")).toBe("nosniff");
  expect(headers.get("etag")).toBe(`W/"3-${mockFileInfo.mtime!.getTime()}"`);
  expect(headers.get("last-modified")).toBe(mockFileInfo.mtime!.toUTCString());
});

test("StaticFileHandler returns 'Not found' body for 404", async () => {
  const handler = new StaticFileHandler("/mock", {
    stat: () => { throw new Error("not found"); },
  });
  const req = new Request("http://localhost/public/missing.js");
  const url = new URL(req.url);
  const res = await handler.handle(url, req);
  expect(res.status).toBe(404);
  expect(await res.text()).toBe("Not found");
});
