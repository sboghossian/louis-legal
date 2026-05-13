/**
 * Job: routines.deadline-reminder
 *
 * Scans matter calendar events and emits a notification N hours before each
 * deadline. Intended to run hourly via cron and dedupe via a stable job id
 * so a deadline isn't double-notified.
 */

import { queues } from "../index";
import { getRoutine } from "../../routines/_store";

export const JOB_NAME = "routines.deadline-reminder";

export interface DeadlineReminderJobData {
  userId: string;
  routineId: string;
  /** Hours of lead time. Default 24. */
  leadHours?: number;
}

export interface DeadlineReminderResult {
  routineId: string;
  scannedMatters: number;
  upcomingDeadlines: {
    matterId: string;
    title: string;
    dueAt: string;
    hoursUntil: number;
  }[];
  notificationsQueued: number;
}

interface JobLike {
  data: DeadlineReminderJobData;
  log?: (msg: string) => Promise<void> | void;
}

export async function handleDeadlineReminder(
  job: JobLike,
): Promise<DeadlineReminderResult> {
  const { userId, routineId, leadHours = 24 } = job.data;
  const routine = getRoutine(routineId, userId);
  if (!routine) {
    throw new Error(`routine ${routineId} not found for user ${userId}`);
  }

  await job.log?.(`scanning deadlines lead=${leadHours}h`);

  // TODO: integrate with matter calendar service:
  //   - matterCalendar.listEventsForUser(userId, { window: [now, now + leadHours] })
  // For now return an empty payload so the pipeline is wired end-to-end.
  const upcomingDeadlines: DeadlineReminderResult["upcomingDeadlines"] = [];

  let notificationsQueued = 0;
  for (const d of upcomingDeadlines) {
    const enq = await queues.notifications.add(
      "notifications.deliver",
      {
        userId,
        channel: routine.outputChannel,
        subject: `Deadline in ${d.hoursUntil}h — ${d.title}`,
        kind: "deadline-reminder",
        payload: d,
      },
      {
        // Stable id prevents double-notification when the cron retries.
        jobId: `deadline:${d.matterId}:${d.dueAt}:${leadHours}`,
        priority: 5,
      },
    );
    if (!enq.skipped) notificationsQueued++;
  }

  return {
    routineId,
    scannedMatters: 0,
    upcomingDeadlines,
    notificationsQueued,
  };
}
