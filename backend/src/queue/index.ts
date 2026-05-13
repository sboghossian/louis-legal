/**
 * Queue infrastructure (BullMQ).
 *
 * Exposes a `queues` map of named queues backed by Redis. In environments
 * where Redis is unavailable (typical local dev), the module falls back to a
 * no-op shim that logs a warning and returns synthetic "skipped" job ids.
 * This keeps the dev experience working with zero infra while production
 * gets durable, retryable jobs.
 */

import crypto from "crypto";

export type QueueName =
  | "routines"
  | "documents"
  | "embeddings"
  | "notifications";

export const QUEUE_NAMES: QueueName[] = [
  "routines",
  "documents",
  "embeddings",
  "notifications",
];

export interface EnqueueOptions {
  /** BullMQ-compatible job options (priority, attempts, delay, repeat, etc). */
  priority?: number;
  attempts?: number;
  delay?: number;
  jobId?: string;
  repeat?: { pattern: string; tz?: string };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface EnqueuedJob {
  id: string;
  name: string;
  queue: QueueName;
  /** True when the queue was unavailable and the call was a no-op. */
  skipped?: boolean;
}

export interface JobStatus {
  id: string;
  name?: string;
  state: "waiting" | "active" | "completed" | "failed" | "delayed" | "skipped" | "unknown";
  progress?: number | object;
  returnvalue?: unknown;
  failedReason?: string;
  attemptsMade?: number;
  finishedOn?: number;
  processedOn?: number;
}

/**
 * Default retry / cleanup policy for all jobs unless overridden.
 * - 3 attempts with exponential backoff (1s base)
 * - keep last 100 completed, last 500 failed
 */
export const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

interface QueueLike {
  add(name: string, data: unknown, opts?: EnqueueOptions): Promise<EnqueuedJob>;
  getJob(id: string): Promise<JobStatus | null>;
  close(): Promise<void>;
  readonly available: boolean;
  /** Underlying BullMQ Queue when available, else null. */
  raw(): unknown | null;
}

// ---------------------------------------------------------------------------
// No-op fallback (used when Redis is missing or BullMQ fails to load)
// ---------------------------------------------------------------------------

function makeNoopQueue(name: QueueName, reason: string): QueueLike {
  let warned = false;
  const skipped = new Map<string, JobStatus>();
  return {
    available: false,
    raw: () => null,
    async add(jobName: string, _data: unknown, opts?: EnqueueOptions) {
      if (!warned) {
        // eslint-disable-next-line no-console
        console.warn(
          `[queue:${name}] running in no-op mode (${reason}); jobs return "skipped" ids.`,
        );
        warned = true;
      }
      const id = opts?.jobId ?? `skipped-${crypto.randomUUID()}`;
      skipped.set(id, {
        id,
        name: jobName,
        state: "skipped",
        finishedOn: Date.now(),
      });
      return { id, name: jobName, queue: name, skipped: true };
    },
    async getJob(id: string) {
      return skipped.get(id) ?? null;
    },
    async close() {
      /* noop */
    },
  };
}

// ---------------------------------------------------------------------------
// Real BullMQ-backed queue
// ---------------------------------------------------------------------------

interface BullMQModule {
  Queue: new (name: string, opts: { connection: unknown }) => BullMQQueue;
}

interface BullMQQueue {
  add(name: string, data: unknown, opts?: unknown): Promise<{ id?: string }>;
  getJob(id: string): Promise<BullMQJob | null>;
  close(): Promise<void>;
}

interface BullMQJob {
  id?: string;
  name?: string;
  progress?: number | object;
  returnvalue?: unknown;
  failedReason?: string;
  attemptsMade?: number;
  finishedOn?: number;
  processedOn?: number;
  getState(): Promise<JobStatus["state"]>;
}

function buildBullQueue(
  name: QueueName,
  BullMQ: BullMQModule,
  connection: unknown,
): QueueLike {
  const q = new BullMQ.Queue(name, { connection });
  return {
    available: true,
    raw: () => q,
    async add(jobName: string, data: unknown, opts?: EnqueueOptions) {
      const merged = { ...DEFAULT_JOB_OPTS, ...(opts ?? {}) };
      const job = await q.add(jobName, data, merged);
      return {
        id: job.id ?? `unknown-${crypto.randomUUID()}`,
        name: jobName,
        queue: name,
      };
    },
    async getJob(id: string) {
      const job = await q.getJob(id);
      if (!job) return null;
      const state = await job.getState().catch(() => "unknown" as const);
      return {
        id: job.id ?? id,
        name: job.name,
        state,
        progress: job.progress,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
      };
    },
    async close() {
      await q.close();
    },
  };
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _queues: Record<QueueName, QueueLike> | null = null;
let _connection: unknown = null;
let _bullmq: BullMQModule | null = null;

export function getRedisUrl(): string {
  return process.env.REDIS_URL ?? "redis://localhost:6379";
}

/**
 * Lazily build (or return) the queues map.
 *
 * If BullMQ or ioredis fail to import, or the Redis ping fails on first
 * connection attempt, we fall back to no-op queues so the API process keeps
 * serving requests.
 */
export function getQueues(): Record<QueueName, QueueLike> {
  if (_queues) return _queues;

  const url = getRedisUrl();
  let reason = "";
  try {
    // Dynamic require so the API process can boot even if bullmq is unmet.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bullmq = require("bullmq") as BullMQModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IORedis = require("ioredis") as new (
      url: string,
      opts?: unknown,
    ) => {
      on(ev: string, cb: (e: unknown) => void): void;
      status?: string;
    };
    _bullmq = bullmq;
    const conn = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    conn.on("error", (err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn(`[queue] redis error: ${String(err)}`);
    });
    _connection = conn;
    _queues = QUEUE_NAMES.reduce(
      (acc, n) => {
        acc[n] = buildBullQueue(n, bullmq, conn);
        return acc;
      },
      {} as Record<QueueName, QueueLike>,
    );
    return _queues;
  } catch (e) {
    reason = `bullmq/ioredis unavailable: ${String(e)}`;
    // eslint-disable-next-line no-console
    console.warn(
      `[queue] falling back to no-op queues. ${reason}. Set REDIS_URL and \`npm install\` to enable.`,
    );
  }

  _queues = QUEUE_NAMES.reduce(
    (acc, n) => {
      acc[n] = makeNoopQueue(n, reason || `REDIS_URL=${url} unreachable`);
      return acc;
    },
    {} as Record<QueueName, QueueLike>,
  );
  return _queues;
}

/** Convenience accessor for the queues map. */
export const queues = new Proxy(
  {} as Record<QueueName, QueueLike>,
  {
    get(_t, prop: string) {
      const map = getQueues();
      return (map as Record<string, QueueLike>)[prop];
    },
    ownKeys() {
      return QUEUE_NAMES.slice();
    },
    has(_t, prop) {
      return QUEUE_NAMES.includes(prop as QueueName);
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    },
  },
);

/** Look up a job across all queues. Returns the first match. */
export async function findJob(id: string): Promise<JobStatus | null> {
  for (const n of QUEUE_NAMES) {
    const q = queues[n];
    const j = await q.getJob(id);
    if (j) return j;
  }
  return null;
}

/** Close every queue (used by worker shutdown and tests). */
export async function closeQueues(): Promise<void> {
  if (!_queues) return;
  await Promise.all(Object.values(_queues).map((q) => q.close()));
  if (
    _connection &&
    typeof (_connection as { quit?: () => Promise<unknown> }).quit === "function"
  ) {
    try {
      await (_connection as { quit: () => Promise<unknown> }).quit();
    } catch {
      /* ignore */
    }
  }
  _queues = null;
  _connection = null;
  _bullmq = null;
}

/** Internal: expose loaded BullMQ module to the worker (avoids double-import). */
export function getBullMQ(): BullMQModule | null {
  // Make sure the queues are initialised so _bullmq is populated.
  getQueues();
  return _bullmq;
}

/** Internal: expose the shared connection to the worker. */
export function getConnection(): unknown {
  getQueues();
  return _connection;
}
