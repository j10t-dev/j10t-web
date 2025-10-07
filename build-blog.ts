import { extract } from "@std/front-matter/yaml";
import { render } from "@deno/gfm";
import { walk } from "@std/fs/walk";
import { z } from "zod";

const FrontmatterSchema = z.object({
  title: z.string().min(1),
  date: z.date(),
}).passthrough();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

export async function buildPosts(contentDir = "./content", postsDir = "./posts") {
  console.log("Building blog posts...");

  try {
    await Deno.remove(postsDir, { recursive: true });
  } catch {
    // Noting to remove
  }
  await Deno.mkdir(postsDir, { recursive: true });
  for await (const entry of walk(contentDir, { exts: [".md"] })) {
    console.log(`Processing: ${entry.path}`);

    const content = await Deno.readTextFile(entry.path);
    const parsed = extract(content);
    const parseResult = FrontmatterSchema.safeParse(parsed.attrs);

    if (!parseResult.success) {
      console.error(`Invalid frontmatter in ${entry.path}:`);
      console.error(parseResult.error.errors);
      throw new Error(`Build failed: Invalid frontmatter in ${entry.path}`);
    }

    const attrs = parseResult.data;
    const title = attrs.title;
    const date = attrs.date.toISOString().split('T')[0];
    const body = parsed.body;

    const html = render(body);
    const slug = entry.name.replace('.md', '');
    const tsContent = `export const post = {
  title: ${JSON.stringify(title)},
  date: new Date(${JSON.stringify(date)}),
  slug: ${JSON.stringify(slug)},
  html: ${JSON.stringify(html)}
};`;

    await Deno.writeTextFile(`${postsDir}/${slug}.ts`, tsContent);
    console.log(`Generated: ${postsDir}/${slug}.ts`);
  }
  
  console.log("Blog build complete!");
}

export { FrontmatterSchema };

if (import.meta.main) {
  await buildPosts();
}