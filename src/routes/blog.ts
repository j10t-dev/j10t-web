import { Eta } from "eta";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";
import { logError } from "../lib/logger";

export const BlogPostSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  date: z.date(),
  slug: z.string().regex(/^[a-zA-Z0-9_-]+$/, "Slug must only contain alphanumeric characters, hyphens, and underscores"),
  html: z.string().min(1, "HTML content cannot be empty"),
});

export type BlogPost = z.infer<typeof BlogPostSchema>;

export class BlogHandler {
  private eta: Eta;
  private posts: Map<string, BlogPost> = new Map();
  private postsDir: string;

  constructor(eta: Eta, postsDir: string = "./posts") {
    this.eta = eta;
    this.postsDir = postsDir;
    this.loadPosts();
  }

  private async loadPosts() {
    try {
      // Load all generated blog posts
      const files = await readdir(this.postsDir);
      for (const file of files) {
        if (file.endsWith(".ts")) {
          await this.loadSinglePost(join(this.postsDir, file));
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn("Posts directory not found. Run 'bun run build-blog' first.");
      } else {
        console.error("Failed to load blog posts:", error);
        throw error;
      }
    }
  }

  private async loadSinglePost(filePath: string) {
    // Validate the file path for security
    const fileName = basename(filePath);
    
    // Ensure the filename has expected format (alphanumeric, hyphens, underscores only)
    if (!fileName.match(/^[a-zA-Z0-9_-]+\.ts$/)) {
      throw new Error(`Invalid post filename format: ${fileName}`);
    }
    
    // Construct safe path within posts directory
    const sanitizedPath = join(this.postsDir, fileName);

    try {
      // Use absolute import path to prevent directory traversal
      const absolutePath = new URL(sanitizedPath, import.meta.resolve("../")).href;
      const module = await import(absolutePath);

      if (!module.post || typeof module.post !== 'object') {
        throw new Error(`Invalid post format in ${fileName}`);
      }

      // Validate post structure with Zod
      const parseResult = BlogPostSchema.safeParse(module.post);

      if (!parseResult.success) {
        const errorMessages = parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Invalid post structure in ${fileName}: ${errorMessages}`);
      }

      this.posts.set(parseResult.data.slug, parseResult.data);
    } catch (error) {
      logError("Failed to load post", {
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw here to allow other posts to load
    }
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/blog" || url.pathname === "/blog/") {
      return await this.renderBlogIndex();
    }

    const slug = url.pathname.replace("/blog/", "");

    if (!slug.match(/^[a-zA-Z0-9_-]+$/)) {
      return new Response("Invalid post identifier", { status: 400 });
    }

    const post = this.posts.get(slug);

    if (!post) {
      return new Response("Post not found", { status: 404 });
    }

    return await this.renderBlogPost(post);
  }

  private async renderBlogIndex(): Promise<Response> {
    try {
      const posts = Array.from(this.posts.values())
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map(p => ({ ...p, date: p.date.toISOString().split('T')[0] }));

      const templateData = { posts, currentPage: "blog", title: "Blog" };
      
      // Render the blog index content first
      const content = await this.eta.render("blog/index", templateData);
      
      // Then render it within the base layout
      const html = await this.eta.render("layouts/base", {
        ...templateData,
        body: content
      });
      
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    } catch (error) {
      console.error("Failed to render blog index:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  private async renderBlogPost(post: BlogPost): Promise<Response> {
    try {
      const formattedPost = { ...post, date: post.date.toISOString().split('T')[0] };
      const html = await this.eta.render("blog/post", { post: formattedPost });
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    } catch (error) {
      console.error("Failed to render blog post:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  getAllPosts(): BlogPost[] {
    return Array.from(this.posts.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  getFormattedPosts() {
    return this.getAllPosts()
      .map(p => ({ ...p, date: p.date.toISOString().split('T')[0] }));
  }
}