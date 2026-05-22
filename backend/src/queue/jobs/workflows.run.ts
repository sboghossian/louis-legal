/**
 * Job: workflows.run
 *
 * Runs (or resumes) a workflow orchestration OUTSIDE the `/chat` SSE turn
 * (ADR #1: one engine, two triggers). Wraps {@link runWorkflow}, building the
 * orchestrator's injected deps from the real Processor v2 primitives: the run
 * store, the provider-agnostic `completeText` as the llm, the cost governor's
 * `modelForTier`, and the four-tier memory context.
 *
 * Trigger: `POST /api/workflows` enqueues this with `{ runId }`; the gate-resume
 * route (`POST /api/workflows/:runId/approve`) re-enqueues the same job, and the
 * engine continues from the run's persisted cursor.
 *
 * The Full-Bench (2c) and assembly/validation/fidelity (2d) hooks are injected
 * here at integration — see the marked block below.
 */

import { buildMemoryContext } from "../../memory/context";
import { memoryStore } from "../../memory/factory";
import { verifyGrounding } from "../../grounding/verifier";
import { completeText } from "../../lib/llm";
import { modelForTier } from "../../lib/llm/models";
import { runWorkflow, type OrchestratorDeps } from "../../workflows/orchestrator";
import { runFullBench } from "../../workflows/fullBench";
import { getTemplate } from "../../workflows/templates/registry";
import { runStore } from "../../workflows/factory";

export const JOB_NAME = "workflows.run";

export interface WorkflowsRunJobData {
  runId: string;
  userId: string;
  templateId: string;
}

export interface WorkflowsRunResult {
  runId: string;
  status: string;
}

interface JobLike {
  data: WorkflowsRunJobData;
  log?: (msg: string) => Promise<void> | void;
}

/** Provider whose tier→model mapping the workflow engine uses (server default). */
const WORKFLOW_PROVIDER = "claude" as const;

export async function handleWorkflowsRun(job: JobLike): Promise<WorkflowsRunResult> {
  const { runId, templateId } = job.data;
  await job.log?.(`workflows.run run=${runId} template=${templateId}`);

  const template = getTemplate(templateId);
  if (!template) throw new Error(`workflows.run: unknown template "${templateId}"`);

  const deps: OrchestratorDeps = {
    store: runStore,
    llm: (params) => completeText(params),
    modelForTier: (tier) => modelForTier(tier, WORKFLOW_PROVIDER),
    memory: async ({ userId }) => (await buildMemoryContext(memoryStore, { userId })).block,
    grounding: (findingText, documentText) => {
      const r = verifyGrounding({ findingText, document: { text: documentText } });
      return { score: r.score, unmatched: r.unmatched };
    },
    // Bounded adversarial Full-Bench over RED findings (2c).
    fullBench: runFullBench,
    // --- assembly hooks wired when the 2d core lands ---
    // assemble: assembleDeliverable,
    // validate: validateDeliverable,
    // fidelity: verifyFidelity,
  };

  const run = await runWorkflow(deps, { template, runId });
  await job.log?.(`workflows.run run=${runId} → ${run.status}`);
  return { runId, status: run.status };
}
