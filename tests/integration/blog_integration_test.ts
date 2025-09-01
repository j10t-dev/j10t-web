import { assertEquals, assertStringIncludes, assert } from "@std/assert";
import { Router } from "../../routes/router.ts";
import { 
  BlogTestHelpers, 
  BlogTestCleanup, 
  BlogTestData, 
  waitForPostsToLoad,
  TEST_PATHS
} from "../helpers/blog_test_helpers.ts";

Deno.test("Blog Integration - End-to-end blog index", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  // Create test posts directly in the real posts directory
  await BlogTestHelpers.createPosts([
    { slug: "first-post", title: "First Test Post", date: "2024-08-28", html: "<h1>First Post</h1><p>This is the first test post for integration testing.</p>" },
    { slug: "second-post", title: "Second Test Post", date: "2024-08-29", html: "<h1>Second Post</h1><p>This is the second test post.</p>" }
  ]);
  
  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });
  
  // Wait for blog handler to load posts
  await waitForPostsToLoad();
  
  const request = new Request("http://localhost:8000/blog/");
  const response = await router.handle(request);
  
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  
  const html = await response.text();
  
  // Should contain both test posts
  assertStringIncludes(html, "First Test Post");
  assertStringIncludes(html, "Second Test Post");
  assertStringIncludes(html, "2024-08-28");
  assertStringIncludes(html, "2024-08-29");
  assertStringIncludes(html, "/blog/first-post");
  assertStringIncludes(html, "/blog/second-post");
  
  // Cleanup
  await BlogTestCleanup.cleanupEverything();
});

Deno.test("Blog Integration - End-to-end individual post", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  await BlogTestHelpers.createPost("first-post", {
    title: "First Test Post",
    date: "2024-08-28",
    html: "<h1>First Post</h1><p>This is the first test post for <strong>integration</strong> testing.</p>"
  });
  
  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });
  
  // Wait for blog handler to load posts
  await waitForPostsToLoad();
  
  const request = new Request("http://localhost:8000/blog/first-post");
  const response = await router.handle(request);
  
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  
  const html = await response.text();
  
  // Should contain the post content
  assertStringIncludes(html, "First Test Post");
  assertStringIncludes(html, "2024-08-28");
  assertStringIncludes(html, "This is the first test post");
  assertStringIncludes(html, "integration"); // The word should be there even if not in <strong> tags
  assertStringIncludes(html, "← Back to Blog");
  
  await BlogTestCleanup.cleanupEverything();
});

Deno.test("Blog Integration - Router handles blog routes correctly", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  await BlogTestHelpers.createPosts([
    { slug: "first-post", title: "First Test Post", date: "2024-08-28", html: "<h1>First Post</h1>" },
    { slug: "second-post", title: "Second Test Post", date: "2024-08-29", html: "<h1>Second Post</h1>" }
  ]);
  
  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });
  
  // Wait for blog handler to load posts
  await waitForPostsToLoad();
  
  // Test different blog URL variations
  const testUrls = [
    "http://localhost:8000/blog",
    "http://localhost:8000/blog/",
    "http://localhost:8000/blog/first-post",
    "http://localhost:8000/blog/second-post"
  ];
  
  for (const url of testUrls) {
    const request = new Request(url);
    const response = await router.handle(request);
    
    assertEquals(response.status, 200, `URL should return 200: ${url}`);
    assertEquals(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  }
  
  await BlogTestCleanup.cleanupEverything();
});

Deno.test("Blog Integration - Non-existent post returns 404", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  await BlogTestHelpers.createPost("existing-post", {
    title: "Existing Post",
    date: "2024-08-28",
    html: "<h1>Exists</h1>"
  });
  
  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });
  
  // Wait for blog handler to load posts
  await waitForPostsToLoad();
  
  const request = new Request("http://localhost:8000/blog/non-existent-post");
  const response = await router.handle(request);
  
  assertEquals(response.status, 404);
  assertEquals(await response.text(), "Post not found");
  
  await BlogTestCleanup.cleanupEverything();
});

Deno.test("Blog Integration - Empty blog works correctly", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  // Create empty posts directory
  await Deno.mkdir("./posts", { recursive: true });
  
  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });
  
  // Wait for blog handler to load (empty) posts
  await waitForPostsToLoad();
  
  const request = new Request("http://localhost:8000/blog/");
  const response = await router.handle(request);
  
  assertEquals(response.status, 200);
  const html = await response.text();
  assertStringIncludes(html, "No posts yet");
  
  await BlogTestCleanup.cleanupEverything();
});

Deno.test("Blog Integration - Posts sorted by date (newest first)", async () => {
  await BlogTestCleanup.cleanupEverything();
  await BlogTestHelpers.setupTemplates();
  
  // Create posts with specific dates to test sorting using test data helper
  await BlogTestHelpers.createPosts(BlogTestData.sortingTestPosts());

  const router = new Router({
    publicDir: "./public",
    eta: BlogTestHelpers.createTestEta(),
    postsDir: TEST_PATHS.posts
  });
  
  await waitForPostsToLoad();
  
  const request = new Request("http://localhost:8000/blog/");
  const response = await router.handle(request);
  
  const html = await response.text();
  
  // Find the positions of each post title in the HTML
  const newPostIndex = html.indexOf("New Post");
  const middlePostIndex = html.indexOf("Middle Post");
  const oldPostIndex = html.indexOf("Old Post");
  
  // All posts should be present
  assert(newPostIndex > -1, "New Post should be in the HTML");
  assert(middlePostIndex > -1, "Middle Post should be in the HTML");
  assert(oldPostIndex > -1, "Old Post should be in the HTML");
  
  // Posts should be in reverse chronological order (newest first)
  assert(newPostIndex < middlePostIndex, "New Post should come before Middle Post");
  assert(middlePostIndex < oldPostIndex, "Middle Post should come before Old Post");
  
  await BlogTestCleanup.cleanupEverything();
});