import { extract } from "jsr:@std/front-matter@^1.0.0/yaml";
import { render } from "jsr:@deno/gfm@^0.8.0";
import { walk } from "jsr:@std/fs@^1.0.0/walk";
import { basename } from "jsr:@std/path@^1.1.0";

export async function buildPosts(contentDir = "./content", postsDir = "./posts") {
  console.log("Building blog posts...");
  
  // Clear existing generated posts
  try {
    await Deno.remove(postsDir, { recursive: true });
  } catch {
    // Directory doesn't exist, that's fine
  }
  await Deno.mkdir(postsDir, { recursive: true });

  // Process each markdown file in content directory
  for await (const entry of walk(contentDir, { exts: [".md"] })) {
    console.log(`Processing: ${entry.path}`);
    
    const content = await Deno.readTextFile(entry.path);
    
    // Extract frontmatter or use filename as title
    let title, body, date;
    try {
      const parsed = extract(content);
      const attrs = parsed.attrs as Record<string, unknown>;
      title = (attrs.title as string) || entry.name.replace('.md', '');
      if (attrs.date) {
        if (typeof attrs.date === 'string') {
          // If it's already a string, just take the date part
          date = attrs.date.split('T')[0];
        } else {
          // If it's a Date object, convert to ISO string and take date part
          date = new Date(attrs.date as string | number | Date).toISOString().split('T')[0];
        }
      } else {
        date = new Date().toISOString().split('T')[0];
      }
      body = parsed.body;
    } catch {
      // No frontmatter, use filename as title
      title = entry.name.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      date = new Date().toISOString().split('T')[0];
      body = content;
    }

    // Convert markdown to HTML
    const html = render(body);
    const slug = entry.name.replace('.md', '');

    // Generate TypeScript module
    const tsContent = `export const post = {
  title: ${JSON.stringify(title)},
  date: ${JSON.stringify(date)},
  slug: ${JSON.stringify(slug)},
  html: ${JSON.stringify(html)}
};`;

    await Deno.writeTextFile(`${postsDir}/${slug}.ts`, tsContent);
    console.log(`Generated: ${postsDir}/${slug}.ts`);
  }
  
  console.log("Blog build complete!");
}

if (import.meta.main) {
  await buildPosts();
}