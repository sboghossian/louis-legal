/**
 * Onboarding profile — captures referral source, role, use case, jurisdictions,
 * preferred language, and completion state. In-memory, future SQL:
 *
 * CREATE TABLE onboarding_profiles (
 *   user_id text PRIMARY KEY,
 *   completed_at timestamptz,
 *   referral_source text,
 *   role text,
 *   role_other text,
 *   organization text,
 *   organization_size text,
 *   jurisdictions text[],
 *   practice_areas text[],
 *   use_cases text[],
 *   preferred_language text,
 *   utm jsonb,
 *   created_at timestamptz DEFAULT now(),
 *   updated_at timestamptz DEFAULT now()
 * );
 */

export interface OnboardingProfile {
  userId: string;
  completedAt?: string;
  referralSource?: string;
  role?: string;
  roleOther?: string;
  organization?: string;
  organizationSize?: string;
  jurisdictions?: string[];
  practiceAreas?: string[];
  useCases?: string[];
  preferredLanguage?: string;
  utm?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const PROFILES = new Map<string, OnboardingProfile>();

export function getProfile(userId: string): OnboardingProfile | undefined {
  return PROFILES.get(userId);
}

export function upsertProfile(userId: string, patch: Partial<OnboardingProfile>): OnboardingProfile {
  const existing = PROFILES.get(userId);
  const now = new Date().toISOString();
  const updated: OnboardingProfile = {
    ...(existing || { userId, createdAt: now, updatedAt: now }),
    ...patch,
    userId,
    updatedAt: now,
  };
  PROFILES.set(userId, updated);
  return updated;
}

export function isComplete(userId: string): boolean {
  const p = PROFILES.get(userId);
  return !!p?.completedAt;
}

export function listProfiles(): OnboardingProfile[] {
  return Array.from(PROFILES.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
