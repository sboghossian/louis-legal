/**
 * Public API barrel for the zero-LLM grounding verifier (Processor v2, AC2).
 *
 * Integration point: import { verifyGrounding } from "@/grounding" and call it
 * with the finding text + parsed document to attach a grounding score/badge to
 * the /chat response.
 */
export { verifyGrounding } from "./verifier";
export type {
  GroundingInput,
  GroundingDocument,
  GroundingResult,
} from "./types";
