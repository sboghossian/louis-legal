# Louis (HAQQ) Skills Inventory

> Source: Stephane's full skills inventory from 2026-05-12, capturing ~1089 named skills across 60+ categories.
> This document is the **target list**. The `backend/src/skills/` directory is what's authored. The `_REGISTRY.md` and `_REGISTRY.json` files reflect what currently exists.

This is a placeholder so the parser scripts can find the source inventory.
Paste your full `SKILLS_INVENTORY.md` content into this file when you want to regenerate stubs.

## Why we didn't auto-stub all 1089 skills

900+ empty stubs add noise without value — the directory becomes unwieldy and grep becomes useless. Instead:

1. The 62 hand-authored core skills (router, conversation, safety, persona, top-priority drafting, review, output, heuristic, workflow) are real.
2. The 152 prompt-pack skills auto-imported from the HAQQ prompt library are real (full prompt templates).
3. The remaining ~875 named skills are tracked in `_REGISTRY.md` as `status: planned` — they get a file only when authored.

When you're ready to bulk-stub more, paste the full inventory text into this file and run:

```bash
node backend/src/skills/_import-from-inventory.js
```

It will create stub `.md` files for every named skill not already present, with `status: stub`.
