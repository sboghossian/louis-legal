/**
 * Workflow orchestrator engine (Wave 2, Slice 2b — the spine).
 *
 * Sequences a {@link WorkflowTemplate}'s steps over the Processor v2 primitives,
 * which are INJECTED as {@link OrchestratorDeps} for testability — there is no
 * hard dependency on the router / memory / llm / grounding modules here, so the
 * engine is unit-testable with fakes and the real wiring lives in the BullMQ job.
 *
 * Per step: route (skill) → memory context → cost-governor model → llm → optional
 * grounding check on doc-citing output. Steps emit severity-tagged
 * {@link Finding}s parsed from a simple tagged-line convention.
 *
 * Lifecycle (persisted via {@link WorkflowRunStore}):
 *   queued → running → (gated → running)* → assembling → done | failed
 *
 * Gates encode the /lecun-world-model stance (ADR #5): the engine PAUSES before a
 * gated/side-effect step and returns `gated`; it only executes that step after an
 * explicit approval re-enters the engine. The engine is therefore RESUMABLE —
 * it continues from the run's persisted `currentStepIndex`.
 *
 * Full-Bench (2c), assembly (2d), and fidelity (2d) are OPTIONAL injected hooks:
 * present → used; absent → a built-in fallback assembler runs so the engine is
 * complete on its own. The real cores are injected at integration.
 */

import crypto from "crypto";

import type {
  AssembleDeliverable,
  LlmComplete,
  ModelForTier,
  RunFullBench,
  ValidateDeliverable,
  VerifyFidelity,
} from "./contracts";
import type {
  Finding,
  FindingSeverity,
  WorkflowRun,
  WorkflowRunStore,
  WorkflowStep,
  WorkflowTemplate,
} from "./types";

/** A skill router call: returns a skill id for a step, or null. */
export type RouteStep = (input: {
  intent: string;
  skillHint?: string;
  userId: string;
}) => Promise<string | null>;

/** A memory-context call: returns a system-prompt block for a step (may be ""). */
export type MemoryContextFn = (input: { userId: string; intent: string }) => Promise<string>;

/** A grounding check over a step's output against a source document. */
export type GroundingCheck = (
  findingText: string,
  documentText: string,
) => { score: number; unmatched: string[] };

/** Everything the orchestrator needs, injected so the engine stays pure. */
export interface OrchestratorDeps {
  store: WorkflowRunStore;
  llm: LlmComplete;
  /** Maps a step's tier to a concrete model id (wired to `modelForTier`). */
  modelForTier: ModelForTier;
  /** Skill routing (optional — falls back to the step's `skillHint`). */
  route?: RouteStep;
  /** Working-memory context (optional). */
  memory?: MemoryContextFn;
  /** Grounding verifier (optional — used only on `citesDocuments` steps). */
  grounding?: GroundingCheck;
  /** Source document text for grounding checks, when the run has one. */
  documentText?: string;
  /** Bounded adversarial Full-Bench over RED findings (optional, 2c). */
  fullBench?: RunFullBench;
  /** Deliverable assembler (optional, 2d — else the built-in fallback runs). */
  assemble?: AssembleDeliverable;
  /** Deliverable validator (optional, 2d). */
  validate?: ValidateDeliverable;
  /** Fidelity verifier (optional, 2d). */
  fidelity?: VerifyFidelity;
  /** Deterministic clock for tests. Defaults to wall-clock ISO. */
  now?: () => string;
}

const SEVERITIES: readonly FindingSeverity[] = ["RED", "YELLOW", "GREEN"];

/**
 * Parse severity-tagged findings from a step's llm output. Convention, one per
 * line: `[RED] Title :: detail`. Lines without a recognised tag are ignored
 * (generative steps that produce prose, not findings, contribute none).
 */
