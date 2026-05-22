/**
 * Slice 2c — Full-Bench: bounded adversarial verification of RED findings.
 *
 * Each RED finding is run through three sequential LLM roles:
 *   1. Challenger — attacks the finding (raises counterarguments / doubt).
 *   2. Defender   — defends the finding in light of the challenge.
 *   3. Evaluator  — reads both sides, returns a structured verdict.
 *
 * The function is pure orchestration: it only calls the injected `llm`
 * function; it never imports a provider and never touches the network itself.
 *
 * Non-RED findings are silently skipped (never benched).
 * At most `opts.cap` (default 3) findings are benched per invocation.
 */

import type {
  LlmComplete,
  BenchVerdict,
  BenchVerdictKind,
  FullBenchOptions,
  RunFullBench,
} from "./contracts";
import type { Finding } from "./types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Models for each role — use cheap tiers; this is a quality-gate pass. */
const ROLE_MODEL = "claude-haiku-4-5";

/** Build the Challenger prompt for one finding. */
function challengerPrompt(finding: Finding): string {
  return [
    `You are a rigorous legal reviewer stress-testing the following finding.`,
    `Your role: CHALLENGER. Attack this finding — surface weaknesses, missing`,
    `context, alternative interpretations, or factual errors. Be specific and`,
    `concise (max 150 words).`,
    ``,
    `Finding title: ${finding.title}`,
    `Finding detail: ${finding.detail}`,
    finding.citations?.length
      ? `Citations: ${finding.citations.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Build the Defender prompt for one finding + challenge. */
function defenderPrompt(finding: Finding, challenge: string): string {
  return [
    `You are a rigorous legal reviewer stress-testing the following finding.`,
    `Your role: DEFENDER. You have seen a challenge below. Defend the finding —`,
    `explain why it is well-founded despite the challenge. Be specific and`,
    `concise (max 150 words).`,
    ``,
    `Finding title: ${finding.title}`,
    `Finding detail: ${finding.detail}`,
    finding.citations?.length
      ? `Citations: ${finding.citations.join("; ")}`
      : "",
    ``,
    `Challenger raised: ${challenge}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Build the Evaluator prompt. The Evaluator reads both sides and returns a
 * machine-parseable block. We ask for a strict format so the parser is
 * deterministic:
 *
 *   VERDICT: upheld|revised|withdrawn
 *   CONFIDENCE: 0.0–1.0
 *   RATIONALE: <one-paragraph rationale>
 *   REVISED: <replacement finding text>   ← only when verdict is "revised"
 */
function evaluatorPrompt(
  finding: Finding,
  challenge: string,
  defense: string,
): string {
  return [
    `You are a senior legal reviewer acting as EVALUATOR.`,
    `Read the original finding, the challenge, and the defense below, then`,
    `output EXACTLY this format (no extra text before or after):`,
    ``,
    `VERDICT: <upheld|revised|withdrawn>`,
    `CONFIDENCE: <number between 0 and 1, e.g. 0.85>`,
    `RATIONALE: <concise explanation, ≤120 words>`,
    `REVISED: <only include this line if verdict is "revised"; replacement text>`,
    ``,
    `Rules:`,
    `- VERDICT must be exactly one of: upheld, revised, withdrawn`,
    `- CONFIDENCE must be a decimal in [0, 1]`,
    `- REVISED must only appear when VERDICT is "revised"`,
    ``,
    `Finding title: ${finding.title}`,
    `Finding detail: ${finding.detail}`,
    ``,
    `Challenger: ${challenge}`,
    ``,
    `Defender: ${defense}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Evaluator output parser
// ---------------------------------------------------------------------------

interface ParsedEvaluation {
  verdict: BenchVerdictKind;
  confidence: number;
  rationale: string;
  revised?: string;
}

const VERDICT_KINDS = new Set<BenchVerdictKind>(["upheld", "revised", "withdrawn"]);

/**
 * Parse the Evaluator's text output robustly.
 *
 * Strategy: extract named fields from lines matching `KEY: value`. Falls back
 * to scanning for the keyword anywhere if the strict-line parse fails. Clamps
 * confidence to [0, 1] and defaults to "upheld" / 0.5 on malformed output.
 */
function parseEvaluatorOutput(text: string): ParsedEvaluation {
  const lines = text.split(/\r?\n/);

  let verdict: BenchVerdictKind = "upheld";
  let confidence = 0.5;
  let rationale = "";
  let revised: string | undefined;

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim().toUpperCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === "VERDICT") {
      const candidate = value.toLowerCase() as BenchVerdictKind;
      if (VERDICT_KINDS.has(candidate)) {
        verdict = candidate;
      } else {
        // scan the value for a keyword
        for (const kind of VERDICT_KINDS) {
          if (value.toLowerCase().includes(kind)) {
            verdict = kind;
            break;
          }
        }
      }
    } else if (key === "CONFIDENCE") {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        confidence = Math.min(1, Math.max(0, parsed));
      }
    } else if (key === "RATIONALE") {
      rationale = value;
    } else if (key === "REVISED") {
      revised = value.length > 0 ? value : undefined;
    }
  }

  // Fallback: scan full text for verdict keyword if still default
  if (rationale === "") {
    // Extract everything after "RATIONALE:" as rationale
    const rationaleMatch = text.match(/RATIONALE:\s*(.+?)(?:\nREVISED:|$)/is);
    if (rationaleMatch) {
      rationale = rationaleMatch[1].trim();
    }
  }

  // If verdict is revised but no revised text found, fall back to upheld
  if (verdict === "revised" && !revised) {
    const revisedMatch = text.match(/REVISED:\s*(.+)/i);
    if (revisedMatch) {
      revised = revisedMatch[1].trim();
    } else {
      verdict = "upheld";
    }
  }

  // Clear revised if verdict is not revised
  if (verdict !== "revised") {
    revised = undefined;
  }

  return { verdict, confidence, rationale: rationale || text.slice(0, 200).trim(), revised };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export const runFullBench: RunFullBench = async (
  redFindings: Finding[],
  llm: LlmComplete,
  opts?: FullBenchOptions,
): Promise<BenchVerdict[]> => {
  const cap = opts?.cap ?? 3;

  // Defensive filter: only bench RED findings (caller may pass mixed)
  const toProcess = redFindings
    .filter((f) => f.severity === "RED")
    .slice(0, cap);

  const verdicts: BenchVerdict[] = [];

  for (const finding of toProcess) {
    // Role 1: Challenger attacks the finding
    const challenge = await llm({
      model: ROLE_MODEL,
      systemPrompt:
        "You are a rigorous legal reviewer. Be concise and precise.",
      user: challengerPrompt(finding),
      maxTokens: 300,
    });

    // Role 2: Defender defends the finding against the challenge
    const defense = await llm({
      model: ROLE_MODEL,
      systemPrompt:
        "You are a rigorous legal reviewer. Be concise and precise.",
      user: defenderPrompt(finding, challenge),
      maxTokens: 300,
    });

    // Role 3: Evaluator renders a verdict
    const evaluation = await llm({
      model: ROLE_MODEL,
      systemPrompt:
        "You are a senior legal reviewer acting as evaluator. Follow the output format exactly.",
      user: evaluatorPrompt(finding, challenge, defense),
      maxTokens: 400,
    });

    const parsed = parseEvaluatorOutput(evaluation);

    const verdict: BenchVerdict = {
      findingId: finding.id,
      verdict: parsed.verdict,
      confidence: parsed.confidence,
      rationale: parsed.rationale,
      ...(parsed.revised !== undefined ? { revised: parsed.revised } : {}),
    };

    verdicts.push(verdict);
  }

  return verdicts;
};
