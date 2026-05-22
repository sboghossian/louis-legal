/**
 * Agent module barrel.
 *
 * Re-exports the card builder (for programmatic use / tests) and the
 * Express router (for mounting in src/index.ts).
 */

export type { AgentCard, AgentCapability, AgentEndpoints, BuildAgentCardOptions } from "./card";
export { buildAgentCard } from "./card";
export { agentCardRouter } from "./route";
