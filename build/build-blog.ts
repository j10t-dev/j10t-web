import matter from "gray-matter";
import { marked } from "marked";
import { readdir, rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { z } from "zod";

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
  } catch {
    // Nothing to remove
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