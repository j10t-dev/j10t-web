import { Eta } from "@eta-dev/eta";
import { walk } from "jsr:@std/fs@^1.0.0/walk";
import { basename, join } from "jsr:@std/path@^1.1.0";

export interface BlogPost {
  title: string;
  date: string;
  slug: string;
  html: string;
}

export class BlogHandler {
  private eta: Eta;
  private posts: Map<string, BlogPost> = new Map();

  constructor(eta: Eta) {
    this.eta = eta;
    this.loadPosts();
  }

  private async loadPosts() {
    try {
      // Load all generated blog posts
      for await (const entry of walk("./posts", { exts: [".ts"] })) {
        await this.loadSinglePost(entry.path);
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.warn("Posts directory not found. Run 'deno task build-blog' first.");
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
    const sanitizedPath = join("./posts", fileName);

    try {
      // Use absolute import path to prevent directory traversal
      const absolutePath = new URL(sanitizedPath, import.meta.resolve("../")).href;
      const module = await import(absolutePath);
      
      if (!module.post || typeof module.post !== 'object') {
        throw new Error(`Invalid post format in ${fileName}`);
      }

      const post = module.post as BlogPost;
      
      // Validate post structure
      if (!post.title || !post.date || !post.slug || !post.html) {
        throw new Error(`Invalid post structure in ${fileName}: missing required fields`);
      }

      this.posts.set(post.slug, post);
    } catch (error) {
      console.error(`Failed to load post ${fileName}:`, error instanceof Error ? error.message : String(error));
      // Don't throw here to allow other posts to load
    }
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    
    if (url.pathname === "/blog" || url.pathname === "/blog/") {
      return this.renderBlogIndex();
    }
    
    const slug = url.pathname.replace("/blog/", "");
    
    // Validate slug to prevent path traversal and ensure it's safe
    if (!slug.match(/^[a-zA-Z0-9_-]+$/)) {
      return new Response("Invalid post identifier", { status: 400 });
    }
    
    const post = this.posts.get(slug);
    
    if (!post) {
      return new Response("Post not found", { status: 404 });
    }
    
    return this.renderBlogPost(post);
  }

  private async renderBlogIndex(): Promise<Response> {
    try {
      const posts = Array.from(this.posts.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const html = await this.eta.render("blog/index", { posts });
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
      const html = await this.eta.render("blog/post", { post });
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    } catch (error) {
      console.error("Failed to render blog post:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }
}