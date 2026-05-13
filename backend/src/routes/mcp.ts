/**
 * MCP server — Louis exposes its legal tools to external AI clients via
 * the Model Context Protocol.
 *
 * Spec: https://spec.modelcontextprotocol.io/
 *
 * This is a transport-light implementation: we expose the JSON-RPC over HTTP
 * shape (`POST /api/mcp/{method}`) plus the discovery endpoints. Clients can
 * point Claude / GPT / etc. at the URL and instantly get access to Louis's
 * calculators, clause library, risk scanner, citation engine, etc.
 *
 * Authentication: `Authorization: Bearer <token>` where token is provisioned
 * per tenant in /integrations/mcp-server.
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { searchClauses, getClause } from "../clauses/_data";
import { computeEOS } from "../calculators/eos";
import { formatAll, CitationStyle, formatCitation } from "../citations/_engine";
import { scanContract } from "../risk/_engine";
import { listFlows, getFlow } from "../legalFlows/_templates";
import { listSkills, getSkill } from "../skills/_loader";
import { routeAsync } from "../skills/_router";

export const mcpRouter = Router();

// --- Discovery ---------------------------------------------------------
const SERVER_INFO = {
  name: "louis-legal",
  version: "1.0.0",
  description: "Louis — MENA-first legal AI infrastructure. Exposes clause library, risk scanner, citation engine, EOS calculator, skill router, and legal flow templates via MCP.",
  vendor: "HAQQ Inc",
  homepage: "https://github.com/sboghossian/louis-legal",
};

interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const TOOLS: ToolDef[] = [
  {
    name: "search_clauses",
    description: "Search Louis's curated clause library by category, jurisdiction, language, and position. Returns vetted clauses with drafting notes and risk flags.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", description: "e.g., governing-law, dispute-resolution, indemnity, confidentiality, non-compete, force-majeure, data-protection, sanctions-compliance, anti-bribery, limitation-of-liability, ip-ownership" },
        jurisdiction: { type: "string", description: "UAE-DIFC, UAE-ADGM, KSA, LB, UK, US-NY, FR, EU, __multi__, __cross-border__" },
        language: { type: "string", enum: ["en", "ar", "fr"] },
        position: { type: "string", enum: ["neutral", "party-A", "party-B"] },
        q: { type: "string", description: "Free-text search" },
      },
    },
  },
  {
    name: "get_clause",
    description: "Get a single clause by id, with full body + drafting notes + risk flags + alternates.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "calculate_eos",
    description: "Compute statutory end-of-service gratuity for GCC employment termination. Supports UAE, KSA, BH, QA, OM, KW with citations.",
    input_schema: {
      type: "object",
      properties: {
        jurisdiction: { type: "string", enum: ["UAE", "KSA", "BH", "QA", "OM", "KW"] },
        basicSalaryMonthly: { type: "number", description: "Monthly basic salary in local currency" },
        serviceDays: { type: "number", description: "Total days of service (years × 365)" },
        endedByResignation: { type: "boolean" },
        dismissedForCause: { type: "boolean" },
      },
      required: ["jurisdiction", "basicSalaryMonthly", "serviceDays"],
    },
  },
  {
    name: "format_citation",
    description: "Format a legal source (case / statute / regulation / treaty / secondary) in 9 citation styles: Bluebook, OSCOLA, DIFC, ADGM, KSA-gazette, UAE-federal, LB-gazette, FR-dalloz, EU-ECLI.",
    input_schema: {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            sourceType: { type: "string", enum: ["case", "statute", "regulation", "treaty", "secondary"] },
            caseName: { type: "string" },
            caseYear: { type: "number" },
            court: { type: "string" },
            citation: { type: "string" },
            statuteName: { type: "string" },
            statuteNumber: { type: "string" },
            article: { type: "string" },
          },
          required: ["sourceType"],
        },
        style: { type: "string", description: "If omitted, returns all styles" },
      },
      required: ["input"],
    },
  },
  {
    name: "scan_contract_risk",
    description: "Rule-based contract risk scanner. Detects 30+ red flags across liability, indemnity, IP, data-protection, sanctions, anti-bribery, drafting quality. Returns P0-P3 findings + 0-100 risk score + linked-clause fixes.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The contract text to scan" },
        jurisdiction: { type: "string", description: "Optional, narrows rule applicability" },
      },
      required: ["text"],
    },
  },
  {
    name: "list_skills",
    description: "List Louis's 982-skill library with filters (category, status, priority).",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string" },
        priority: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
        q: { type: "string" },
      },
    },
  },
  {
    name: "get_skill",
    description: "Get a single skill's full system prompt body + frontmatter.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "route_skills",
    description: "Run Louis's skill router on a free-text message. Returns the 8-13 skills that would fire for that turn, with the composed system prompt.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        persona: { type: "string", enum: ["partner", "associate", "junior", "in-house-counsel", "louis-twin"] },
      },
      required: ["message"],
    },
  },
  {
    name: "list_legal_flows",
    description: "List Louis's multi-step legal workflow templates (MSA negotiation, employment termination, TM filing, litigation defense, GDPR/PDPL readiness).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_legal_flow",
    description: "Get a single legal flow's full step-by-step recipe.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
];

// MCP discovery endpoint — info + tool list
mcpRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    ...SERVER_INFO,
    capabilities: {
      tools: { listChanged: false },
      resources: {},
      prompts: {},
    },
    endpoints: {
      tools_list: "/api/mcp/tools",
      tools_call: "/api/mcp/call",
    },
    tool_count: TOOLS.length,
  });
});

mcpRouter.get("/tools", (_req: Request, res: Response) => {
  res.json({ tools: TOOLS });
});

// Tool call — JSON-RPC-like shape. Auth-gated because these actually run
// LLM-adjacent operations against the caller's data. Discovery (GET /,
// GET /tools) is intentionally public so MCP clients can negotiate before
// they have a token.
mcpRouter.post("/call", requireAuth, async (req: Request, res: Response) => {
  const { name, arguments: args } = req.body ?? {};
  if (!name) { res.status(400).json({ error: { code: -32602, message: "name required" } }); return; }

  try {
    const result = await dispatch(name, args ?? {});
    res.json({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
  } catch (e) {
    res.status(500).json({ error: { code: -32603, message: (e as Error).message } });
  }
});

async function dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "search_clauses":
      return { results: searchClauses(args as any) };
    case "get_clause": {
      const clause = getClause(args.id as string);
      if (!clause) throw new Error(`clause not found: ${args.id}`);
      return clause;
    }
    case "calculate_eos":
      return computeEOS(args as any);
    case "format_citation": {
      const { input, style } = args as { input: any; style?: CitationStyle };
      if (style) return formatCitation(input, style);
      return { results: formatAll(input, ["bluebook", "oscola", "difc", "adgm", "ksa-gazette", "uae-federal", "lb-gazette", "fr-dalloz", "eu-ecli"]) };
    }
    case "scan_contract_risk":
      return scanContract(args as any);
    case "list_skills": {
      const { category, priority, q } = args as { category?: string; priority?: string; q?: string };
      let skills = listSkills();
      if (category) skills = skills.filter(s => s.category === category);
      if (priority) skills = skills.filter(s => s.priority === priority);
      if (q) {
        const needle = q.toLowerCase();
        skills = skills.filter(s => (s.id + " " + s.name).toLowerCase().includes(needle));
      }
      return { total: skills.length, skills: skills.slice(0, 50) };
    }
    case "get_skill": {
      const skill = getSkill(args.id as string);
      if (!skill) throw new Error(`skill not found: ${args.id}`);
      return skill;
    }
    case "route_skills": {
      const { message, persona } = args as { message: string; persona?: any };
      return await routeAsync({
        message,
        persona: persona || "associate",
        surface: "web",
        hasDocuments: false,
      });
    }
    case "list_legal_flows":
      return { flows: listFlows() };
    case "get_legal_flow": {
      const flow = getFlow(args.id as string);
      if (!flow) throw new Error(`flow not found: ${args.id}`);
      return flow;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
