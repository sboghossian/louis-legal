/**
 * Tests for the opt-in /chat workflow dispatch (Wave 4). No real chat, no LLM;
 * uses a faked Response and the in-memory run store (no Supabase env). The queue
 * is the no-op shim without Redis, so enqueue reports `skipped` — exercised here.
 */
import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";

// Mock the queue so enqueue does not attempt a real Redis connection (which
// hangs without a server). Production enqueues for real; dispatch is opt-in.
vi.mock("../queue", () => ({
  queues: {
    workflows: {
      add: vi.fn(async () => ({
        id: "job-1",
        name: "workflows.run",
        queue: "workflows",
        skipped: true,
      })),
    },
  },
}));

import { parseWorkflowDispatch, streamWorkflowDispatch } from "./workflowChatDispatch";

function mockRes() {
  const writes: string[] = [];
  const res = {
    headers: {} as Record<string, string>,
    ended: false,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    write(s: string) {
      writes.push(s);
      return true;
    },
    end() {
      this.ended = true;
    },
    writes,
  };
  return res;
}

describe("parseWorkflowDispatch", () => {
  it("returns null for a normal chat body", () => {
    expect(parseWorkflowDispatch({ messages: [] })).toBeNull();
    expect(parseWorkflowDispatch({ workflowTemplateId: "  " })).toBeNull();
  });

  it("extracts a templateId and optional input", () => {
    expect(parseWorkflowDispatch({ workflowTemplateId: " contract-review " })).toEqual({
      templateId: "contract-review",
      input: undefined,
    });
    expect(
      parseWorkflowDispatch({ workflowTemplateId: "due-diligence", workflowInput: { matterId: "m1" } }),
    ).toEqual({ templateId: "due-diligence", input: { matterId: "m1" } });
  });

  it("ignores a non-object workflowInput", () => {
    expect(parseWorkflowDispatch({ workflowTemplateId: "x", workflowInput: "nope" })).toEqual({
      templateId: "x",
      input: undefined,
    });
  });
});

describe("streamWorkflowDispatch", () => {
  it("dispatches a known template: progress + workflow_dispatched + ends", async () => {
    const res = mockRes();
    await streamWorkflowDispatch(res as unknown as Response, {
      userId: "u1",
      templateId: "contract-review",
    });
    const out = res.writes.join("");
    expect(res.headers["Content-Type"]).toBe("text/event-stream");
    expect(out).toContain('"type":"workflow_progress"');
    expect(out).toContain('"type":"workflow_dispatched"');
    expect(out).toContain('"poll":"/api/workflows/');
    expect(res.ended).toBe(true);
  });

  it("emits an error frame for an unknown template", async () => {
    const res = mockRes();
    await streamWorkflowDispatch(res as unknown as Response, {
      userId: "u1",
      templateId: "nope",
    });
    const out = res.writes.join("");
    expect(out).toContain('"type":"error"');
    expect(res.ended).toBe(true);
  });
});
