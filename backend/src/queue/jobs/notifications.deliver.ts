/**
 * Job: notifications.deliver
 *
 * Single delivery surface for every async notification. Routes a payload to
 * the user's preferred channel:
 *   - "in-app"  -> insert into the inbox feed
 *   - "email"   -> Resend (existing dep)
 *   - "slack"   -> stub (future)
 *
 * Other jobs (digest, deadline reminder, …) should not talk to Resend or
 * Slack directly — they enqueue this job so retries and rate limits are
 * managed in one place.
 */

export const JOB_NAME = "notifications.deliver";

export type DeliveryChannel = "in-app" | "email" | "slack";

export interface NotificationsDeliverJobData {
  userId: string;
  channel: DeliveryChannel;
  subject: string;
  /** Free-form payload — renderer picked by `kind`. */
  kind: string;
  payload: unknown;
}

export interface NotificationsDeliverResult {
  userId: string;
  channel: DeliveryChannel;
  delivered: boolean;
  /** True for the slack stub until that integration ships. */
  skipped: boolean;
  detail?: string;
}

interface JobLike {
  data: NotificationsDeliverJobData;
  log?: (msg: string) => Promise<void> | void;
}

export async function handleNotificationsDeliver(
  job: JobLike,
): Promise<NotificationsDeliverResult> {
  const { userId, channel, subject, kind } = job.data;
  await job.log?.(`deliver user=${userId} channel=${channel} kind=${kind}`);

  switch (channel) {
    case "in-app": {
      // TODO: insert into inbox table via supabase / pg. The inbox route
      // already exposes a server-side `createNotification` shape we can
      // call directly.
      return {
        userId,
        channel,
        delivered: true,
        skipped: false,
        detail: `inbox stub: ${subject}`,
      };
    }
    case "email": {
      // Use Resend with the routine owner's own key when available; fall
      // back to the platform key only for transactional system mails.
      try {
        // TODO: look up owner BYO Resend / SMTP creds via lib/userApiKeys.
        // Until then, no-op so we don't accidentally bill platform email.
        return {
          userId,
          channel,
          delivered: false,
          skipped: true,
          detail: "email delivery deferred — awaiting BYO key lookup",
        };
      } catch (e) {
        return {
          userId,
          channel,
          delivered: false,
          skipped: false,
          detail: `email failed: ${String(e)}`,
        };
      }
    }
    case "slack": {
      return {
        userId,
        channel,
        delivered: false,
        skipped: true,
        detail: "slack integration not yet implemented",
      };
    }
    default: {
      return {
        userId,
        channel,
        delivered: false,
        skipped: true,
        detail: `unknown channel: ${String(channel)}`,
      };
    }
  }
}
