/**
 * Auto-Brief — given a short user message and one or more attached documents,
 * read the documents and synthesise the actual task the user wants answered.
 *
 * Why this exists:
 *   Real client engagements start with a covering email + an attached contract.
 *   The cover email contains the questions and the deadline. The user should not
 *   have to retype that into the Louis prompt — the covering document IS the
 *   briefing. This module detects that pattern and constructs an enriched
 *   briefing automatically so the orchestrator receives substance, not a stub.
 *
 * Architecture:
 *   - All detection + prompt-building functions are PURE (no I/O, no side
 *     effects) so they are trivially unit-testable.
 *   - The LLM is injected via {@link LlmFn} so callers own model choice,
 *     retry policy, and cost tracking. No LLM is ever called from this module
 *     during unit tests.
 *   - Safe-fail: if {@link buildAutoBrief} throws, the caller should fall back
 *     to the original message unchanged. Auto-enrichment is best-effort.
 *
 * Cost estimate (with a Sonnet-class model):
 *   ~3–6k input tokens + ~600 output tokens ≈ $0.02–0.06 per trigger.
 */

// ---------------------------------------------------------------------------
// Threshold constants — named so tests and callers can import them directly.
// ---------------------------------------------------------------------------

/**
 * Messages with at most this many words are considered "short" and may trigger
 * auto-brief (together with the attachedDocCount check).
 */
export const SHORT_MESSAGE_WORD_THRESHOLD = 15;

/**
 * Regex stubs that signal the user wants a document reviewed rather than a
 * free-form question answered. Case-insensitive at runtime.
 *
 * Covers patterns like:
 *   "review this", "look at this", "check this", "thoughts?",
 *   "take a look", "what do you think", "any thoughts", "can you review"
 */
export const STUB_REVIEW_RE =
  /\b(?:review\s+this|look\s+at\s+this|check\s+this(?:\s+out)?|thoughts\??|take\s+a\s+look|what\s+do\s+you\s+think|any\s+thoughts|can\s+you\s+review)\b/i;

/**
 * Maximum characters taken from a single document. Biased 70% head / 30% tail
 * so both the opening context and any trailing deadlines/format notes survive.
 */
export const PER_DOC_CHAR_CAP = 8_000;

/**
 * Hard cap on total prompt characters contributed by all documents combined.
 * Prevents runaway token consumption when many large files are attached.
 */
export const TOTAL_DOC_CHAR_CAP = 24_000;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Injected LLM callable. The caller supplies model selection, retries, and
 * timeout — this module only constructs the prompt and interprets the result.
 *
 * @param prompt - The assembled user-turn prompt (system prompt included by
 *   convention in the string; callers may split it if their provider prefers a
 *   separate system field).
 * @returns The model's text response.
 */
export type LlmFn = (prompt: string) => Promise<string>;

/** A single attached document supplied to the brief builder. */
export interface BriefDocument {
  /** Display name / filename of the document (used in the prompt). */
  filename: string;
  /** Extracted plain text of the document. */
  text: string;
}

// ---------------------------------------------------------------------------
// Pure helpers (internal)
// ---------------------------------------------------------------------------

/**
 * Count whitespace-separated words in a string.
 * Returns 0 for blank / empty input.
 */
function wordCount(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Clip `text` to at most `maxChars`, preserving 70 % from the head and 30 %
 * from the tail with a `[…]` separator so both the opening context (the ask)
 * and any trailing deadline/format notes survive in a long document.
 */
function clipText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.7));
  const tail = text.slice(-Math.floor(maxChars * 0.3));
  return `${head}\n[…]\n${tail}`;
}

// ---------------------------------------------------------------------------
// Exported pure functions
// ---------------------------------------------------------------------------

/**
 * Pure predicate — decide whether a user turn should trigger auto-brief.
 *
 * Returns `true` when BOTH of the following hold:
 *   1. The message is "short": word count ≤ {@link SHORT_MESSAGE_WORD_THRESHOLD}
 *      OR it matches {@link STUB_REVIEW_RE} (e.g. "review this", "thoughts?").
 *   2. At least one document is attached (`attachedDocCount >= 1`).
 *
 * @param input.message         - The raw user message text.
 * @param input.attachedDocCount - Number of documents attached to the turn.
 * @returns `true` if auto-brief should be triggered.
 */
