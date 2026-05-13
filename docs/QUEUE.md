# Background Queue (BullMQ)

Louis runs scheduled routines, document parsing, embedding indexing, and
notification delivery as **background jobs** so the API process stays
responsive and work survives crashes.

The transport is [BullMQ](https://docs.bullmq.io/) on Redis.

---

## TL;DR

```bash
# 1. Have Redis running locally
brew install redis && brew services start redis

# 2. Install deps (only the first time — bullmq + ioredis are now in package.json)
npm install --prefix backend

# 3. In one terminal: API
npm run dev --prefix backend

# 4. In a second terminal: worker
npm run worker --prefix backend
```

If Redis is **not** running, the API still boots — every `queues.X.add(...)`
call no-ops, logs a warning, and returns a synthetic `skipped-…` job id so
dev environments keep working.

---

## Queues

| Queue           | Purpose                                                  |
| --------------- | -------------------------------------------------------- |
| `routines`      | Daily digests, deadline reminders, skill cache warm-ups  |
| `documents`     | PDF / DOCX parse + outline extraction                    |
| `embeddings`    | Chunk + embed + upsert into the vector index             |
| `notifications` | Deliver to inbox / email / slack                         |

Queue name is derived from the **first segment of the job name**:
`routines.daily-digest` → `routines` queue, `documents.parse` → `documents`,
etc.

---

## Jobs

| Job name                       | Handler                                                | Notes                                                                 |
| ------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------- |
| `routines.daily-digest`        | `backend/src/queue/jobs/routines.daily-digest.ts`       | Builds "what happened today" feed, hands off to `notifications.deliver` |
| `routines.deadline-reminder`   | `backend/src/queue/jobs/routines.deadline-reminder.ts`  | Scans matter calendar, dedupes via stable `jobId`                     |
| `routines.skill-cache-warm`    | `backend/src/queue/jobs/routines.skill-cache-warm.ts`   | Pre-warms expensive skill outputs                                     |
| `documents.parse`              | `backend/src/queue/jobs/documents.parse.ts`             | Wraps existing pdfjs-dist / mammoth path                              |
| `embeddings.index`             | `backend/src/queue/jobs/embeddings.index.ts`            | Stub until Cohere multilingual lands                                  |
| `notifications.deliver`        | `backend/src/queue/jobs/notifications.deliver.ts`       | Inbox + email (Resend BYO) + slack stub                               |

---

## Running the worker

```bash
# Dev (tsx watch is intentionally NOT used — worker should be restarted cleanly)
npm run worker --prefix backend

# Prod (after `npm run build --prefix backend`)
npm run worker:prod --prefix backend
```

Environment:

| Var          | Default                     | Meaning                       |
| ------------ | --------------------------- | ----------------------------- |
| `REDIS_URL`  | `redis://localhost:6379`    | BullMQ connection string      |

Graceful shutdown: the worker traps `SIGTERM` and `SIGINT`, stops pulling
new jobs, lets in-flight handlers finish, closes the Redis connection,
then exits 0. Safe to drop into a `kubectl rollout restart` / systemd unit.

---

## Adding a new job type

1. Create `backend/src/queue/jobs/<queue>.<verb>.ts` exporting:
   ```ts
   export const JOB_NAME = "<queue>.<verb>";
   export interface FooJobData { /* … */ }
   export async function handleFoo(job: { data: FooJobData }) { /* … */ }
   ```
2. Register it in `backend/src/queue/worker.ts`:
   ```ts
   import { JOB_NAME as FOO, handleFoo } from "./jobs/<queue>.<verb>";
   // …
   const HANDLERS = { …, [FOO]: handleFoo };
   ```
3. Enqueue from anywhere:
   ```ts
   import { queues } from "../queue";
   await queues.documents.add("documents.parse", { documentId, … });
   ```

If you need a brand-new queue (not one of the four above), add it to
`QUEUE_NAMES` in `backend/src/queue/index.ts`.

---

## Retry / priority policy

Default options applied to every job (see `DEFAULT_JOB_OPTS` in
`backend/src/queue/index.ts`):

- `attempts: 3`
- `backoff: { type: "exponential", delay: 1000 }`
- `removeOnComplete: 100` (keep last 100 succeeded jobs per queue)
- `removeOnFail: 500` (keep last 500 failed jobs)

Per-job overrides via the second arg to `queue.add(name, data, opts)`:

| Job type                       | Priority | Why                                       |
| ------------------------------ | -------- | ----------------------------------------- |
| `notifications.deliver` (user-facing) | 5  | User is waiting for the email/inbox ping |
| `routines.deadline-reminder`   | 5        | Time-sensitive                            |
| `routines.daily-digest`        | 10       | Daily; can tolerate a few minutes lag     |
| `embeddings.index`             | 20       | Background indexing, lowest urgency       |

Lower number = higher priority in BullMQ.

For deadline reminders we set a **stable `jobId`** (`deadline:<matterId>:<dueAt>:<lead>`)
so cron retries don't double-notify.

---

## Scheduling (cron)

The worker reads enabled routines from `backend/src/routines/_store.ts` on
boot and registers each one with BullMQ's repeat feature using its cron
expression and timezone. When the store moves to SQL, this should be
re-triggered on every `routine.upsert` event.

Job name maps from `routine.kind`:

| `routine.kind`     | Job name                       |
| ------------------ | ------------------------------ |
| `digest`           | `routines.daily-digest`        |
| `newsletter`       | `routines.daily-digest`        |
| `report`           | `routines.daily-digest`        |
| `alert`            | `routines.deadline-reminder`   |
| `deadline-sweep`   | `routines.deadline-reminder`   |
| `custom`           | (not yet routed — TODO)        |

---

## API surface

The existing routines route now enqueues real work instead of running
synchronously inline:

- `POST /api/routines/:id/run` → returns `{ jobId, queued, …run }`
- `GET  /api/routines/jobs/:id` → returns BullMQ job status across all queues

Existing fields on the run object are preserved so the current UI keeps
working without changes.

---

## TODO / not-yet-wired

These are intentional gaps to be picked up in follow-up PRs:

- [ ] Move the routines store to SQL so the worker can scan **all users**, not just `demo`.
- [ ] Wire `documents.parse` to `lib/storage.getObject` and persist parsed text + outline back onto `documents.parsed_text` / `documents.outline`.
- [ ] Land Cohere multilingual integration and replace the `embeddings.index` stub.
- [ ] Look up BYO Resend / SMTP creds in `notifications.deliver` before sending email; today the email path is intentionally a no-op to avoid platform billing.
- [ ] Implement the Slack delivery path.
- [ ] Add a `queue` health endpoint (`GET /api/admin/queue`) so ops can see depths / failure rates.
- [ ] Per-user BYO LLM key lookup inside skill-cache-warm so we pay nothing platform-side.
- [ ] Bull Board (or similar) dashboard wired to the API for ops debugging.
