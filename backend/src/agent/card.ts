/**
 * Agent card — A2A-style discovery document for Louis.
 *
 * Served at GET /.well-known/agent.json so external agent orchestrators
 * (Claude, GPT, Gemini, custom A2A clients) can auto-discover Louis's
 * capabilities and reachable endpoints without reading the source.
 *
 * Spec reference: Google A2A agent discovery draft
 * https://google.github.io/A2A/#/documentation?id=agent-discovery
 *
 * Keep claims HONEST: list only what the backend actually exposes.
 */

/** Specification version this card conforms to. */
const AGENT_CARD_SPEC = "a2a-draft-0.1";

export interface AgentEndpoints {
  /** Conversational chat interface (REST + SSE stream) */
  chat: string;
  /** Document ingestion and retrieval */
  documents: string;
  /** Multi-step legal workflow templates */
  workflows: string;
  /**
   * Model Context Protocol surface — exposes clause library, risk scanner,
   * citation engine, EOS calculator, skill router, and legal flow templates
   * to external MCP clients.
   */
  mcp: string;
}

export interface AgentCapability {
  name: string;
  description: string;
}

export interface AgentCard {
  /** Spec version, so clients can gate on breaking changes. */
  spec: string;
  name: string;
  description: string;
  /** Semver version from package.json (or the `version` override option). */
  version: string;
  /** Human-readable URL for source code / docs. */
  homepage: string;
  /**
   * High-level capability descriptors.  Not a formal JSON-Schema tool list —
   * for that, point the client at `endpoints.mcp`.
   */
  capabilities: AgentCapability[];
  /** Absolute URLs (or paths when baseUrl is unknown) to each surface. */
  endpoints: AgentEndpoints;
}

export interface BuildAgentCardOptions {
  /**
   * Base URL of the running server, e.g. "https://api.louis.legal".
   * When omitted the card uses root-relative paths so it stays valid
   * even when the server is reached behind a tunnel or reverse proxy
   * with an unknown external hostname.
   */
  baseUrl?: string;
  /**
   * Override the default version string ("1.0.0").
   * The route handler derives this from the request; callers that
   * embed the card statically (e.g. tests) can pass it directly.
   */
  version?: string;
}

/**
 * Build an A2A-compliant agent card for Louis.
 *
 * Pure function — no I/O, no network, no env reads.
 * Safe to call in tests, serverless cold-paths, and static generators.
 */
export function buildAgentCard(opts: BuildAgentCardOptions = {}): AgentCard {
  const base = (opts.baseUrl ?? "").replace(/\/$/, "");
  const version = opts.version ?? "1.0.0";

  return {
    spec: AGENT_CARD_SPEC,
    name: "Louis",
    description:
      "Open-source legal-AI infrastructure for MENA and emerging markets. " +
      "Louis provides a BYO-key, privacy-first platform for lawyers and legal teams " +
      "with built-in clause library, contract risk scanning, citation formatting, " +
      "EOS calculators, 983-skill router, and multi-step legal workflow templates.",
    version,
    homepage: "https://github.com/sboghossian/louis-legal",
    capabilities: [
      {
        name: "chat",
        description:
          "Conversational legal assistant with document context, persona selection, " +
          "and per-project chat threads. Supports streaming (SSE).",
      },
      {
        name: "document-analysis",
        description:
          "Upload and query legal documents (PDF, DOCX, TXT). " +
          "Supports per-document and cross-document retrieval with clause extraction.",
      },
      {
        name: "workflow-orchestration",
        description:
          "Multi-step legal workflow templates: MSA negotiation, employment termination, " +
          "TM filing, litigation defense, GDPR/PDPL readiness. " +
          "Each workflow returns an ordered sequence of AI-assisted steps.",
      },
      {
        name: "mcp-tools",
        description:
          "Model Context Protocol surface exposing 10 named tools: " +
          "search_clauses, get_clause, calculate_eos, format_citation, " +
          "scan_contract_risk, list_skills, get_skill, route_skills, " +
          "list_legal_flows, get_legal_flow. " +
          "Authentication: Bearer token via /api/api-keys.",
      },
    ],
    endpoints: {
      chat: `${base}/chat`,
      documents: `${base}/single-documents`,
      workflows: `${base}/workflows`,
      mcp: `${base}/api/mcp`,
    },
  };
}
