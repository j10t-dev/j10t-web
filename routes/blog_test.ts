import { assertEquals, assertStringIncludes, assertRejects, assert } from "@std/assert";
import { BlogHandler, BlogPost, BlogPostSchema } from "./blog.ts";
import { Eta } from "@eta-dev/eta";
import { BlogTestHelpers, BlogTestCleanup, BlogTestData, waitForCondition } from "../tests/helpers/blog_test_helpers.ts";

// Mock Eta instance for testing
const mockEta = new Eta({
  views: "./views",
  cache: false
});

import { TEST_PATHS } from "../tests/helpers/blog_test_helpers.ts";

Deno.test("BlogHandler - Constructor and initialization", async () => {
  await BlogTestCleanup.cleanupPosts();
  
  // Should not throw even if posts directory is empty
  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);
  assertEquals(typeof handler, "object");
});

Deno.test("BlogHandler - Handle blog index route", async () => {
  await BlogTestCleanup.cleanupPosts();

  await BlogTestHelpers.createPost("test-first", { title: "First Post", date: new Date("2024-08-29") });
  await BlogTestHelpers.createPost("test-second", { title: "Second Post", date: new Date("2024-08-30") });
  
  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

  // Wait for posts to actually load
  await waitForCondition(() => handler.getAllPosts().length >= 2, 5000);

  const request = new Request("http://localhost:8000/blog/");
  const response = await handler.handle(request);
  
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  
  await BlogTestCleanup.cleanupPosts();
});

Deno.test("BlogHandler - Handle individual blog post", async () => {
  await BlogTestCleanup.cleanupPosts();
  
  await BlogTestHelpers.createPost("test-individual", {
    title: "Individual Test Post",
    html: "<h1>Individual Content</h1>"
  });
  
  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

  // Wait for posts to load
  await waitForCondition(() => handler.getAllPosts().length >= 1, 5000);

  const request = new Request("http://localhost:8000/blog/test-individual");
  const response = await handler.handle(request);
  
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  
  await BlogTestCleanup.cleanupPosts();
});

Deno.test("BlogHandler - Handle non-existent post", async () => {
  await BlogTestCleanup.cleanupPosts();
  
  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);
  
  const request = new Request("http://localhost:8000/blog/non-existent-post");
  const response = await handler.handle(request);
  
  assertEquals(response.status, 404);
  assertEquals(await response.text(), "Post not found");
  
  await BlogTestCleanup.cleanupPosts();
});

Deno.test("BlogHandler - Security: Reject malicious slug", async () => {
  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);
  
  // Test various malicious slugs that should be rejected by our regex
  const maliciousSlugs = [
    "<script>alert(1)</script>",
    "test.config", // dots not allowed
    "test/admin", // slashes not allowed  
    "test admin", // spaces not allowed
    "test@admin", // special chars not allowed
    "test\x00admin" // null byte injection
  ];
  
  for (const slug of maliciousSlugs) {
    const request = new Request(`http://localhost:8000/blog/${encodeURIComponent(slug)}`);
    const response = await handler.handle(request);
    
    assertEquals(response.status, 400, `Should reject malicious slug: ${slug}`);
    assertEquals(await response.text(), "Invalid post identifier");
  }
});

Deno.test("BlogHandler - Security: Valid slugs should work", async () => {
  await BlogTestCleanup.cleanupPosts();
  
  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);
  
  // Test valid slug patterns
  const validSlugs = [
    "hello-world",
    "my_post_123",
    "POST-WITH-NUMBERS-2024",
    "simple",
    "under_score",
    "dash-case"
  ];
  
  for (const slug of validSlugs) {
    const request = new Request(`http://localhost:8000/blog/${slug}`);
    const response = await handler.handle(request);
    
    // Should return 404 for non-existent but valid slugs, not 400
    assertEquals(response.status, 404, `Valid slug should get 404, not 400: ${slug}`);
    assertEquals(await response.text(), "Post not found");
  }
  
  await BlogTestCleanup.cleanupPosts();
});

Deno.test("BlogHandler - Security: URL normalization prevents traversal", async () => {
  await BlogTestCleanup.cleanupPosts();
  
  // Create a test post that could be targeted
  await BlogTestHelpers.createPost("admin", { title: "Admin Post" });
  
  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

  // Wait for posts to load
  await waitForCondition(() => handler.getAllPosts().length >= 1, 5000);

  // These URLs get normalized by URL constructor to /blog/admin
  const traversalAttempts = [
    "http://localhost:8000/blog/test/../admin",
    "http://localhost:8000/blog/./admin",
    "http://localhost:8000/blog/../blog/admin"
  ];
  
  for (const url of traversalAttempts) {
    const request = new Request(url);
    const response = await handler.handle(request);
    
    // Should successfully find the admin post due to URL normalization
    assertEquals(response.status, 200, `URL normalization should resolve: ${url}`);
  }
  
  await BlogTestCleanup.cleanupPosts();
});