export function parseFindings(stepId: string, text: string): Finding[] {
  const findings: Finding[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const m = /^\[(RED|YELLOW|GREEN)\]\s*(.+)$/i.exec(line);
    if (!m) continue;
    const severity = m[1].toUpperCase() as FindingSeverity;
    if (!SEVERITIES.includes(severity)) continue;
    const rest = m[2].trim();
    const [title, ...detailParts] = rest.split("::");
    findings.push({
      id: crypto.randomUUID(),
      stepId,
      severity,
      title: title.trim() || rest,
      detail: detailParts.join("::").trim() || rest,
    });
  }
  return findings;
}

/** Build the system prompt for a step (intent + routed skill + memory). */
function stepSystemPrompt(step: WorkflowStep, skillId: string | null, memoryBlock: string): string {
  const lines = [
    `You are executing one step of a legal workflow.`,
    `Step intent: ${step.intent}`,
  ];
  if (skillId) lines.push(`Apply the "${skillId}" skill.`);
  if (step.citesDocuments) {
    lines.push(
      `Cite the source document precisely. Emit issues as findings, one per line, formatted: [RED|YELLOW|GREEN] Title :: detail.`,
    );
  } else {
    lines.push(`If you identify issues, emit them one per line: [RED|YELLOW|GREEN] Title :: detail.`);
  }
  if (memoryBlock) lines.push("", memoryBlock);
  return lines.join("\n");
}

/** Build the user prompt for a step from the run's input + prior findings. */
function stepUserPrompt(step: WorkflowStep, run: WorkflowRun): string {
  const parts: string[] = [`Task: ${step.intent}`];
  if (run.input && Object.keys(run.input).length > 0) {
    parts.push(`Run input: ${JSON.stringify(run.input)}`);
  }
  if (run.findings.length > 0) {
    parts.push(
      `Findings so far:\n${run.findings
        .map((f) => `- [${f.severity}] ${f.title}: ${f.detail}`)
        .join("\n")}`,
    );
  }
  return parts.join("\n\n");
}

/** Execute one step and return the findings it emitted. */
async function runStep(
  step: WorkflowStep,
  run: WorkflowRun,
  deps: OrchestratorDeps,
): Promise<Finding[]> {
  const model = deps.modelForTier(step.modelTier);
  const memoryBlock = deps.memory
    ? await deps.memory({ userId: run.userId, intent: step.intent })
    : "";
  const skillId = deps.route
    ? await deps.route({ intent: step.intent, skillHint: step.skillHint, userId: run.userId })
    : (step.skillHint ?? null);

  const output = await deps.llm({
    model,
    systemPrompt: stepSystemPrompt(step, skillId, memoryBlock),
    user: stepUserPrompt(step, run),
  });

  const findings = parseFindings(step.id, output);

  // Grounding: on doc-citing steps, flag citations absent from the source.
  if (step.citesDocuments && deps.grounding && deps.documentText) {
    const g = deps.grounding(output, deps.documentText);
    if (g.unmatched.length > 0) {
      findings.push({
        id: crypto.randomUUID(),
        stepId: step.id,
        severity: "YELLOW",
        title: "Ungrounded citations",
        detail: `${g.unmatched.length} citation(s) not found in the source (grounding score ${g.score.toFixed(
          2,
        )}): ${g.unmatched.slice(0, 5).join("; ")}`,
        citations: g.unmatched,
      });
    }
  }
  return findings;
}

