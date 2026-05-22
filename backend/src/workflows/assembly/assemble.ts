/**
 * Deliverable assembler — builds the final client-facing document from a
 * completed workflow run using the injected LLM.
 *
 * The assembler:
 *   1. Groups findings by severity (RED → YELLOW → GREEN).
 *   2. Within each group, sorts by step order (preserving the order findings
 *      were produced).
 *   3. Builds a structured prompt that instructs the LLM to produce a real
 *      professional legal document — not a process dump.
 *   4. Returns the LLM's output verbatim (the validator + fidelity check
 *      run AFTER this in the orchestrator pipeline).
 *
 * The LLM is intentionally given a tight system prompt so it writes a
 * deliverable, not an explanation of what it found.
 *
 * @module workflows/assembly/assemble
 */

import type { AssembleDeliverable } from "../contracts";
import type { Finding } from "../types";

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

/**
 * Severity label → human-readable section header used in the assembled doc.
 */
const SEVERITY_LABELS: Record<string, string> = {
  RED: "Critical Findings",
  YELLOW: "Notable Issues",
  GREEN: "Confirmed Clean",
};

/** Severity sort order — RED first (highest risk), GREEN last. */
const SEVERITY_ORDER: Record<string, number> = { RED: 0, YELLOW: 1, GREEN: 2 };

/**
 * Format a single finding as Markdown for the LLM prompt context block.
 */
function formatFinding(f: Finding): string {
  const citations =
    f.citations && f.citations.length > 0
      ? `\n  Citations: ${f.citations.join(", ")}`
      : "";
  return `- **${f.title}**\n  ${f.detail}${citations}`;
}

/**
 * Build the full LLM prompt for assembly.
 *
 * The system prompt enforces that the output is a professional deliverable,
 * not agent narration. The user turn supplies the structured findings.
 */
function buildPrompt(run: {
  templateId: string;
  findings: Finding[];
  input?: Record<string, unknown>;
}): { systemPrompt: string; user: string } {
  // Group and sort findings
  const grouped: Record<string, Finding[]> = { RED: [], YELLOW: [], GREEN: [] };
  for (const f of run.findings) {
    (grouped[f.severity] ?? (grouped[f.severity] = [])).push(f);
  }

  // Sort within each group by implicit step order (findings were added in step order)
  // (no further sort needed — already in insertion order)

  // Build findings section
  const findingsSections: string[] = [];
  for (const severity of ["RED", "YELLOW", "GREEN"] as const) {
    const group = grouped[severity];
    if (group.length === 0) continue;
    findingsSections.push(
      `### ${SEVERITY_LABELS[severity] ?? severity}\n` +
        group.map(formatFinding).join("\n"),
    );
  }
  const findingsBlock =
    findingsSections.length > 0
      ? findingsSections.join("\n\n")
      : "No findings were produced by this workflow run.";

  // Optional matter context from run input
  const contextLines: string[] = [];
  if (run.input) {
    for (const [k, v] of Object.entries(run.input)) {
      if (typeof v === "string" || typeof v === "number") {
        contextLines.push(`${k}: ${v}`);
      }
    }
  }
  const contextBlock =
    contextLines.length > 0 ? contextLines.join("\n") : "(none provided)";

  const systemPrompt = `You are a senior legal analyst. Your task is to produce a complete, professional deliverable document.

CRITICAL RULES:
1. Write the deliverable — do NOT narrate your analysis process.
2. Do NOT use "I will now…", "Step N:", "As an AI…", or any first-person process language.
3. Every RED finding MUST appear in the deliverable by name. Do not omit or merge RED findings silently.
4. Group findings under clearly labelled sections: Critical Findings, Notable Issues, and (if any) Confirmed Clean.
5. Each finding must have: a heading with the finding title, the key details, risk implications, and a recommended action.
6. Close with an Executive Summary section that gives a concise overall risk picture.
7. Use professional legal-memo style. No marketing language.
8. Minimum 200 words. No placeholder text.`;

  const user = `WORKFLOW: ${run.templateId}
MATTER CONTEXT:
${contextBlock}

FINDINGS TO INCORPORATE:
${findingsBlock}

Produce the complete deliverable document now.`;

  return { systemPrompt, user };
}

// ---------------------------------------------------------------------------
// Severity ordering helper (exported for tests)
// ---------------------------------------------------------------------------

/** Sort findings by severity (RED first) then by insertion order. */
export function orderFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 99;
    const sb = SEVERITY_ORDER[b.severity] ?? 99;
    return sa - sb;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assemble the final deliverable from a completed workflow run.
 *
 * Groups findings by severity (RED → YELLOW → GREEN) and calls the injected
 * LLM with a tight professional-doc prompt. Returns the LLM's output.
 *
 * Callers should pipe the result through {@link validateDeliverable} and
 * {@link verifyFidelity} before marking the run done.
 *
 * @param run - Completed workflow run (status should be "assembling").
 * @param llm - Injected text-completion function.
 * @returns The assembled deliverable text.
 */
export const assembleDeliverable: AssembleDeliverable = async (run, llm): Promise<string> => {
  const { systemPrompt, user } = buildPrompt(run);

  const result = await llm({
    model: "claude-sonnet-4-5",
    systemPrompt,
    user,
    maxTokens: 4096,
  });

  return result;
};
