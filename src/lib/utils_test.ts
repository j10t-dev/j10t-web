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
