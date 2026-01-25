# Blog System

## Pipeline

1. Write markdown in `/content/*.md`
2. `bun run build-blog` converts to TypeScript modules in `/posts/`
3. Posts support frontmatter (title, date) or auto-generate from filename

## Routes

- `/blog/` — index
- `/blog/[slug]` — individual posts

## Notes

- No JavaScript required for core blog functionality
- Markdown rendered via `marked` (no HTML sanitisation—content is trusted, authored internally)
