import { getContentType } from "./utils.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";

Deno.test("getContentType returns correct MIME types", () => {
  assertEquals(getContentType("foo.js"), "application/javascript");
  assertEquals(getContentType("foo.css"), "text/css");
  assertEquals(getContentType("foo.svg"), "image/svg+xml");
  assertEquals(getContentType("foo.ico"), "image/x-icon");
  assertEquals(getContentType("foo.json"), "application/json");
  assertEquals(getContentType("foo.unknown"), "application/octet-stream");
}); 