/** Built-in fallback assembler (used when no 2d assembler is injected). */
export function fallbackAssemble(run: WorkflowRun): string {
  const bySeverity = (sev: FindingSeverity) => run.findings.filter((f) => f.severity === sev);
  const section = (title: string, items: Finding[]) =>
    items.length === 0
      ? ""
      : `\n## ${title}\n${items.map((f) => `- **${f.title}** — ${f.detail}`).join("\n")}\n`;
  return [
    `# Workflow deliverable`,
    `Template: ${run.templateId}`,
    section("Critical (RED)", bySeverity("RED")),
    section("Review (YELLOW)", bySeverity("YELLOW")),
    section("Notes (GREEN)", bySeverity("GREEN")),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Apply Full-Bench verdicts to a finding set (revise text, drop withdrawn). */
async function applyFullBench(run: WorkflowRun, deps: OrchestratorDeps): Promise<void> {
  if (!deps.fullBench) return;
  const reds = run.findings.filter((f) => f.severity === "RED");
  if (reds.length === 0) return;
  const verdicts = await deps.fullBench(reds, deps.llm);
  if (verdicts.length === 0) return;
  const byId = new Map(verdicts.map((v) => [v.findingId, v]));
  const next: Finding[] = [];
  for (const f of run.findings) {
    const v = byId.get(f.id);
    if (!v || v.verdict === "upheld") {
      next.push(f);
    } else if (v.verdict === "revised") {
      next.push({ ...f, detail: v.revised ?? f.detail });
    }
    // "withdrawn" → drop the finding.
  }
  await deps.store.setFindings(run.id, next, deps.now?.());
}

/**
 * Run (or resume) a workflow. Loads the run by id, executes steps from its
 * persisted cursor, pauses at gates, and on completion runs Full-Bench →
 * assembly → validation. Returns the final run state (`gated`, `done`, or
 * `failed`). Never throws on a workflow-step failure — it records `failed`.
 */
export async function runWorkflow(
  deps: OrchestratorDeps,
  input: { template: WorkflowTemplate; runId: string },
): Promise<WorkflowRun> {
  const now = () => deps.now?.() ?? new Date().toISOString();
  const { template, runId } = input;

  let run = await deps.store.get(runId);
  if (!run) throw new Error(`workflow run not found: ${runId}`);
  if (run.status === "done" || run.status === "failed") return run;

  const wasGated = run.status === "gated";
  const resumeAt = run.currentStepIndex;

  // queued/gated → running.
  if (run.status === "queued" || run.status === "gated") {
    run = (await deps.store.transition(runId, "running", { now: now() })) ?? run;
  }

  try {
    for (let i = run.currentStepIndex; i < template.steps.length; i++) {
      const step = template.steps[i];

      // Gate: pause BEFORE a gated step unless we are resuming INTO it.
      const resumingIntoThisGate = wasGated && i === resumeAt;
      if (step.gate && !resumingIntoThisGate) {
        await deps.store.update(runId, { currentStepIndex: i }, now());
        return (await deps.store.transition(runId, "gated", { now: now() })) ?? run;
      }

      const current = (await deps.store.get(runId)) ?? run;
      const findings = await runStep(step, current, deps);
      for (const f of findings) {
        await deps.store.addFinding(runId, f, now());
      }
      run = (await deps.store.update(runId, { currentStepIndex: i + 1 }, now())) ?? run;
    }

    // All steps done → assemble.
    run = (await deps.store.transition(runId, "assembling", { now: now() })) ?? run;
    run = (await deps.store.get(runId)) ?? run;

    await applyFullBench(run, deps);
    run = (await deps.store.get(runId)) ?? run;

    const deliverable = deps.assemble
      ? await deps.assemble(run, deps.llm)
      : fallbackAssemble(run);

    if (deps.validate) {
      const v = deps.validate(deliverable);
      if (!v.ok) {
        return (
          (await deps.store.transition(runId, "failed", {
            now: now(),
            error: `deliverable rejected: ${v.problems.join("; ")}`,
          })) ?? run
        );
      }
    }

    if (deps.fidelity) {
      const fid = await deps.fidelity(run, deliverable, deps.llm);
      if (!fid.ok) {
        return (
          (await deps.store.transition(runId, "failed", {
            now: now(),
            error: `deliverable failed fidelity: ${fid.redCovered}/${fid.redTotal} RED covered; missing: ${fid.missing.join(
              "; ",
            )}`,
          })) ?? run
        );
      }
    }

    await deps.store.update(runId, { deliverable }, now());
    return (await deps.store.transition(runId, "done", { now: now() })) ?? run;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      (await deps.store.transition(runId, "failed", { now: now(), error: message })) ?? run
    );
  }
}
