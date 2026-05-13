/**
 * Job: routines.skill-cache-warm
 *
 * Pre-warms expensive Louis skill outputs (e.g. corpus-wide regulator
 * summaries, sanctions screens) so the first user request returns instantly.
 *
 * Typical schedule: every 6h. Owner pays for LLM calls via their own
 * BYO key — the queue does not store keys; the worker looks them up at
 * execution time.
 */

import { getRoutine } from "../../routines/_store";

export const JOB_NAME = "routines.skill-cache-warm";

export interface SkillCacheWarmJobData {
  userId: string;
  routineId: string;
  /** Skill ids to warm. Defaults to a curated "hot list". */
  skillIds?: string[];
}

export interface SkillCacheWarmResult {
  routineId: string;
  warmed: { skillId: string; ms: number; cached: boolean }[];
  skipped: string[];
}

interface JobLike {
  data: SkillCacheWarmJobData;
  log?: (msg: string) => Promise<void> | void;
}

const DEFAULT_HOT_SKILLS = [
  "tool.pdf-extractor",
  "tool.docx-tracked-changes",
  "lex.sanctions-screen",
];

export async function handleSkillCacheWarm(
  job: JobLike,
): Promise<SkillCacheWarmResult> {
  const { userId, routineId, skillIds } = job.data;
  const routine = getRoutine(routineId, userId);
  if (!routine) {
    throw new Error(`routine ${routineId} not found for user ${userId}`);
  }

  const targets = skillIds && skillIds.length ? skillIds : DEFAULT_HOT_SKILLS;
  await job.log?.(`warming ${targets.length} skills for user=${userId}`);

  const warmed: SkillCacheWarmResult["warmed"] = [];
  const skipped: string[] = [];

  for (const skillId of targets) {
    // TODO: wire to skills/_loader + the skill runtime so we can actually
    // execute a "warm" pass and cache the result keyed by user + skill.
    // Until then we record a no-op so the telemetry shape is correct.
    skipped.push(skillId);
  }

  return { routineId, warmed, skipped };
}
