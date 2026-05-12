/**
 * Skills router observability — in-memory ring buffer of the last N route decisions.
 * Read via /api/skills/route-debug.
 *
 * Why in-memory (not DB): keeps this self-contained and doesn't require a schema
 * migration. For production, swap with a Postgres table or PostHog event.
 */

export interface RouteDecisionLog {
  ts: string;                 // ISO timestamp
  userId?: string;
  chatId?: string;
  projectId?: string;
  messagePreview: string;     // first 200 chars of the user message
  intentPrimary: string;
  intentPracticeArea?: string;
  intentJurisdiction?: string;
  skillIds: string[];
  skillCount: number;
  systemPromptChars: number;
  classifierSource: "keyword" | "llm-fallback" | "hybrid";
  latencyMs?: number;
}

const BUFFER_SIZE = 200;
const buffer: RouteDecisionLog[] = [];

export function logRouteDecision(log: RouteDecisionLog) {
  buffer.push(log);
  if (buffer.length > BUFFER_SIZE) buffer.shift();
}

export function getRecentDecisions(limit = 50, opts?: { userId?: string }): RouteDecisionLog[] {
  let entries = buffer;
  if (opts?.userId) entries = entries.filter(e => e.userId === opts.userId);
  return entries.slice(-limit).reverse(); // most recent first
}

export function clearDecisions() {
  buffer.length = 0;
}

export function decisionStats() {
  const total = buffer.length;
  const byIntent: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const e of buffer) {
    byIntent[e.intentPrimary] = (byIntent[e.intentPrimary] ?? 0) + 1;
    bySource[e.classifierSource] = (bySource[e.classifierSource] ?? 0) + 1;
  }
  return { total, byIntent, bySource };
}
