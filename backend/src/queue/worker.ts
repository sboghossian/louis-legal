/**
 * Worker entrypoint.
 *
 * Boots a single BullMQ Worker that processes every queue (`routines`,
 * `documents`, `embeddings`, `notifications`). The job name on the message
 * dispatches to the right handler.
 *
 * Run with:
 *     npm run worker --prefix backend
 *
 * Graceful shutdown:
 *   SIGTERM / SIGINT  -> stop pulling new jobs, finish in-flight, close
 *   Redis connection, exit 0.
 */

import {
  QUEUE_NAMES,
  QueueName,
  getQueues,
  getBullMQ,
  getConnection,
  closeQueues,
} from "./index";
import {
  JOB_NAME as DAILY_DIGEST,
  handleDailyDigest,
} from "./jobs/routines.daily-digest";
import {
  JOB_NAME as DEADLINE_REMINDER,
  handleDeadlineReminder,
} from "./jobs/routines.deadline-reminder";
import {
  JOB_NAME as SKILL_CACHE_WARM,
  handleSkillCacheWarm,
} from "./jobs/routines.skill-cache-warm";
import {
  JOB_NAME as DOCUMENTS_PARSE,
  handleDocumentsParse,
} from "./jobs/documents.parse";
import {
  JOB_NAME as EMBEDDINGS_INDEX,
  handleEmbeddingsIndex,
} from "./jobs/embeddings.index";
import {
  JOB_NAME as EMBEDDINGS_DELETE,
  handleEmbeddingsDelete,
} from "./jobs/embeddings.delete";
import {
  JOB_NAME as NOTIFICATIONS_DELIVER,
  handleNotificationsDeliver,
} from "./jobs/notifications.deliver";
import {
  JOB_NAME as WORKFLOWS_RUN,
  handleWorkflowsRun,
} from "./jobs/workflows.run";
import { listRoutines } from "../routines/_store";

// Map job names to handlers. Each handler receives a BullMQ-shaped Job.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (job: any) => Promise<unknown>;

const HANDLERS: Record<string, AnyHandler> = {
  [DAILY_DIGEST]: handleDailyDigest,
  [DEADLINE_REMINDER]: handleDeadlineReminder,
  [SKILL_CACHE_WARM]: handleSkillCacheWarm,
  [DOCUMENTS_PARSE]: handleDocumentsParse,
  [EMBEDDINGS_INDEX]: handleEmbeddingsIndex,
  [EMBEDDINGS_DELETE]: handleEmbeddingsDelete,
  [NOTIFICATIONS_DELIVER]: handleNotificationsDeliver,
  [WORKFLOWS_RUN]: handleWorkflowsRun,
};

/**
 * Pick a target queue based on a job name's prefix. `routines.daily-digest`
 * lands on the `routines` queue, etc. Falls back to `routines`.
 */
function queueFor(jobName: string): QueueName {
  const prefix = jobName.split(".")[0] as QueueName;
  return (QUEUE_NAMES as string[]).includes(prefix) ? prefix : "routines";
}

interface BullMQWorkerCtor {
  new (
    queueName: string,
    processor: AnyHandler,
    opts: { connection: unknown; concurrency?: number },
  ): {
    on(ev: string, cb: (...args: unknown[]) => void): void;
    close(): Promise<void>;
  };
}

interface BullMQWithWorker {
  Worker: BullMQWorkerCtor;
}

async function registerScheduledRoutines() {
  // For every enabled routine in the in-memory store, register a recurring
  // job on the right queue. Job name is derived from `routine.kind`.
  //
  // NOTE: this is a best-effort boot-time scan. Once routines persist to
  // SQL, this should run on a `routine.upsert` event instead.
  const queues = getQueues();
  // Only the demo user has seeded routines right now.
  const all = listRoutines("demo");
  for (const r of all) {
    if (!r.enabled) continue;
    const jobName =
      r.kind === "digest"
        ? DAILY_DIGEST
        : r.kind === "deadline-sweep"
          ? DEADLINE_REMINDER
          : r.kind === "alert"
            ? DEADLINE_REMINDER
            : null;
    if (!jobName) continue;
    const targetQueue = queues[queueFor(jobName)];
    if (!targetQueue.available) continue;
    await targetQueue.add(
      jobName,
      { userId: r.userId, routineId: r.id },
      {
        jobId: `cron:${r.id}`,
        repeat: { pattern: r.schedule, tz: r.timezone },
      },
    );
    // eslint-disable-next-line no-console
    console.log(
      `[worker] scheduled ${jobName} for routine=${r.id} cron="${r.schedule}" tz=${r.timezone}`,
    );
  }
}

async function main() {
  // Force queue init so we know whether Redis is reachable.
  const queues = getQueues();
  const bullmq = getBullMQ() as BullMQWithWorker | null;
  const connection = getConnection();

  const allAvailable = QUEUE_NAMES.every((n) => queues[n].available);
  if (!bullmq || !connection || !allAvailable) {
    // eslint-disable-next-line no-console
    console.error(
      "[worker] BullMQ/Redis unavailable. Worker cannot start. Set REDIS_URL and run `npm install` in backend/.",
    );
    process.exit(1);
  }

  const workers: { close: () => Promise<void> }[] = [];
  for (const name of QUEUE_NAMES) {
    const w = new bullmq.Worker(
      name,
      async (job: { name: string; data: unknown }) => {
        const handler = HANDLERS[job.name];
        if (!handler) {
          throw new Error(`no handler registered for job "${job.name}"`);
        }
        return handler(job);
      },
      { connection, concurrency: 4 },
    );
    w.on("completed", (job: unknown) => {
      const j = job as { id?: string; name?: string };
      // eslint-disable-next-line no-console
      console.log(`[worker:${name}] completed ${j?.name} id=${j?.id}`);
    });
    w.on("failed", (job: unknown, err: unknown) => {
      const j = job as { id?: string; name?: string };
      // eslint-disable-next-line no-console
      console.error(
        `[worker:${name}] failed ${j?.name} id=${j?.id}: ${String(err)}`,
      );
    });
    workers.push(w);
    // eslint-disable-next-line no-console
    console.log(`[worker] listening on queue=${name}`);
  }

  await registerScheduledRoutines();

  let shuttingDown = false;
  const shutdown = async (sig: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    // eslint-disable-next-line no-console
    console.log(`[worker] ${sig} received — draining…`);
    try {
      await Promise.all(workers.map((w) => w.close()));
      await closeQueues();
      // eslint-disable-next-line no-console
      console.log("[worker] shutdown complete");
      process.exit(0);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[worker] error during shutdown:", e);
      process.exit(1);
    }
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[worker] fatal:", e);
  process.exit(1);
});
