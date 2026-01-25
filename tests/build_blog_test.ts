import { test, expect } from "bun:test";
import { access } from "node:fs/promises";
import { buildPosts, FrontmatterSchema } from "../build/build-blog";
import {
  BlogTestHelpers,
  BlogTestCleanup,
  BlogTestData,
  TEST_PATHS
} from "./helpers/blog_test_helpers";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test("Build Blog - Process markdown with frontmatter", async () => {
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
  expect(await exists(`${TEST_PATHS.generatedPosts}/test-post.ts`)).toBe(true);
  
  // Import and validate the generated content
  const module = await BlogTestHelpers.importGeneratedPost("test-post");
  
  expect(module.post.title).toBe("Test Post");
  expect(module.post.slug).toBe("test-post");
  expect(module.post.date instanceof Date).toBe(true);
  expect(module.post.html).toContain("<h1");
  expect(module.post.html).toContain("My Test Post");
  expect(module.post.html).toContain("<strong>test</strong>");
  expect(module.post.html).toContain("<li>Item 1</li>");
  expect(module.post.html).toContain("<code");
  
  await BlogTestCleanup.cleanupAll();
});


test("Build Blog - Handle special characters in content", async () => {
  await BlogTestCleanup.cleanupAll();
  
  // Create markdown with potentially problematic characters
  const markdownContent = BlogTestData.specialCharsMarkdown();

  await BlogTestHelpers.createMarkdownContent("special-chars.md", markdownContent);
  
  // Use the actual buildPosts function
  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);
  
  // Check that the TypeScript file was generated and is valid
  expect(await exists(`${TEST_PATHS.generatedPosts}/special-chars.ts`)).toBe(true);
  
  // The important part: the file should be valid TypeScript and importable
  const module = await BlogTestHelpers.importGeneratedPost("special-chars");
  
  expect(module.post.title).toBe("Special Characters & Quotes");
  expect(module.post.slug).toBe("special-chars");
  // The content should be properly handled - marked escapes HTML entities
  expect(module.post.html).toContain("&amp;"); // Ampersands should be escaped
  expect(module.post.html).toContain("Double quotes"); // Content should be preserved
  // Note: marked doesn't strip script tags - sanitization should be done separately if needed
  // This is expected behavior for a markdown renderer
  expect(module.post.html.includes("<script>")).toBe(true);
  
  await BlogTestCleanup.cleanupAll();
});

test("Build Blog - Empty content directory", async () => {
  await BlogTestCleanup.cleanupAll();
  
  // Create empty content directory
  const { mkdir, readdir } = await import("node:fs/promises");
  await mkdir(TEST_PATHS.content, { recursive: true });
  
  // Use the actual buildPosts function
  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);
  
  // Should create empty posts directory
  expect(await exists(TEST_PATHS.generatedPosts)).toBe(true);
  
  // Directory should be empty
  const entries = await readdir(TEST_PATHS.generatedPosts);
  expect(entries.length).toBe(0);
  
  await BlogTestCleanup.cleanupAll();
});


test("Build Blog - Multiple posts processing", async () => {
  await BlogTestCleanup.cleanupAll();

  const posts = [
    { filename: "first.md", content: BlogTestData.markdownWithFrontmatter("First Post", "2024-01-01", "# First Post\nContent of first post.") },
    { filename: "second.md", content: BlogTestData.markdownWithFrontmatter("Second Post", "2024-06-15", "# Second Post\nContent of second post.") },
    { filename: "third.md", content: BlogTestData.markdownWithFrontmatter("Third Post", "2024-12-31", "# Third Post\nContent of third post.") }
  ];

  await BlogTestHelpers.createMarkdownFiles(posts);
  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);

  expect(await exists(`${TEST_PATHS.generatedPosts}/first.ts`)).toBe(true);
  expect(await exists(`${TEST_PATHS.generatedPosts}/second.ts`)).toBe(true);
  expect(await exists(`${TEST_PATHS.generatedPosts}/third.ts`)).toBe(true);

  const firstModule = await BlogTestHelpers.importGeneratedPost("first");
  const secondModule = await BlogTestHelpers.importGeneratedPost("second");
  const thirdModule = await BlogTestHelpers.importGeneratedPost("third");

  expect(firstModule.post.title).toBe("First Post");
  expect(firstModule.post.date.toISOString().split('T')[0]).toBe("2024-01-01");

  expect(secondModule.post.title).toBe("Second Post");
  expect(secondModule.post.date.toISOString().split('T')[0]).toBe("2024-06-15");

  expect(thirdModule.post.title).toBe("Third Post");
  expect(thirdModule.post.slug).toBe("third");

  await BlogTestCleanup.cleanupAll();
});

