import { getContentType } from "./utils.ts";
import { sanitizePath } from "./utils.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test("getContentType returns correct MIME types", () => {
  assertEquals(getContentType("foo.js"), "application/javascript");
  assertEquals(getContentType("foo.css"), "text/css");
  assertEquals(getContentType("foo.svg"), "image/svg+xml");
  assertEquals(getContentType("foo.ico"), "image/x-icon");
  assertEquals(getContentType("foo.json"), "application/json");
  assertEquals(getContentType("foo.unknown"), "application/octet-stream");
});

Deno.test("sanitizePath allows safe paths", () => {
  const base = "/safe/base";
  const result = sanitizePath(base, "foo/bar.txt");
  if (!result.startsWith(base)) throw new Error("Path not within base");
});

Deno.test("sanitizePath blocks directory traversal", () => {
  const base = "/safe/base";
  let threw = false;
  try {
    sanitizePath(base, "../../etc/passwd");
  } catch (e) {
    threw = true;
  }
  if (!threw) throw new Error("Did not block traversal");
});
