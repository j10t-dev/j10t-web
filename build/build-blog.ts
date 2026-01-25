import matter from "gray-matter";
import { marked } from "marked";
import { readdir, rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { z } from "zod";

// Sidenote extension for marked
// Transforms ^[content] into Tufte-style sidenote HTML
function createSidenoteExtension() {
  let sidenoteCounter = 0;

  return {
    name: "sidenote",
    level: "inline" as const,
    start(src: string) {
      return src.indexOf("^[");
    },
    tokenizer(src: string) {
      if (!src.startsWith("^[")) {
        return undefined;
      }

      // Find matching closing bracket by counting bracket depth
      let depth = 0;
      let i = 1; // Start after ^

      for (; i < src.length; i++) {
        if (src[i] === "[") {
          depth++;
        } else if (src[i] === "]") {
          depth--;
          if (depth === 0) {
            // Found the matching close bracket
            const raw = src.slice(0, i + 1);
            const content = src.slice(2, i); // Content between ^[ and ]
            const token: any = {
              type: "sidenote",
              raw,
              text: content,
            };
            // Tell marked to tokenize the content as well
            token.tokens = this.lexer.inlineTokens(content);
            return token;
          }
        }
      }

      return undefined; // No matching bracket found
    },
    renderer(token: any) {
      const id = sidenoteCounter++;
      // Parse the content to handle markdown inside sidenotes
      const parsedContent = this.parser.parseInline(token.tokens || []);
      return `<span class="sidenote-container"><label for="sn-${id}" class="sidenote-toggle sidenote-number"></label><input type="checkbox" id="sn-${id}" class="sidenote-toggle" /><span class="sidenote">${parsedContent}</span></span>`;
    },
  };
}

// Configure marked to use GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: false,
});

const FrontmatterSchema = z.object({
  title: z.string().min(1),
  date: z.date(),
  draft: z.boolean().optional(),
}).passthrough();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

async function* walkMarkdown(dir: string): AsyncGenerator<{ path: string; name: string }> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdown(fullPath);
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      yield { path: fullPath, name: entry.name };
    }
  }
}

export async function buildPosts(contentDir = "./content", postsDir = "./posts") {
  console.log("Building blog posts...");

  try {
    await rm(postsDir, { recursive: true });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") {
      console.error(`Failed to clean posts directory: ${nodeError.message}`);
      throw error;
    }
    // ENOENT is fine - directory doesn't exist yet
  }
  await mkdir(postsDir, { recursive: true });

  for await (const entry of walkMarkdown(contentDir)) {
    console.log(`Processing: ${entry.path}`);

    const content = await readFile(entry.path, "utf-8");
    const parsed = matter(content);
    const parseResult = FrontmatterSchema.safeParse(parsed.data);

    if (!parseResult.success) {
      console.error(`Invalid frontmatter in ${entry.path}:`);
      console.error(parseResult.error.errors);
      throw new Error(`Build failed: Invalid frontmatter in ${entry.path}`);
    }

    const attrs = parseResult.data;

    if (attrs.draft) {
      console.log(`Skipping draft: ${entry.path}`);
      continue;
    }
    const title = attrs.title;
    const date = attrs.date.toISOString().split('T')[0];
    const body = parsed.content;

    // Reset sidenote counter for each post
    marked.use({ extensions: [createSidenoteExtension()] });

    const html = await marked(body);
    const slug = basename(entry.name, ".md");
    const tsContent = `export const post = {
  title: ${JSON.stringify(title)},
  date: new Date(${JSON.stringify(date)}),
  slug: ${JSON.stringify(slug)},
  html: ${JSON.stringify(html)}
};`;

    await writeFile(`${postsDir}/${slug}.ts`, tsContent, "utf-8");
    console.log(`Generated: ${postsDir}/${slug}.ts`);
  }

  console.log("Blog build complete!");
}

export { FrontmatterSchema };

if (import.meta.main) {
  await buildPosts();
}