test("FrontmatterSchema - Rejects string date", () => {
  const validFrontmatter = {
    title: "My Blog Post",
    date: "2024-08-30"
  };

  const result = FrontmatterSchema.safeParse(validFrontmatter);
  expect(result.success).toBe(false);
});

test("FrontmatterSchema - Validates frontmatter with Date object", () => {
  const validFrontmatter = {
    title: "My Blog Post",
    date: new Date("2024-08-30")
  };

  const result = FrontmatterSchema.safeParse(validFrontmatter);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.title).toBe("My Blog Post");
    expect(result.data.date instanceof Date).toBe(true);
  }
});

test("FrontmatterSchema - Rejects missing title", () => {
  const frontmatter = {
    date: new Date("2024-08-30")
  };

  const result = FrontmatterSchema.safeParse(frontmatter);
  expect(result.success).toBe(false);
});

test("FrontmatterSchema - Rejects missing date", () => {
  const frontmatter = {
    title: "Only Title"
  };

  const result = FrontmatterSchema.safeParse(frontmatter);
  expect(result.success).toBe(false);
});

test("FrontmatterSchema - Rejects empty frontmatter", () => {
  const minimalFrontmatter = {};

  const result = FrontmatterSchema.safeParse(minimalFrontmatter);
  expect(result.success).toBe(false);
});

test("FrontmatterSchema - Rejects invalid title type", () => {
  const invalidFrontmatter = {
    title: 123,
    date: new Date("2024-08-30")
  };

  const result = FrontmatterSchema.safeParse(invalidFrontmatter);
  expect(result.success).toBe(false);
});

test("FrontmatterSchema - Rejects non-date types", () => {
  const testCases = [
    { title: "Test", date: "2024-08-30" },
    { title: "Test", date: 1234567890 },
    { title: "Test", date: true },
  ];

  for (const testCase of testCases) {
    const result = FrontmatterSchema.safeParse(testCase);
    expect(result.success).toBe(false);
  }
});

test("FrontmatterSchema - Allows additional properties", () => {
  const frontmatterWithExtras = {
    title: "Test",
    date: new Date("2024-08-30"),
    author: "John Doe",
    tags: ["test", "blog"]
  };

  const result = FrontmatterSchema.safeParse(frontmatterWithExtras);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.title).toBe("Test");
    expect((result.data as any).author).toBe("John Doe");
  }
});

test("Build Blog - Skips draft posts", async () => {
  await BlogTestCleanup.cleanupAll();

  const publishedPost = BlogTestData.markdownWithFrontmatter(
    "Published Post",
    "2024-08-01",
    "# Published\nThis should be built."
  );

  const draftPost = `---
title: Draft Post
date: 2024-08-02
draft: true
---

# Draft
This should NOT be built.`;

  await BlogTestHelpers.createMarkdownFiles([
    { filename: "published.md", content: publishedPost },
    { filename: "draft.md", content: draftPost },
  ]);

  await buildPosts(TEST_PATHS.content, TEST_PATHS.generatedPosts);

  // Published post should exist
  expect(await exists(`${TEST_PATHS.generatedPosts}/published.ts`)).toBe(true);

  // Draft post should NOT exist
  expect(await exists(`${TEST_PATHS.generatedPosts}/draft.ts`)).toBe(false);

  await BlogTestCleanup.cleanupAll();
});