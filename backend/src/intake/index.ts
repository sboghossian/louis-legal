/**
 * Barrel — public surface of the `intake` module.
 *
 * Re-exports everything a caller needs to wire the auto-brief feature into a
 * chat handler:
 *   - {@link shouldAutoBrief}   — pure predicate, call before any LLM.
 *   - {@link buildAutoBriefPrompt} — pure prompt builder, useful for logging /
 *     dry-runs.
 *   - {@link buildAutoBrief}    — async enrichment with an injected LLM.
 *   - Named threshold constants so callers can log or override them in tests.
 *   - Types: {@link LlmFn}, {@link BriefDocument}.
 */
export {
  shouldAutoBrief,
  buildAutoBriefPrompt,
  buildAutoBrief,
  SHORT_MESSAGE_WORD_THRESHOLD,
  STUB_REVIEW_RE,
  PER_DOC_CHAR_CAP,
  TOTAL_DOC_CHAR_CAP,
} from "./autoBrief";

export type { LlmFn, BriefDocument } from "./autoBrief";
