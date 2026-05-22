/**
 * Tests for the Wave 4 A2A↔MCP task bridge.
 *
 * Pure unit tests:
 *  • No server is booted.
 *  • No network calls are made.
 *  • `callTool` is always a fake in-test function.
 */

import { describe, it, expect, vi } from "vitest";
import { runAgentTask } from "./task";
import type { A2ATaskRequest, A2ATaskResult } from "./task";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCallTool(
  behaviour:
    | { mode: "success"; value: unknown }
    | { mode: "throw"; message: string }
    | { mode: "unknown" },
) {
  return vi.fn(async (name: string, _args: Record<string, unknown>): Promise<unknown> => {
    if (behaviour.mode === "success") return behaviour.value;
    if (behaviour.mode === "throw") throw new Error(behaviour.message);
    // mode === "unknown"
    throw new Error(`Unknown tool: ${name}`);
  });
}

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

describe("runAgentTask — success path", () => {
  it("returns ok:true with output when callTool resolves", async () => {
    const fakeOutput = { results: [{ id: "cl-001", text: "sample clause" }] };
    const callTool = makeCallTool({ mode: "success", value: fakeOutput });

    const req: A2ATaskRequest = {
      skill: "search_clauses",
      input: { category: "confidentiality", jurisdiction: "UAE-DIFC" },
    };

    const result = await runAgentTask(req, callTool);

    expect(result.ok).toBe(true);
    expect(result.skill).toBe("search_clauses");
    expect(result.output).toEqual(fakeOutput);
    expect(result.error).toBeUndefined();
  });

  it("forwards the skill name unchanged as the MCP tool name", async () => {
    const callTool = makeCallTool({ mode: "success", value: {} });

    await runAgentTask({ skill: "calculate_eos", input: { jurisdiction: "UAE" } }, callTool);

    expect(callTool).toHaveBeenCalledWith("calculate_eos", { jurisdiction: "UAE" });
  });

  it("uses an empty object as args when input is omitted", async () => {
    const callTool = makeCallTool({ mode: "success", value: [] });

    await runAgentTask({ skill: "list_legal_flows" }, callTool);

    expect(callTool).toHaveBeenCalledWith("list_legal_flows", {});
  });

  it("preserves complex nested output verbatim", async () => {
    const nested = { a: { b: [1, 2, 3] }, c: true };
    const callTool = makeCallTool({ mode: "success", value: nested });

    const result = await runAgentTask({ skill: "scan_contract_risk", input: { text: "contract..." } }, callTool);

    expect(result.output).toEqual(nested);
  });

  it("trims whitespace from skill before forwarding to callTool", async () => {
    const callTool = makeCallTool({ mode: "success", value: null });

    const result = await runAgentTask({ skill: "  get_clause  ", input: { id: "cl-42" } }, callTool);

    expect(result.ok).toBe(true);
    expect(result.skill).toBe("get_clause");
    expect(callTool).toHaveBeenCalledWith("get_clause", { id: "cl-42" });
  });
});

// ---------------------------------------------------------------------------
// Error path — callTool throws
// ---------------------------------------------------------------------------

describe("runAgentTask — callTool throws", () => {
  it("returns ok:false with error when callTool throws", async () => {
    const callTool = makeCallTool({ mode: "throw", message: "skill not found: bad-skill" });

    const result = await runAgentTask({ skill: "bad-skill" }, callTool);

    expect(result.ok).toBe(false);
    expect(result.skill).toBe("bad-skill");
    expect(result.error).toBe("skill not found: bad-skill");
    expect(result.output).toBeUndefined();
  });

  it("returns ok:false with error when the tool is unknown", async () => {
    const callTool = makeCallTool({ mode: "unknown" });

    const result = await runAgentTask({ skill: "nonexistent_tool" }, callTool);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Unknown tool/i);
  });

  it("never throws even when callTool rejects", async () => {
    const callTool = vi.fn(async () => {
      throw new TypeError("unexpected type failure");
    });

    await expect(runAgentTask({ skill: "some_tool" }, callTool)).resolves.not.toThrow();

    const result: A2ATaskResult = await runAgentTask({ skill: "some_tool" }, callTool);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("unexpected type failure");
  });

  it("captures non-Error rejections as string", async () => {
    const callTool = vi.fn(async (): Promise<unknown> => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "string rejection";
    });

    const result = await runAgentTask({ skill: "any_tool" }, callTool);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("string rejection");
  });
});

// ---------------------------------------------------------------------------
// Validation — bad / missing skill
// ---------------------------------------------------------------------------

describe("runAgentTask — validation", () => {
  it("returns ok:false when skill is an empty string", async () => {
    const callTool = makeCallTool({ mode: "success", value: null });

    const result = await runAgentTask({ skill: "" }, callTool);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/skill is required/i);
    expect(callTool).not.toHaveBeenCalled();
  });

  it("returns ok:false when skill is only whitespace", async () => {
    const callTool = makeCallTool({ mode: "success", value: null });

    const result = await runAgentTask({ skill: "   " }, callTool);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/skill is required/i);
    expect(callTool).not.toHaveBeenCalled();
  });

  it("returns ok:false when skill is missing (cast for JS callers)", async () => {
    const callTool = makeCallTool({ mode: "success", value: null });

    // Simulate a JS caller sending no skill field.
    const result = await runAgentTask(
      { skill: undefined as unknown as string },
      callTool,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/skill is required/i);
    expect(callTool).not.toHaveBeenCalled();
  });

  it("does not call callTool on any validation failure", async () => {
    const callTool = makeCallTool({ mode: "success", value: "should not reach" });

    await runAgentTask({ skill: "" }, callTool);
    await runAgentTask({ skill: "   " }, callTool);

    expect(callTool).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Result shape invariants
// ---------------------------------------------------------------------------

describe("runAgentTask — result shape", () => {
  it("always includes the ok flag", async () => {
    const callTool = makeCallTool({ mode: "success", value: null });
    const result = await runAgentTask({ skill: "list_skills" }, callTool);
    expect(typeof result.ok).toBe("boolean");
  });

  it("always includes the skill field that matches the normalised skill name", async () => {
    const callTool = makeCallTool({ mode: "success", value: null });
    const result = await runAgentTask({ skill: " route_skills " }, callTool);
    expect(result.skill).toBe("route_skills");
  });
});
