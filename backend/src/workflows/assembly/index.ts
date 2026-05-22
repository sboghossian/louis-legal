/**
 * Barrel for the Slice 2d assembly module.
 *
 * Exports the three orchestrator-facing functions:
 *   - {@link assembleDeliverable} — LLM-based document assembly from run findings.
 *   - {@link validateDeliverable} — mechanical structural rejection (no LLM).
 *   - {@link verifyFidelity} — mechanical RED-coverage check (+ optional LLM spot-check).
 *
 * The orchestrator calls these in sequence as the final phase of a workflow run:
 *   1. assembleDeliverable(run, llm)          → deliverable text
 *   2. validateDeliverable(deliverable)        → {ok, problems[]}
 *   3. verifyFidelity(run, deliverable, llm?)  → {ok, redTotal, redCovered, missing[]}
 *
 * If either check fails the orchestrator should retry assembly or transition
 * the run to "failed" with an appropriate error message.
 */

export { assembleDeliverable, orderFindings } from "./assemble";
export { validateDeliverable } from "./validate";
export { verifyFidelity } from "./fidelity";
