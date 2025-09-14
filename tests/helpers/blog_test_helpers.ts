/**
 * Shared utilities for blog testing
 * Provides common functionality for creating, managing, and cleaning up test posts and content
 */

import { BlogPost, BlogHandler } from "../../routes/blog.ts";
import { Eta } from "@eta-dev/eta";

// Default test post structure
export interface TestPostOptions {
  title?: string;
  date?: string;
  slug?: string;
  html?: string;
}

// Test directory paths - isolated from production directories
export const TEST_PATHS = {
  posts: "./test-posts-isolated",
  content: "./test-content", 
  generatedPosts: "./test-generated-posts",
  templates: "./test-views",
} as const;

/**
 * Post Management Utilities
 */
export class BlogTestHelpers {
  
  /**
   * Create a test blog post file in the posts directory
   */
  static async createPost(slug: string, options: TestPostOptions = {}): Promise<BlogPost> {
    const post: BlogPost = {
      title: options.title || "Test Post",
      date: options.date || "2024-08-29",
      slug: options.slug || slug,
      html: options.html || "<h1>Test Content</h1>",
    };
    
    await Deno.mkdir(TEST_PATHS.posts, { recursive: true });
    
    const postContent = `export const post = ${JSON.stringify(post)};`;
    await Deno.writeTextFile(`${TEST_PATHS.posts}/${slug}.ts`, postContent);
    return post;
  }

  /**
   * Create multiple test posts at once
   */
  static async createPosts(posts: Array<{ slug: string } & TestPostOptions>): Promise<BlogPost[]> {
    const results: BlogPost[] = [];
    for (const { slug, ...options } of posts) {
      results.push(await this.createPost(slug, options));
    }
    return results;
  }

  /**
   * Create test markdown content in the content directory
   */
  static async createMarkdownContent(filename: string, content: string): Promise<void> {
    await Deno.mkdir(TEST_PATHS.content, { recursive: true });
    await Deno.writeTextFile(`${TEST_PATHS.content}/${filename}`, content);
  }

  /**
   * Create multiple markdown content files at once
   */
  static async createMarkdownFiles(files: Array<{ filename: string; content: string }>): Promise<void> {
    await Deno.mkdir(TEST_PATHS.content, { recursive: true });
    for (const { filename, content } of files) {
      await Deno.writeTextFile(`${TEST_PATHS.content}/${filename}`, content);
    }
  }

