/**
 * Derivatives registry (Slice 2e).
 *
 * Central lookup for the four run-to-document transforms. The orchestrator
 * calls `getDerivative(type)` after a run reaches `done`, builds the LLM
 * context via `derivative.buildContext(run)`, and forwards it to the injected
 * `LlmComplete`.
 *
 * No LLM, no network, no app imports — pure data mapping.
 */

import type { Derivative, DerivativeType } from "../contracts";
import { clientLetterDerivative } from "./clientLetter";
import { summaryDerivative } from "./summary";
import { redlineDerivative } from "./redline";
import { memoDerivative } from "./memo";

/**
 * All registered derivatives, keyed for O(1) lookup.
 * Add new entries here when new derivative types are introduced.
 */
export const DERIVATIVES: Record<DerivativeType, Derivative> = {
  "client-letter": clientLetterDerivative,
  "summary": summaryDerivative,
  "redline": redlineDerivative,
  "memo": memoDerivative,
};

/**
 * Return the derivative registered for `type`, or `undefined` if unknown.
 * The route handler should 404 on `undefined`.
 */
export function getDerivative(type: DerivativeType): Derivative | undefined {
  return DERIVATIVES[type];
}

/**
 * Return all registered derivatives as a fresh array (safe to sort/filter by
 * callers without mutating the registry).
 */
export function listDerivatives(): Derivative[] {
  return Object.values(DERIVATIVES) as Derivative[];
}
