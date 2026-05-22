/**
 * Public barrel for the derivatives module (Slice 2e).
 *
 * Wiring note for the lead (route handler):
 *   1. Load run via `runStore.get(runId)` — return 404 if not found or not
 *      owned by the authenticated user (`run.userId !== req.user.id`).
 *   2. Return 409 if `run.status !== "done"` (derivatives require a completed run).
 *   3. Call `getDerivative(type)` — return 404 if the type is not registered.
 *   4. Call `llm({ ...derivative.buildContext(run) })` using the injected
 *      `LlmComplete` (wired over the user's API keys in the orchestrator).
 *   5. Return the text result to the client (200 text/plain or JSON wrapper).
 *
 * Route signature (per lead spec):
 *   POST /api/workflows/:runId/derivatives/:type
 */
export { getDerivative, listDerivatives, DERIVATIVES } from "./registry";
export { clientLetterDerivative } from "./clientLetter";
export { summaryDerivative } from "./summary";
export { redlineDerivative } from "./redline";
export { memoDerivative } from "./memo";