  /**
   * Set up test templates for blog rendering
   */
  static async setupTemplates(): Promise<void> {
    await Deno.mkdir(`${TEST_PATHS.templates}/blog`, { recursive: true });
    await Deno.mkdir(`${TEST_PATHS.templates}/layouts`, { recursive: true });
    await Deno.mkdir(`${TEST_PATHS.templates}/components`, { recursive: true });
    
    // Base layout template
    const baseLayout = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= it.title || 'j10t' %></title>
    <link rel="stylesheet" href="/public/styles.css" />
</head>
<body>
    <%~ include("../components/header", { currentPage: it.currentPage }) %>
    
    <main>
        <%~ it.body %>
    </main>
</body>
</html>`;

    // Header component
    const headerComponent = `<header class="site-header">
    <nav class="main-nav">
        <a href="/" class="nav-link <%= it.currentPage === 'home' ? 'active' : '' %>">home</a>
        <a href="/about" class="nav-link <%= it.currentPage === 'about' ? 'active' : '' %>">about</a>
        <a href="/blog" class="nav-link <%= it.currentPage === 'blog' ? 'active' : '' %>">words</a>
    </nav>
</header>`;
    
    // Blog index template (just content, no HTML wrapper)
    const indexTemplate = `<h1>Blog</h1>

<% if (it.posts.length === 0) { %>
    <p>No posts yet.</p>
<% } else { %>
    <ul class="post-list">
        <% it.posts.forEach(post => { %>
            <li class="post-item">
                <div class="post-date"><%= post.date %></div>
                <h2 class="post-title">
                    <a href="/blog/<%= post.slug %>"><%= post.title %></a>
                </h2>
            </li>
        <% }) %>
    </ul>
<% } %>`;

    const postTemplate = `<!DOCTYPE html>
<html>
<head><title><%= it.post.title %></title></head>
<body>
  <nav><a href="/blog">← Back to Blog</a></nav>
  <article>
    <h1><%= it.post.title %></h1>
    <div class="post-meta">Published on <%= it.post.date %></div>
    <div class="post-content"><%~ it.post.html %></div>
  </article>
</body>
</html>`;

    await Deno.writeTextFile(`${TEST_PATHS.templates}/layouts/base.eta`, baseLayout);
    await Deno.writeTextFile(`${TEST_PATHS.templates}/components/header.eta`, headerComponent);
    await Deno.writeTextFile(`${TEST_PATHS.templates}/blog/index.eta`, indexTemplate);
    await Deno.writeTextFile(`${TEST_PATHS.templates}/blog/post.eta`, postTemplate);
  }

  /**
   * Create an Eta instance configured for testing
   */
  static createTestEta(): Eta {
    return new Eta({
      views: TEST_PATHS.templates,
      cache: false
    });
  }

  /**
   * Create a test BlogHandler instance with isolated posts directory
   */
  static createTestBlogHandler(eta?: Eta): BlogHandler {
    return new BlogHandler(eta || this.createTestEta(), TEST_PATHS.posts);
  }

  /**
   * Import a generated post module safely
   */
  static async importGeneratedPost(slug: string): Promise<{ post: BlogPost }> {
    const url = new URL(`../../${TEST_PATHS.generatedPosts}/${slug}.ts`, import.meta.url).href;
    return await import(url);
  }
}

/**
 * Cleanup Utilities
 */
export class BlogTestCleanup {
  
  /**
   * Clean up real posts directory (removes test files only)
   */
  static async cleanupPosts(): Promise<void> {
    try {
      for await (const entry of Deno.readDir(TEST_PATHS.posts)) {
        if (entry.name.startsWith("test-")) {
          await Deno.remove(`${TEST_PATHS.posts}/${entry.name}`);
        }
      }
    } catch {
      // Directory might not exist
    }
  }

  /**
   * Clean up all posts directory (use with caution!)
   */
  static async cleanupAllPosts(): Promise<void> {
    try {
      await Deno.remove(TEST_PATHS.posts, { recursive: true });
    } catch {
      // Directory might not exist
    }
  }

  /**
   * Clean up test content directory
   */
  static async cleanupContent(): Promise<void> {
    try {
      await Deno.remove(TEST_PATHS.content, { recursive: true });
    } catch {
      // Directory might not exist
    }
  }

  /**
   * Clean up generated test posts directory
   */
  static async cleanupGeneratedPosts(): Promise<void> {
    try {
      await Deno.remove(TEST_PATHS.generatedPosts, { recursive: true });
    } catch {
      // Directory might not exist
    }
  }

  /**
   * Clean up test templates directory
   */
  static async cleanupTemplates(): Promise<void> {
    try {
      await Deno.remove(TEST_PATHS.templates, { recursive: true });
    } catch {
      // Directory might not exist
    }
  }

  /**
   * Clean up all test directories and files
   */
  static async cleanupAll(): Promise<void> {
    await Promise.all([
      this.cleanupContent(),
      this.cleanupGeneratedPosts(), 
      this.cleanupTemplates(),
      this.cleanupPosts(),
    ]);
  }

  /**
   * Clean up everything including real posts (for integration tests)
   */
  static async cleanupEverything(): Promise<void> {
    await Promise.all([
      this.cleanupContent(),
      this.cleanupGeneratedPosts(),
      this.cleanupTemplates(), 
      this.cleanupAllPosts(),
    ]);
  }
}

/**
 * Common test data generators
 */
export class BlogTestData {
  
  /**
   * Generate a standard markdown post with frontmatter
   */
  static markdownWithFrontmatter(title: string, date: string, content: string): string {
    return `---
title: ${title}
date: ${date}
---

${content}`;
  }

  /**
   * Generate markdown without frontmatter
   */
  static markdownPlain(content: string): string {
    return content;
  }

  /**
   * Generate test posts with different dates for sorting tests
   */
  static sortingTestPosts(): Array<{ slug: string } & TestPostOptions> {
    return [
      { slug: "test-old", title: "Old Post", date: "2024-01-01", html: "<h1>Old Content</h1>" },
      { slug: "test-new", title: "New Post", date: "2024-12-31", html: "<h1>New Content</h1>" },
      { slug: "test-middle", title: "Middle Post", date: "2024-06-15", html: "<h1>Middle Content</h1>" },
    ];
  }

  /**
   * Generate special characters test content
   */
  static specialCharsMarkdown(): string {
    return this.markdownWithFrontmatter(
      "Special Characters & Quotes",
      "2024-08-29",
      `# Test with "quotes" and <tags>

This content has:
- "Double quotes"
- 'Single quotes'  
- <script>alert('xss')</script>
- & ampersands
- Line breaks
and multiple paragraphs.`
    );
  }

  /**
   * Generate broken frontmatter test content  
   */
  static brokenFrontmatterMarkdown(): string {
    return `---
title: "Unclosed quote
date: not-a-date
invalid: yaml: content
---

# This should still work

The frontmatter is broken but content should be processed.`;
  }
}

/**
 * Wait helper for async operations
 */
export function waitForPostsToLoad(ms = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}