Deno.test("BlogHandler - Post sorting by date", async () => {
  await BlogTestCleanup.cleanupPosts();
  
  // Create posts with different dates using test data helper
  await BlogTestHelpers.createPosts(BlogTestData.sortingTestPosts());
  
  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

  // Wait for posts to load
  await waitForCondition(() => handler.getAllPosts().length >= 3, 5000);

  const request = new Request("http://localhost:8000/blog/");
  const response = await handler.handle(request);
  
  assertEquals(response.status, 200);
  const html = await response.text();
  
  // Find the positions of each post title in the HTML to verify sorting
  const newPostIndex = html.indexOf("New Post");
  const middlePostIndex = html.indexOf("Middle Post");
  const oldPostIndex = html.indexOf("Old Post");
  
  // All posts should be present in the HTML
  assert(newPostIndex > -1, "New Post should be in the HTML");
  assert(middlePostIndex > -1, "Middle Post should be in the HTML");
  assert(oldPostIndex > -1, "Old Post should be in the HTML");
  
  // Posts should be in reverse chronological order (newest first)
  assert(newPostIndex < middlePostIndex, "New Post (2024-12-31) should come before Middle Post (2024-06-15)");
  assert(middlePostIndex < oldPostIndex, "Middle Post (2024-06-15) should come before Old Post (2024-01-01)");

  await BlogTestCleanup.cleanupPosts();
});

Deno.test("BlogPostSchema - Validates valid blog post", () => {
  const validPost = {
    title: "Test Post",
    date: new Date("2024-08-30"),
    slug: "test-post",
    html: "<p>Test content</p>"
  };

  const result = BlogPostSchema.safeParse(validPost);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.title, "Test Post");
    assert(result.data.date instanceof Date);
    assertEquals(result.data.slug, "test-post");
  }
});

Deno.test("BlogPostSchema - Rejects empty title", () => {
  const invalidPost = {
    title: "",
    date: new Date("2024-08-30"),
    slug: "test-post",
    html: "<p>Test content</p>"
  };

  const result = BlogPostSchema.safeParse(invalidPost);
  assertEquals(result.success, false);
  if (!result.success) {
    assertStringIncludes(result.error.errors[0].message, "empty");
  }
});

Deno.test("BlogPostSchema - Rejects invalid date format", () => {
  const invalidDates = [
    "08-30-2024",      // Wrong format
    "2024/08/30",      // Wrong separator
    "2024-8-30",       // Missing leading zero
    "not a date",      // Not a date
  ];

  for (const date of invalidDates) {
    const invalidPost = {
      title: "Test",
      date,
      slug: "test",
      html: "<p>Test</p>"
    };

    const result = BlogPostSchema.safeParse(invalidPost);
    assertEquals(result.success, false, `Should reject date: ${date}`);
  }
});

Deno.test("BlogPostSchema - Rejects invalid slug format", () => {
  const invalidSlugs = [
    "test post",           // Spaces not allowed
    "test.post",          // Dots not allowed
    "test/post",          // Slashes not allowed
    "test@post",          // Special chars not allowed
    "<script>",           // HTML not allowed
    "",                   // Empty not allowed
  ];

  for (const slug of invalidSlugs) {
    const invalidPost = {
      title: "Test",
      date: new Date("2024-08-30"),
      slug,
      html: "<p>Test</p>"
    };

    const result = BlogPostSchema.safeParse(invalidPost);
    assertEquals(result.success, false, `Should reject slug: ${slug}`);
  }
});

Deno.test("BlogPostSchema - Accepts valid slug patterns", () => {
  const validSlugs = [
    "hello-world",
    "my_post_123",
    "POST-WITH-NUMBERS-2024",
    "simple",
    "under_score",
    "dash-case",
    "MixedCase-with_both",
  ];

  for (const slug of validSlugs) {
    const validPost = {
      title: "Test",
      date: new Date("2024-08-30"),
      slug,
      html: "<p>Test</p>"
    };

    const result = BlogPostSchema.safeParse(validPost);
    assertEquals(result.success, true, `Should accept slug: ${slug}`);
  }
});

Deno.test("BlogPostSchema - Rejects empty HTML content", () => {
  const invalidPost = {
    title: "Test",
    date: new Date("2024-08-30"),
    slug: "test",
    html: ""
  };

  const result = BlogPostSchema.safeParse(invalidPost);
  assertEquals(result.success, false);
  if (!result.success) {
    assertStringIncludes(result.error.errors[0].message, "empty");
  }
});

Deno.test("BlogPostSchema - Rejects missing fields", () => {
  const missingFieldTests = [
    { date: new Date("2024-08-30"), slug: "test", html: "<p>Test</p>" }, // Missing title
    { title: "Test", slug: "test", html: "<p>Test</p>" },       // Missing date
    { title: "Test", date: new Date("2024-08-30"), html: "<p>Test</p>" }, // Missing slug
    { title: "Test", date: new Date("2024-08-30"), slug: "test" },        // Missing html
  ];

  for (const testCase of missingFieldTests) {
    const result = BlogPostSchema.safeParse(testCase);
    assertEquals(result.success, false, `Should reject: ${JSON.stringify(testCase)}`);
  }
});