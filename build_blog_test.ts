import { assertEquals, assertStringIncludes, assert } from "@std/assert";
import { exists } from "@std/fs";
import { buildPosts, FrontmatterSchema } from "./build-blog.ts";
import { 
  BlogTestHelpers, 
  BlogTestCleanup, 
  BlogTestData, 
  TEST_PATHS 
} from "./tests/helpers/blog_test_helpers.ts";

Deno.test("Build Blog - Process markdown with frontmatter", async () => {
  await BlogTestCleanup.cleanupAll();
  
  // Create test markdown file with frontmatter
  const markdownContent = BlogTestData.markdownWithFrontmatter(
    "Test Post",
    "2024-08-29",
    `# My Test Post

This is a **test** post with some content.

## Features

- Item 1
- Item 2

\`\`\`typescript
const hello = "world";
\`\`\``
  );

  await BlogTestHelpers.createMarkdownContent("test-post.md", markdownContent);
  
  // Use the actual buildPosts function with test directories
  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);
  
  // Check that the TypeScript file was generated
  assert(await exists(`${TEST_PATHS.generatedPosts}/test-post.ts`));
  
  // Import and validate the generated content
  const module = await BlogTestHelpers.importGeneratedPost("test-post");
  
  assertEquals(module.post.title, "Test Post");
  assertEquals(module.post.slug, "test-post");
  assert(module.post.date instanceof Date, "Date should be a Date object");
  assertStringIncludes(module.post.html, "<h1");
  assertStringIncludes(module.post.html, "My Test Post");
  assertStringIncludes(module.post.html, "<strong>test</strong>");
  assertStringIncludes(module.post.html, "<li>Item 1</li>");
  assertStringIncludes(module.post.html, "<code");
  
  await BlogTestCleanup.cleanupAll();
});


Deno.test("Build Blog - Handle special characters in content", async () => {
  await BlogTestCleanup.cleanupAll();
  
  // Create markdown with potentially problematic characters
  const markdownContent = BlogTestData.specialCharsMarkdown();

  await BlogTestHelpers.createMarkdownContent("special-chars.md", markdownContent);
  
  // Use the actual buildPosts function
  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);
  
  // Check that the TypeScript file was generated and is valid
  assert(await exists(`${TEST_PATHS.generatedPosts}/special-chars.ts`));
  
  // The important part: the file should be valid TypeScript and importable
  const module = await BlogTestHelpers.importGeneratedPost("special-chars");
  
  assertEquals(module.post.title, "Special Characters & Quotes");
  assertEquals(module.post.slug, "special-chars");
  // The content should be properly handled - GFM renderer handles XSS protection
  assertStringIncludes(module.post.html, "&amp;"); // Ampersands should be escaped
  assertStringIncludes(module.post.html, "Double quotes"); // Content should be preserved
  // Script tags should be stripped/escaped for security
  assert(!module.post.html.includes("<script>"), "Script tags should be removed/escaped");
  
  await BlogTestCleanup.cleanupAll();
});

Deno.test("Build Blog - Empty content directory", async () => {
  await BlogTestCleanup.cleanupAll();
  
  // Create empty content directory
  await Deno.mkdir(TEST_PATHS.content, { recursive: true });
  
  // Use the actual buildPosts function
  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);
  
  // Should create empty posts directory
  assert(await exists(TEST_PATHS.generatedPosts));
  
  // Directory should be empty
  const entries = [];
  for await (const entry of Deno.readDir(TEST_PATHS.generatedPosts)) {
    entries.push(entry);
  }
  assertEquals(entries.length, 0);
  
  await BlogTestCleanup.cleanupAll();
});


Deno.test("Build Blog - Multiple posts processing", async () => {
  await BlogTestCleanup.cleanupAll();

  const posts = [
    { filename: "first.md", content: BlogTestData.markdownWithFrontmatter("First Post", "2024-01-01", "# First Post\nContent of first post.") },
    { filename: "second.md", content: BlogTestData.markdownWithFrontmatter("Second Post", "2024-06-15", "# Second Post\nContent of second post.") },
    { filename: "third.md", content: BlogTestData.markdownWithFrontmatter("Third Post", "2024-12-31", "# Third Post\nContent of third post.") }
  ];

  await BlogTestHelpers.createMarkdownFiles(posts);
  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);

  assert(await exists(`${TEST_PATHS.generatedPosts}/first.ts`));
  assert(await exists(`${TEST_PATHS.generatedPosts}/second.ts`));
  assert(await exists(`${TEST_PATHS.generatedPosts}/third.ts`));

  const firstModule = await BlogTestHelpers.importGeneratedPost("first");
  const secondModule = await BlogTestHelpers.importGeneratedPost("second");
  const thirdModule = await BlogTestHelpers.importGeneratedPost("third");

  assertEquals(firstModule.post.title, "First Post");
  assertEquals(firstModule.post.date.toISOString().split('T')[0], "2024-01-01");

  assertEquals(secondModule.post.title, "Second Post");
  assertEquals(secondModule.post.date.toISOString().split('T')[0], "2024-06-15");

  assertEquals(thirdModule.post.title, "Third Post");
  assertEquals(thirdModule.post.slug, "third");

  await BlogTestCleanup.cleanupAll();
});

Deno.test("FrontmatterSchema - Rejects string date", () => {
  const validFrontmatter = {
    title: "My Blog Post",
    date: "2024-08-30"
  };

  const result = FrontmatterSchema.safeParse(validFrontmatter);
  assertEquals(result.success, false);
});

Deno.test("FrontmatterSchema - Validates frontmatter with Date object", () => {
  const validFrontmatter = {
    title: "My Blog Post",
    date: new Date("2024-08-30")
  };

  const result = FrontmatterSchema.safeParse(validFrontmatter);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.title, "My Blog Post");
    assert(result.data.date instanceof Date);
  }
});

Deno.test("FrontmatterSchema - Rejects missing title", () => {
  const frontmatter = {
    date: new Date("2024-08-30")
  };

  const result = FrontmatterSchema.safeParse(frontmatter);
  assertEquals(result.success, false);
});

Deno.test("FrontmatterSchema - Rejects missing date", () => {
  const frontmatter = {
    title: "Only Title"
  };

  const result = FrontmatterSchema.safeParse(frontmatter);
  assertEquals(result.success, false);
});

Deno.test("FrontmatterSchema - Rejects empty frontmatter", () => {
  const minimalFrontmatter = {};

  const result = FrontmatterSchema.safeParse(minimalFrontmatter);
  assertEquals(result.success, false);
});

Deno.test("FrontmatterSchema - Rejects invalid title type", () => {
  const invalidFrontmatter = {
    title: 123,
    date: new Date("2024-08-30")
  };

  const result = FrontmatterSchema.safeParse(invalidFrontmatter);
  assertEquals(result.success, false);
});

Deno.test("FrontmatterSchema - Rejects non-date types", () => {
  const testCases = [
    { title: "Test", date: "2024-08-30" },
    { title: "Test", date: 1234567890 },
    { title: "Test", date: true },
  ];

  for (const testCase of testCases) {
    const result = FrontmatterSchema.safeParse(testCase);
    assertEquals(result.success, false);
  }
});

Deno.test("FrontmatterSchema - Allows additional properties", () => {
  const frontmatterWithExtras = {
    title: "Test",
    date: new Date("2024-08-30"),
    author: "John Doe",
    tags: ["test", "blog"]
  };

  const result = FrontmatterSchema.safeParse(frontmatterWithExtras);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.title, "Test");
    assertEquals((result.data as any).author, "John Doe");
  }
});