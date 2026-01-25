# Sidenotes Feature Design

## Overview

Add Tufte-style sidenotes to blog posts. Footnotes appear in the right margin on desktop and collapse to tap-to-expand on mobile.

## Syntax

Inline footnotes in markdown:

```markdown
Some text^[This is the footnote content] continues here.
```

Auto-numbers starting from 0.

## Technical Approach

### HTML Output

The marked extension transforms `^[content]` into:

```html
<span class="sidenote-container">
  <label for="sn-0" class="sidenote-toggle sidenote-number"></label>
  <input type="checkbox" id="sn-0" class="sidenote-toggle" />
  <span class="sidenote">
    This is the footnote content
  </span>
</span>
```

### CSS Layout

- 2-column grid: content (700px) + right margin for sidenotes
- Desktop (>1024px): sidenotes in right margin
- Mobile (<=1024px): sidenotes hidden, tap number to expand inline
- Checkbox hack for toggle - no JavaScript required

### Numbering

CSS counters with `counter-reset: sidenote-counter -1` so first footnote displays as 0.

## Files to Change

1. **`build/build-blog.ts`** - Add marked extension for inline footnotes
2. **`public/styles.css`** - Add sidenote layout and toggle styles
3. **`views/blog/post.eta`** - Ensure wrapper has correct class for grid

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Footnote syntax | Inline `^[...]` | Suits writing flow, auto-numbers |
| Layout | CSS Grid 2-column | Clean, robust, matches Maggie Appleton's approach |
| Mobile toggle | Checkbox hack | No JS needed, accessible |
| Breakpoint | 1024px | Works on Framework 13 laptop at 1.57x scaling |
| Numbering start | 0 | User preference |
| Content width | ~700px | Maintains readability, leaves room for sidenotes |

## References

- [Maggie Appleton's Footnote.astro](https://github.com/MaggieAppleton/maggieappleton.com-V3/blob/main/src/components/mdx/Footnote.astro)
- [Tufte CSS](https://edwardtufte.github.io/tufte-css/)
