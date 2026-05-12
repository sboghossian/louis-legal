// Skills system: types

export type SkillCategory =
  | "router" | "conversation" | "draft" | "review" | "research"
  | "tool" | "output" | "kb" | "persona" | "efirm"
  | "public-tool" | "eval" | "safety" | "onboarding" | "growth"
  | "ops" | "voice" | "workflow" | "heuristic" | "justice"
  | "docs" | "academy" | "blog" | "site" | "unlock"
  | "feed" | "pillar" | "pa-workflow" | "import" | "ref"
  | "template" | "strategy" | "messaging" | "intel" | "dataroom"
  | "pseo" | "casesim" | "report" | "outreach" | "connector"
  | "wiki" | "cowork" | "memory" | "intel-feed" | "meeting"
  | "eng" | "draft-fine" | "justinian" | "efirm-finance"
  | "inst" | "voice-brand" | "ops-active" | "safety-compliance"
  | "community" | "openclaw" | "prompt-pack";

export type SkillStatus = "stub" | "drafted" | "reviewed" | "shipped";
export type SkillPriority = "P0" | "P1" | "P2" | "P3";
export type Jurisdiction = "LB" | "KSA" | "UAE" | "EG" | "FR" | "UK" | "US" | "EU" | "DIFC" | "ADGM" | "QFC" | "OHADA" | "GCC" | "MENA" | "global";
export type Language = "en" | "ar" | "fr" | "es" | "de" | "it";

export interface SkillFrontmatter {
  id: string;                   // e.g. "draft.NDA-mutual"
  name: string;                 // human-readable
  category: SkillCategory;
  practice_area?: string;       // e.g. "corporate", "employment"
  jurisdictions?: Jurisdiction[];
  languages?: Language[];
  intent?: string[];            // keywords / patterns that route to this skill
  required_inputs?: string[];   // ["parties", "jurisdiction", "purpose"]
  optional_inputs?: string[];
  related?: string[];           // other skill IDs
  priority: SkillPriority;
  status: SkillStatus;
  version: string;
  authors?: string[];           // who wrote / reviewed
  reviewed_at?: string;         // ISO date
  source?: string;              // origin pointer (haqq prompt library, Issam, etc.)
}

export interface Skill {
  frontmatter: SkillFrontmatter;
  prompt: string;               // the system-prompt body (markdown)
  path: string;                 // filesystem path
}

export interface SkillsRegistryEntry {
  id: string;
  name: string;
  category: SkillCategory;
  priority: SkillPriority;
  status: SkillStatus;
  path: string;
}
