import { test, expect } from "bun:test";
import { Router } from "../../src/routes/router";
import {
  BlogTestHelpers,
  BlogTestCleanup,
  BlogTestData,
  TEST_PATHS,
  waitForCondition
} from "../helpers/blog_test_helpers";

test("Blog Integration - End-to-end blog index", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  await BlogTestHelpers.createPosts([
    { slug: "first-post", title: "First Test Post", date: new Date("2024-08-28"), html: "<h1>First Post</h1><p>This is the first test post for integration testing.</p>" },
    { slug: "second-post", title: "Second Test Post", date: new Date("2024-08-29"), html: "<h1>Second Post</h1><p>This is the second test post.</p>" }
  ]);
  
  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });

  await waitForCondition(() => router.blogHandler.getAllPosts().length >= 2);

  const request = new Request("http://localhost:8000/blog/");
  const response = await router.handle(request);

  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");

  const html = await response.text();

  expect(html).toContain("First Test Post");
  expect(html).toContain("Second Test Post");
  expect(html).toContain("2024-08-28");
  expect(html).toContain("2024-08-29");
  expect(html).toContain("/blog/first-post");
  expect(html).toContain("/blog/second-post");
  
  await BlogTestCleanup.cleanupEverything();
});

test("Blog Integration - End-to-end individual post", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  await BlogTestHelpers.createPost("first-post", {
    title: "First Test Post",
    date: new Date("2024-08-28"),
    html: "<h1>First Post</h1><p>This is the first test post for <strong>integration</strong> testing.</p>"
  });
  
  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });

  await waitForCondition(() => router.blogHandler.getAllPosts().length >= 1);

  const request = new Request("http://localhost:8000/blog/first-post");
  const response = await router.handle(request);
  
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  
  const html = await response.text();
  
  expect(html).toContain("First Test Post");
  expect(html).toContain("2024-08-28");
  expect(html).toContain("This is the first test post");
  expect(html).toContain("integration"); 
  expect(html).toContain("← Back to Blog");
  
  await BlogTestCleanup.cleanupEverything();
});

test("Blog Integration - Router handles blog routes correctly", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  await BlogTestHelpers.createPosts([
    { slug: "first-post", title: "First Test Post", date: new Date("2024-08-28"), html: "<h1>First Post</h1>" },
    { slug: "second-post", title: "Second Test Post", date: new Date("2024-08-29"), html: "<h1>Second Post</h1>" }
  ]);
  
  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });

  await waitForCondition(() => router.blogHandler.getAllPosts().length >= 2);

  const testUrls = [
    "http://localhost:8000/blog",
    "http://localhost:8000/blog/",
    "http://localhost:8000/blog/first-post",
    "http://localhost:8000/blog/second-post"
  ];
  
  for (const url of testUrls) {
    const request = new Request(url);
    const response = await router.handle(request);
    
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  }
  
  await BlogTestCleanup.cleanupEverything();
});

test("Blog Integration - Non-existent post returns 404", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  await BlogTestHelpers.createPost("existing-post", {
    title: "Existing Post",
    date: new Date("2024-08-28"),
    html: "<h1>Exists</h1>"
  });
  
  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });

  await waitForCondition(() => router.blogHandler.getAllPosts().length >= 1);

  const request = new Request("http://localhost:8000/blog/non-existent-post");
  const response = await router.handle(request);
  
  expect(response.status).toBe(404);
  expect(await response.text()).toBe("Post not found");
  
  await BlogTestCleanup.cleanupEverything();
});

test("Blog Integration - Empty blog works correctly", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  await import("node:fs/promises").then(m => m.mkdir("./posts", { recursive: true }));
  
  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });

  await waitForCondition(() => router.blogHandler.getAllPosts().length >= 0);

  const request = new Request("http://localhost:8000/blog/");
  const response = await router.handle(request);

  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain("No posts yet");
  
  await BlogTestCleanup.cleanupEverything();
});

test("Blog Integration - Posts sorted by date (newest first)", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  await BlogTestHelpers.createPosts(BlogTestData.sortingTestPosts());

  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });

  await waitForCondition(() => router.blogHandler.getAllPosts().length >= 3);

  const request = new Request("http://localhost:8000/blog/");
  const response = await router.handle(request);

  const html = await response.text();

  const newPostIndex = html.indexOf("New Post");
  const middlePostIndex = html.indexOf("Middle Post");
  const oldPostIndex = html.indexOf("Old Post");
  
  expect(newPostIndex > -1).toBe(true);
  expect(middlePostIndex > -1).toBe(true);
  expect(oldPostIndex > -1).toBe(true);
  
  expect(newPostIndex < middlePostIndex).toBe(true);
  expect(middlePostIndex < oldPostIndex).toBe(true);
  
  await BlogTestCleanup.cleanupEverything();
});