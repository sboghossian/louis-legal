// Skills loader: reads .md files with YAML frontmatter, returns Skill objects.
// Frontmatter parsing is intentionally minimal (no external dep) since we control the format.

import { readFileSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import type { Skill, SkillFrontmatter, SkillsRegistryEntry } from "./_types.js";

const SKILLS_DIR = __dirname;

function parseFrontmatter(raw: string): { fm: SkillFrontmatter; body: string } {
  if (!raw.startsWith("---")) {
    throw new Error("Skill file missing frontmatter delimiter");
  }
  const end = raw.indexOf("\n---", 3);
  if (end < 0) throw new Error("Skill file frontmatter not closed");
  const fmRaw = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, "");

  const fm: Record<string, unknown> = {};
  // very small YAML subset: key: value, key: [a, b], key: |\n ... lines
  const lines = fmRaw.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = /^([\w\-]+):\s*(.*)$/.exec(line);
    if (!m) { i++; continue; }
    const key = m[1];
    let val: string = m[2];
    if (val === "|") {
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && /^\s+/.test(lines[i])) {
        blockLines.push(lines[i].replace(/^\s{2}/, ""));
        i++;
      }
      fm[key] = blockLines.join("\n");
      continue;
    }
    if (val.startsWith("[") && val.endsWith("]")) {
      fm[key] = val
        .slice(1, -1)
        .split(",")
        .map(s => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      fm[key] = val.replace(/^["']|["']$/g, "");
    }
    i++;
  }
  return { fm: fm as unknown as SkillFrontmatter, body };
}

let _cache: Map<string, Skill> | null = null;

export function loadAllSkills(force = false): Map<string, Skill> {
  if (_cache && !force) return _cache;
  const map = new Map<string, Skill>();
  walk(SKILLS_DIR).forEach(p => {
    if (!p.endsWith(".md")) return;
    if (basename(p).startsWith("_")) return; // skip helpers like _INDEX.md
    const raw = readFileSync(p, "utf-8");
    // Bare docs (READMEs, plans) sit alongside skill files but don't have
    // YAML frontmatter — skip them silently so the boot log stays clean.
    if (!raw.startsWith("---")) return;
    try {
      const { fm, body } = parseFrontmatter(raw);
      const id = fm.id || basename(p, ".md");
      map.set(id, { frontmatter: fm, prompt: body, path: p });
    } catch (e) {
      console.warn(`[skills] failed to parse ${p}:`, (e as Error).message);
    }
  });
  _cache = map;
  return map;
}

export function getSkill(id: string): Skill | undefined {
  return loadAllSkills().get(id);
}

export function listSkills(filter?: Partial<SkillFrontmatter>): SkillsRegistryEntry[] {
  return [...loadAllSkills().values()]
    .filter(s => {
      if (!filter) return true;
      for (const [k, v] of Object.entries(filter)) {
        const sv = (s.frontmatter as unknown as Record<string, unknown>)[k];
        if (Array.isArray(v)) {
          if (!Array.isArray(sv)) return false;
          if (!v.every(x => sv.includes(x))) return false;
        } else if (sv !== v) {
          return false;
        }
      }
      return true;
    })
    .map(s => ({
      id: s.frontmatter.id,
      name: s.frontmatter.name,
      category: s.frontmatter.category,
      priority: s.frontmatter.priority,
      status: s.frontmatter.status,
      path: s.path,
    }));
}

/** Compose a system prompt by concatenating skills in load order, separated by markers. */
export function composeSystemPrompt(skillIds: string[]): string {
  const skills = skillIds
    .map(id => getSkill(id))
    .filter((s): s is Skill => Boolean(s));
  return skills
    .map(s => `## SKILL: ${s.frontmatter.id} — ${s.frontmatter.name}\n\n${s.prompt}`)
    .join("\n\n---\n\n");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