export function shouldAutoBrief(input: {
  message: string;
  attachedDocCount: number;
}): boolean {
  const { message, attachedDocCount } = input;
  if (attachedDocCount < 1) return false;

  const isShortByWordCount = wordCount(message) <= SHORT_MESSAGE_WORD_THRESHOLD;
  const isStubPhrase = STUB_REVIEW_RE.test(message);

  return isShortByWordCount || isStubPhrase;
}

/**
 * Pure prompt builder — assembles the full prompt string for the enrichment
 * LLM call.
 *
 * Document text is bounded per-document ({@link PER_DOC_CHAR_CAP}) and in
 * aggregate ({@link TOTAL_DOC_CHAR_CAP}). Both the user's thin message and all
 * document filenames appear verbatim so the model can reference them.
 *
 * @param input.message   - The user's short message.
 * @param input.documents - Documents attached to the turn (filename + text).
 * @returns A single string prompt ready to pass to {@link LlmFn}.
 */
export function buildAutoBriefPrompt(input: {
  message: string;
  documents: BriefDocument[];
}): string {
  const { message, documents } = input;

  // Build document blocks, honouring per-doc and total char caps.
  let totalCharsUsed = 0;
  const docBlocks: string[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const remaining = TOTAL_DOC_CHAR_CAP - totalCharsUsed;
    if (remaining <= 0) break;

    const excerpt = clipText(doc.text, Math.min(PER_DOC_CHAR_CAP, remaining));
    totalCharsUsed += excerpt.length;
    docBlocks.push(`### Document ${i + 1}: ${doc.filename}\n${excerpt}`);
  }

  const docSection =
    docBlocks.length > 0
      ? docBlocks.join("\n\n")
      : "(no document text available)";

  return `You are a legal briefing assistant. Read the attached documents and extract the legal task the client actually wants answered.

INSTRUCTIONS
Produce a single enriched briefing paragraph that an orchestrating partner can read to understand the engagement. Include, in this order, only the items actually present in the documents:
  1. WHO the client is and their position (e.g. "Acting for Cobaridge Resources (40% participant) in a 40/60 JV").
  2. The COUNTERPARTY and the asset or matter.
  3. The CORE ASK in one sentence.
  4. Any SPECIFIC QUESTIONS — list them numbered, one sentence each.
  5. JURISDICTION / governing law if stated.
  6. DEADLINE if stated.
  7. FORMAT requested (e.g. "numbered responses + executive summary").
  8. Anything that should be FLAGGED FOR SPECIALIST referral.

RULES
- Use only what is present in the user's instruction or the documents. Do not invent parties or facts.
- If the documents do not contain a clear legal question, return exactly: INSUFFICIENT_BRIEF: the attached documents do not contain a clear legal question.
- No commentary, no meta-language, no preamble. Just the briefing itself.
- Stay under 500 words.

---

## User's brief instruction
"${(message ?? "").trim() || "(blank)"}"

## Attached documents

${docSection}

---

Synthesise the enriched briefing now.`;
}

/**
 * Async enrichment entry-point — build the auto-brief via an injected LLM.
 *
 * Calls {@link buildAutoBriefPrompt} to assemble the prompt, then delegates
 * to `input.llm`. The returned string is the enriched briefing ready to
 * replace or prepend to the original user message in the orchestrator.
 *
 * The caller is responsible for safe-fail handling: if this throws, fall back
 * to the original message unchanged.
 *
 * @param input.message   - The user's short message.
 * @param input.documents - Attached documents (filename + extracted text).
 * @param input.llm       - Injected LLM callable.
 * @returns The enriched briefing string from the model.
 */
export async function buildAutoBrief(input: {
  message: string;
  documents: BriefDocument[];
  llm: LlmFn;
}): Promise<string> {
  const { message, documents, llm } = input;
  const prompt = buildAutoBriefPrompt({ message, documents });
  const result = await llm(prompt);
  return result.trim();
}
