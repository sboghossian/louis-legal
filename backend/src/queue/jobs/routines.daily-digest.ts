/**
 * Job: routines.daily-digest
 *
 * Assembles a "what happened today" newsfeed for a routine's owner from:
 *   - inbox notifications
 *   - matter activity (new docs, comments, status changes)
 *   - skill fires (which Louis skills the user invoked + outputs)
 *
 * On completion, hands the digest off to `notifications.deliver` so the
 * routine's outputChannel (email | slack | in-app) is honoured.
 *
 * Most service-layer calls are TODOs until the relevant modules expose
 * server-side aggregation. The shape of the digest is locked in so the
 * notification renderer can be built in parallel.
 */

import { queues } from "../index";
import { getRoutine, listRoutines } from "../../routines/_store";

export const JOB_NAME = "routines.daily-digest";

export interface DailyDigestJobData {
  userId: string;
  routineId: string;
  /** ISO date for which the digest is being generated. */
  asOf?: string;
}

export interface DailyDigestResult {
  routineId: string;
  userId: string;
  asOf: string;
  sections: {
    inbox: { unreadCount: number; highlights: string[] };
    matters: { events: { matterId: string; summary: string }[] };
    skills: { fires: { skillId: string; count: number }[] };
  };
  notificationJobId?: string;
}

interface JobLike {
  data: DailyDigestJobData;
  log?: (msg: string) => Promise<void> | void;
}

export async function handleDailyDigest(
  job: JobLike,
): Promise<DailyDigestResult> {
  const { userId, routineId, asOf } = job.data;
  const routine = getRoutine(routineId, userId);
  if (!routine) {
    // The routine may have been deleted between schedule + run; skip cleanly.
    throw new Error(`routine ${routineId} not found for user ${userId}`);
  }

  const stamp = asOf ?? new Date().toISOString();
  await job.log?.(`assembling daily digest for routine=${routineId} asOf=${stamp}`);

  // TODO: replace with real service calls once these expose user-scoped APIs:
  //   - inboxService.summarizeSince(userId, since)
  //   - matterActivityService.eventsForUser(userId, since)
  //   - skillTelemetry.firesForUser(userId, since)
  // For now we surface the shape so downstream renderers can be wired up.
  const result: DailyDigestResult = {
    routineId,
    userId,
    asOf: stamp,
    sections: {
      inbox: { unreadCount: 0, highlights: [] },
      matters: { events: [] },
      skills: { fires: [] },
    },
  };

  // Hand off to the delivery queue so transport (email/slack/in-app) is
  // a separate retryable unit of work.
  const enq = await queues.notifications.add(
    "notifications.deliver",
    {
      userId,
      channel: routine.outputChannel,
      subject: `Daily digest — ${routine.title}`,
      kind: "routine-digest",
      payload: result,
    },
    { priority: 10 },
  );
  result.notificationJobId = enq.id;
  return result;
}

/**
 * Helper: derive default per-user daily-digest data when a scheduler tick
 * lacks explicit routineId (e.g. a fleet-wide pulse).
 */
export function expandFleetTick(): DailyDigestJobData[] {
  // Walk every user that owns at least one "digest" routine.
  // This is a stop-gap until we expose listAllRoutines() at the store level.
  const seen = new Set<string>();
  const out: DailyDigestJobData[] = [];
  for (const r of listRoutines("demo")) {
    if (r.kind === "digest" && r.enabled && !seen.has(r.id)) {
      seen.add(r.id);
      out.push({ userId: r.userId, routineId: r.id });
    }
  }
  return out;
}
