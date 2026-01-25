---
title: Sidenote Test
date: 2024-01-15
draft: true
---

# Testing Sidenotes

The history of typography is rich with innovations that aimed to improve readability and comprehension. One such innovation is the sidenote^[The term "sidenote" distinguishes these from footnotes, which appear at the bottom of the page rather than in the margins.], which places supplementary information in the margin alongside the relevant text rather than interrupting the reading flow with numbered references to the bottom of the page.

Edward Tufte popularised this approach in his influential books on data visualisation and information design. His argument was simple: readers shouldn't have to hunt for footnotes at the bottom of a page when the context is most relevant right where they're reading. The marginal note keeps everything in view^[Tufte's books "The Visual Display of Quantitative Information" and "Envisioning Information" both use this technique extensively.], reducing cognitive load and improving comprehension.

## The Technical Implementation

Implementing sidenotes on the web presents interesting challenges. Unlike print, where margins are fixed and predictable, web layouts must accommodate wildly different screen sizes^[From mobile phones at 320px to ultrawide monitors at 3440px, the range is enormous.] and user preferences. A solution that works beautifully on a wide desktop monitor may be completely unusable on a phone.

The approach taken here uses CSS positioning to place notes in the right margin on wider screens. When the viewport is too narrow to accommodate a margin column, the notes collapse to an expandable format^[This is sometimes called "progressive disclosure" — showing less information initially but making more available on demand.] that the reader can tap to reveal.

## Multiple Notes in Proximity

Sometimes a passage requires several annotations in quick succession. This can create visual challenges when notes appear close together^[First note in this sequence.] as they may overlap or compete for space^[Second note, which might collide with the first.] in the margin area. The CSS must handle these cases gracefully^[Third note — does it overlap?] without creating a jumbled mess.

## Notes with Rich Content

Sidenotes aren't limited to plain text. They can contain links to external resources^[See [Tufte CSS](https://edwardtufte.github.io/tufte-css/) for the canonical web implementation of these ideas.], emphasised text, and other formatting. This flexibility makes them suitable for citations, asides, definitions, and tangential thoughts that enrich the main narrative without derailing it.
