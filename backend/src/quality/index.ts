/**
 * Legal-Design quality suite — barrel export (Louis quality suite).
 *
 * Three self-contained modules, all deterministic (no LLM, no network):
 *
 *   - {@link ethicsAudit} — dark-pattern detection via regex/string heuristics
 *   - {@link plainLanguage} — Flesch-Kincaid readability scoring + jargon detection
 *   - {@link meaningPreservation} — diff-based risk flagging for simplification passes
 *
 * Each module also exports an LLM-ready prompt-pack string for use in a
 * downstream rewrite or audit pass:
 *   - {@link PLAIN_LANGUAGE_GUIDANCE}
 *   - {@link MEANING_PRESERVATION_PROTOCOL}
 *
 * @module quality
 */

export type { EthicsFinding, Severity } from "./ethicsAudit";
export { runEthicsAudit } from "./ethicsAudit";

export type { ReadabilityScore } from "./plainLanguage";
export { scoreReadability, PLAIN_LANGUAGE_GUIDANCE } from "./plainLanguage";

export type { RiskFlag, RiskLevel } from "./meaningPreservation";
export { diffRiskFlags, MEANING_PRESERVATION_PROTOCOL } from "./meaningPreservation";
