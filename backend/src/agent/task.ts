/**
 * Wave 4 — A2A↔MCP task bridge.
 *
 * Accepts A2A-style task requests (a `skill` name + optional `input` map),
 * maps them onto Louis's MCP tool surface, and returns a structured result.
 *
 * Design notes
 * ─────────────
 * • `runAgentTask` is a pure async function that never throws — all errors
 *   are caught and returned as `{ ok: false, error }`.  This makes it safe
 *   to call from any context (HTTP handler, queued job, test).
 *
 * • `callTool` is injected so the function stays testable without a running
 *   server.  The HTTP route injects a thin local dispatcher that mirrors the
 *   private `dispatch()` function in routes/mcp.ts (which is intentionally
 *   not exported — importing it would require editing that file, violating
 *   the Wave 4 constraint).  The injected dispatcher accepts the same
 *   signature so it can be swapped for any compatible implementation.
 *
 * Endpoint: POST /.well-known/agent/task
 * Auth:     none at the transport layer (A2A trust model); real auth lives
 *           in the MCP tool calls themselves where needed.
 */

import { Router, Request, Response } from "express";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface A2ATaskRequest {
  /** A2A skill name — maps 1-to-1 onto an MCP tool name. */
  skill: string;
  /** Arbitrary input payload forwarded verbatim as MCP tool arguments. */
  input?: Record<string, unknown>;
}

export interface A2ATaskResult {
  ok: boolean;
  skill: string;
  /** Unwrapped MCP tool output on success. */
  output?: unknown;
  /** Human-readable error message on failure. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Execute an A2A task by delegating to the injected MCP tool dispatcher.
 *
 * @param req      - The inbound A2A task request.
 * @param callTool - Dispatcher that accepts `(toolName, args)` and resolves
 *                   to the raw MCP tool output.  Matches the private
 *                   `dispatch` signature in routes/mcp.ts.
 * @returns        - A settled result; never rejects.
 */
export async function runAgentTask(
  req: A2ATaskRequest,
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>,
): Promise<A2ATaskResult> {
  // Structural validation — skill is required and must be a non-empty string.
  if (!req.skill || typeof req.skill !== "string" || req.skill.trim() === "") {
    return { ok: false, skill: req.skill ?? "", error: "skill is required" };
  }

  const toolName = req.skill.trim();
  const args = req.input ?? {};

  try {
    const output = await callTool(toolName, args);
    return { ok: true, skill: toolName, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, skill: toolName, error: message };
  }
}

// ---------------------------------------------------------------------------
// Local MCP dispatcher
// ---------------------------------------------------------------------------
// Mirrors the private `dispatch()` in routes/mcp.ts without importing it
// (which would require editing that file).  Lazy dynamic imports keep the
// bundle identical — these modules are already loaded by the main MCP route.

async function localDispatch(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "search_clauses": {
      const { searchClauses } = await import("../clauses/_data");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { results: searchClauses(args as any) };
    }
    case "get_clause": {
      const { getClause } = await import("../clauses/_data");
      const clause = getClause(args.id as string);
      if (!clause) throw new Error(`clause not found: ${args.id as string}`);
      return clause;
    }
    case "calculate_eos": {
      const { computeEOS } = await import("../calculators/eos");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return computeEOS(args as any);
    }
    case "format_citation": {
      const { formatAll, formatCitation } = await import("../citations/_engine");
      const { input, style } = args as {
        input: Parameters<typeof formatCitation>[0];
        style?: Parameters<typeof formatCitation>[1];
      };
      if (style) return formatCitation(input, style);
      return {
        results: formatAll(input, [
          "bluebook",
          "oscola",
          "difc",
          "adgm",
          "ksa-gazette",
          "uae-federal",
          "lb-gazette",
          "fr-dalloz",
          "eu-ecli",
        ]),
      };
    }
    case "scan_contract_risk": {
      const { scanContract } = await import("../risk/_engine");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return scanContract(args as any);
    }
    case "list_skills": {
      const { listSkills } = await import("../skills/_loader");
      const { category, priority, q } = args as {
        category?: string;
        priority?: string;
        q?: string;
      };
      let skills = listSkills();
      if (category) skills = skills.filter((s) => s.category === category);
      if (priority) skills = skills.filter((s) => s.priority === priority);
      if (q) {
        const needle = q.toLowerCase();
        skills = skills.filter((s) =>
          (s.id + " " + s.name).toLowerCase().includes(needle),
        );
      }
      return { total: skills.length, skills: skills.slice(0, 50) };
    }
    case "get_skill": {
      const { getSkill } = await import("../skills/_loader");
      const skill = getSkill(args.id as string);
      if (!skill) throw new Error(`skill not found: ${args.id as string}`);
      return skill;
    }
    case "route_skills": {
      const { routeAsync } = await import("../skills/_router");
      const { message, persona } = args as {
        message: string;
        persona?: "partner" | "associate" | "junior" | "in-house-counsel" | "louis-twin";
      };
      return await routeAsync({
        message,
        persona: persona ?? "associate",
        surface: "web",
        hasDocuments: false,
      });
    }
    case "list_legal_flows": {
      const { listFlows } = await import("../legalFlows/_templates");
      return { flows: listFlows() };
    }
    case "get_legal_flow": {
      const { getFlow } = await import("../legalFlows/_templates");
      const flow = getFlow(args.id as string);
      if (!flow) throw new Error(`flow not found: ${args.id as string}`);
      return flow;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Express router
// ---------------------------------------------------------------------------

export const agentTaskRouter = Router();

/**
 * POST /.well-known/agent/task
 *
 * Body: { skill: string; input?: Record<string, unknown> }
 * Response 200: A2ATaskResult
 * Response 400: A2ATaskResult with ok:false + error
 */
agentTaskRouter.post(
  "/.well-known/agent/task",
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Partial<A2ATaskRequest>;

    // Early validation — surface 400 before touching any tool.
    if (!body.skill || typeof body.skill !== "string" || body.skill.trim() === "") {
      const result: A2ATaskResult = {
        ok: false,
        skill: typeof body.skill === "string" ? body.skill : "",
        error: "skill is required",
      };
      res.status(400).json(result);
      return;
    }

    const taskReq: A2ATaskRequest = {
      skill: body.skill.trim(),
      input: body.input,
    };

    const result = await runAgentTask(taskReq, localDispatch);

    // runAgentTask never throws, but signal caller errors as 400 when the
    // tool itself reports an "unknown tool" or bad-argument failure.
    const status = result.ok ? 200 : 400;
    res.status(status).json(result);
  },
);
