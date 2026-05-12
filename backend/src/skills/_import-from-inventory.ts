/**
 * Stub-importer: parses docs/skills/SKILLS_INVENTORY.md and creates stub .md files
 * for every named skill (e.g., `router.intent-detection`) that doesn't already exist.
 *
 * Usage: tsx backend/src/skills/_import-from-inventory.ts
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const SKILLS_DIR = __dirname;
const INVENTORY_PATH = join(__dirname, "..", "..", "..", "docs", "skills", "SKILLS_INVENTORY.md");

function main() {
  if (!existsSync(INVENTORY_PATH)) {
    console.error(`Inventory not found at: ${INVENTORY_PATH}`);
    process.exit(1);
  }

  const raw = readFileSync(INVENTORY_PATH, "utf-8");

  // Match skill IDs in backticks: `category.slug-with-hyphens` or `category.slug.sub-slug`
  // Categories are lowercase letters/hyphens, slugs may include letters/numbers/dots/hyphens
  const idRegex = /`([a-z][a-z0-9-]*\.[A-Za-z0-9.\-_]+)`/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = idRegex.exec(raw)) !== null) {
    const id = m[1];
    if (id.includes(" ")) continue;
    if (id.split(".").length < 2) continue;
    found.add(id);
  }

  const existing = new Set(
    readdirSync(SKILLS_DIR)
      .filter(f => f.endsWith(".md") && !f.startsWith("_"))
      .map(f => f.replace(/\.md$/, ""))
  );

  let created = 0;
  let skipped = 0;
  for (const id of found) {
    const filename = `${id}.md`;
    if (existing.has(id)) { skipped++; continue; }

    const category = id.split(".")[0];
    const name = id.split(".").slice(1).join(".").replace(/-/g, " ");

    const body = `---
id: ${id}
name: ${JSON.stringify(name)}
category: ${category}
priority: P3
status: stub
version: 0.1
source: SKILLS_INVENTORY.md (auto-imported)
---

# ${id} — STUB

This skill is named in the Louis skills inventory but not yet authored.

When authoring:
1. Set \`status: drafted\` once the body has real content
2. Add \`intent\` keywords for the router
3. Add jurisdictional scope if applicable
4. Link related skills with \`[[other-skill-id]]\`
5. Re-run typecheck and the registry generator

See \`backend/src/skills/_loader.ts\` for the loader contract.
`;
    writeFileSync(join(SKILLS_DIR, filename), body);
    created++;
  }
  console.log(`stub import: created=${created} existing=${skipped} total-found=${found.size}`);
}

main();
