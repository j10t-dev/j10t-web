---
title: Working With Claude
date: 2025-11-02
draft: true
---

DRAFT THOUGHTS: 

1. Superpowers are good. I need to find a way of overriding / extending them though. I keep having to tell it not to use git, worktrees etc. Just differences in workflow preference.
2. Context windows limits are the enemy. Compact doesn't work for me at all. Nothing is more discombobulating and tricky for human/ai to unpick than when the context window gets full part way through doing a task. The workflow of ensuring the context window is kept small and refreshed regularly alleviates that (particularly when dealing with usage limits as well). Need to use sub-agent https://docs.claude.com/en/docs/claude-code/sub-agents mode more and see if that helps. This necessitates the usage of intermediary text files ('memory', 'CLAUDE.md' etc), particularly detailed plans. The brainstorm -> persist to file -> wipe and implement is pleasing.