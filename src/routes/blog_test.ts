import { test, expect } from "bun:test";
import { BlogHandler, BlogPost, BlogPostSchema } from "./blog";
import { Eta } from "eta";
import { BlogTestHelpers, BlogTestCleanup, BlogTestData, waitForCondition } from "../../tests/helpers/blog_test_helpers";

// Mock Eta instance for testing
const mockEta = new Eta({
  views: "./views",
  cache: false
});

import { TEST_PATHS } from "../../tests/helpers/blog_test_helpers";

test("BlogHandler - Constructor and initialization", async () => {
  await BlogTestCleanup.cleanupPosts();

  // Should not throw even if posts directory is empty
  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);
  expect(typeof handler).toBe("object");
});

test("BlogHandler - Handle blog index route", async () => {
  await BlogTestCleanup.cleanupPosts();

  await BlogTestHelpers.createPost("test-first", { title: "First Post", date: new Date("2024-08-29") });
  await BlogTestHelpers.createPost("test-second", { title: "Second Post", date: new Date("2024-08-30") });

  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

  // Wait for posts to actually load
  await waitForCondition(() => handler.getAllPosts().length >= 2, 5000);

  const request = new Request("http://localhost:8000/blog/");
  const response = await handler.handle(request);

  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");

  await BlogTestCleanup.cleanupPosts();
});

test("BlogHandler - Handle individual blog post", async () => {
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

  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");

  await BlogTestCleanup.cleanupPosts();
});

test("BlogHandler - Handle non-existent post", async () => {
  await BlogTestCleanup.cleanupPosts();

  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

  const request = new Request("http://localhost:8000/blog/non-existent-post");
  const response = await handler.handle(request);

  expect(response.status).toBe(404);
  expect(await response.text()).toBe("Post not found");

  await BlogTestCleanup.cleanupPosts();
});

test("BlogHandler - Security: Reject malicious slug", async () => {
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

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid post identifier");
  }
});

test("BlogHandler - Security: Valid slugs should work", async () => {
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
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Post not found");
  }

  await BlogTestCleanup.cleanupPosts();
});

test("BlogHandler - Security: URL normalization prevents traversal", async () => {
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
    expect(response.status).toBe(200);
  }

  await BlogTestCleanup.cleanupPosts();
});

test("BlogHandler - Post sorting by date", async () => {
  await BlogTestCleanup.cleanupPosts();

  // Create posts with different dates using test data helper
  await BlogTestHelpers.createPosts(BlogTestData.sortingTestPosts());

  const handler = new BlogHandler(mockEta, TEST_PATHS.posts);

  // Wait for posts to load
  await waitForCondition(() => handler.getAllPosts().length >= 3, 5000);

  const request = new Request("http://localhost:8000/blog/");
  const response = await handler.handle(request);

  expect(response.status).toBe(200);
  const html = await response.text();

  // Find the positions of each post title in the HTML to verify sorting
  const newPostIndex = html.indexOf("New Post");
  const middlePostIndex = html.indexOf("Middle Post");
  const oldPostIndex = html.indexOf("Old Post");

  // All posts should be present in the HTML
  expect(newPostIndex > -1).toBe(true);
  expect(middlePostIndex > -1).toBe(true);
  expect(oldPostIndex > -1).toBe(true);

  // Posts should be in reverse chronological order (newest first)
  expect(newPostIndex < middlePostIndex).toBe(true);
  expect(middlePostIndex < oldPostIndex).toBe(true);

  await BlogTestCleanup.cleanupPosts();
});

test("BlogPostSchema - Validates valid blog post", () => {
  const validPost = {
    title: "Test Post",
    date: new Date("2024-08-30"),
    slug: "test-post",
    html: "<p>Test content</p>"
  };

  const result = BlogPostSchema.safeParse(validPost);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.title).toBe("Test Post");
    expect(result.data.date instanceof Date).toBe(true);
    expect(result.data.slug).toBe("test-post");
  }
});

test("BlogPostSchema - Rejects empty title", () => {
  const invalidPost = {
    title: "",
    date: new Date("2024-08-30"),
    slug: "test-post",
    html: "<p>Test content</p>"
  };

  const result = BlogPostSchema.safeParse(invalidPost);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0]!.message).toContain("empty");
  }
});

test("BlogPostSchema - Rejects invalid date format", () => {
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
    expect(result.success).toBe(false);
  }
});

test("BlogPostSchema - Rejects invalid slug format", () => {
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
    expect(result.success).toBe(false);
  }
});

test("BlogPostSchema - Accepts valid slug patterns", () => {
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
    expect(result.success).toBe(true);
  }
});

test("BlogPostSchema - Rejects empty HTML content", () => {
  const invalidPost = {
    title: "Test",
    date: new Date("2024-08-30"),
    slug: "test",
    html: ""
  };

  const result = BlogPostSchema.safeParse(invalidPost);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues[0]!.message).toContain("empty");
  }
});

test("BlogPostSchema - Rejects missing fields", () => {
  const missingFieldTests = [
    { date: new Date("2024-08-30"), slug: "test", html: "<p>Test</p>" }, // Missing title
    { title: "Test", slug: "test", html: "<p>Test</p>" },       // Missing date
    { title: "Test", date: new Date("2024-08-30"), html: "<p>Test</p>" }, // Missing slug
    { title: "Test", date: new Date("2024-08-30"), slug: "test" },        // Missing html
  ];

  for (const testCase of missingFieldTests) {
    const result = BlogPostSchema.safeParse(testCase);
    expect(result.success).toBe(false);
  }
});
