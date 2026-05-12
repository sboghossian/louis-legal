import { Router, Request, Response } from "express";
import { getProfile, upsertProfile, isComplete, listProfiles } from "../onboarding/_store";
import { requireAuth } from "../middleware/auth";

export const onboardingRouter = Router();

// Prefer the verified JWT userId (set by requireAuth). The legacy
// `x-user-id` header is honored only when no token was attached, so
// authenticated calls always key on the real Supabase user id and not
// the shared "demo" placeholder.
function userIdFrom(req: Request, res: Response): string {
  return (
    (res.locals?.userId as string) ||
    (req.headers["x-user-id"] as string) ||
    "demo"
  );
}

onboardingRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const profile = getProfile(userId);
  res.json({ profile: profile || null, complete: !!profile?.completedAt });
});

onboardingRouter.patch("/me", requireAuth, (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const profile = upsertProfile(userId, req.body ?? {});
  res.json({ profile, complete: !!profile.completedAt });
});

onboardingRouter.post("/me/complete", requireAuth, (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const profile = upsertProfile(userId, { ...(req.body ?? {}), completedAt: new Date().toISOString() });
  res.json({ profile, complete: true });
});

// Admin endpoint for analyzing onboarding funnels
onboardingRouter.get("/admin/profiles", (_req: Request, res: Response) => {
  const profiles = listProfiles();
  const stats = {
    total: profiles.length,
    completed: profiles.filter(p => p.completedAt).length,
    byRole: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
    byJurisdiction: {} as Record<string, number>,
  };
  for (const p of profiles) {
    if (p.role) stats.byRole[p.role] = (stats.byRole[p.role] || 0) + 1;
    if (p.referralSource) stats.bySource[p.referralSource] = (stats.bySource[p.referralSource] || 0) + 1;
    for (const j of p.jurisdictions || []) stats.byJurisdiction[j] = (stats.byJurisdiction[j] || 0) + 1;
  }
  res.json({ profiles, stats });
});

export { isComplete };
