import { assertEquals, assertStringIncludes, assert } from "@std/assert";
import { exists } from "@std/fs";
import { buildPosts } from "./build-blog.ts";
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
  // Date should be valid format (actual parsing may vary)
  assert(module.post.date.match(/^\d{4}-\d{2}-\d{2}$/), `Date should be in YYYY-MM-DD format, got: ${module.post.date}`);
  assertStringIncludes(module.post.html, "<h1");
  assertStringIncludes(module.post.html, "My Test Post");
  assertStringIncludes(module.post.html, "<strong>test</strong>");
  assertStringIncludes(module.post.html, "<li>Item 1</li>");
  assertStringIncludes(module.post.html, "<code");
  
  await BlogTestCleanup.cleanupAll();
});

Deno.test("Build Blog - Process markdown without frontmatter", async () => {
  await BlogTestCleanup.cleanupAll();
  
  // Create test markdown file without frontmatter
  const markdownContent = BlogTestData.markdownPlain(`# Simple Post

This is a simple post without frontmatter.

It should still work fine.`);

  await BlogTestHelpers.createMarkdownContent("simple-post.md", markdownContent);
  
  // Use the actual buildPosts function
  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);
  
  // Check that the TypeScript file was generated
  assert(await exists(`${TEST_PATHS.generatedPosts}/simple-post.ts`));
  
  // Import and validate the generated content
  const module = await BlogTestHelpers.importGeneratedPost("simple-post");
  
  assertEquals(module.post.title, "Simple Post"); // Should be generated from filename
  assertEquals(module.post.slug, "simple-post");
  assert(module.post.date.match(/^\d{4}-\d{2}-\d{2}$/), "Date should be valid format");
  assertStringIncludes(module.post.html, "<h1");
  assertStringIncludes(module.post.html, "Simple Post");
  assertStringIncludes(module.post.html, "simple post without frontmatter");
  
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

Deno.test("Build Blog - Invalid frontmatter handling", async () => {
  await BlogTestCleanup.cleanupAll();
  
  // Create markdown with malformed frontmatter
  const markdownContent = BlogTestData.brokenFrontmatterMarkdown();

  await BlogTestHelpers.createMarkdownContent("broken-frontmatter.md", markdownContent);
  
  // Use the actual buildPosts function
  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);
  
  // Should fall back to filename-based title generation
  assert(await exists(`${TEST_PATHS.generatedPosts}/broken-frontmatter.ts`));
  
  const module = await BlogTestHelpers.importGeneratedPost("broken-frontmatter");
  
  assertEquals(module.post.title, "Broken Frontmatter"); // From filename
  assertEquals(module.post.slug, "broken-frontmatter");
  assert(module.post.date.match(/^\d{4}-\d{2}-\d{2}$/), "Date should be valid format");
  // Should include the malformed frontmatter as content since parsing failed
  assertStringIncludes(module.post.html, "title:");
  
  await BlogTestCleanup.cleanupAll();
});

Deno.test("Build Blog - Multiple posts processing", async () => {
  await BlogTestCleanup.cleanupAll();
  
  // Create multiple test posts using helper
  const posts = [
    { filename: "first.md", content: BlogTestData.markdownWithFrontmatter("First Post", "2024-01-01", "# First Post\nContent of first post.") },
    { filename: "second.md", content: BlogTestData.markdownWithFrontmatter("Second Post", "2024-06-15", "# Second Post\nContent of second post.") },
    { filename: "third.md", content: BlogTestData.markdownPlain("# Third Post Without Frontmatter\nContent of third post.") }
  ];

  await BlogTestHelpers.createMarkdownFiles(posts);
  
  // Use the actual buildPosts function
  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);
  
  // Check that all TypeScript files were generated
  assert(await exists(`${TEST_PATHS.generatedPosts}/first.ts`));
  assert(await exists(`${TEST_PATHS.generatedPosts}/second.ts`));
  assert(await exists(`${TEST_PATHS.generatedPosts}/third.ts`));
  
  // Verify content of each post
  const firstModule = await BlogTestHelpers.importGeneratedPost("first");
  const secondModule = await BlogTestHelpers.importGeneratedPost("second");
  const thirdModule = await BlogTestHelpers.importGeneratedPost("third");
  
  assertEquals(firstModule.post.title, "First Post");
  assertEquals(firstModule.post.date, "2024-01-01");
  
  assertEquals(secondModule.post.title, "Second Post");
  assertEquals(secondModule.post.date, "2024-06-15");
  
  assertEquals(thirdModule.post.title, "Third"); // Generated from filename
  assertEquals(thirdModule.post.slug, "third");
  
  await BlogTestCleanup.cleanupAll();
});