"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthHeader } from "@/app/lib/louisApi";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

/**
 * Snapshot of the onboarding profile that drives jurisdiction-aware
 * surfaces (rotating sample prompts, future skill router preferences,
 * etc.). Fetched once per user and cached in module scope so multiple
 * consumers — ChatInput, InitialView — share a single round-trip.
 */
export interface OnboardingProfile {
    role?: string;
    organization?: string;
    jurisdictions: string[];
    practiceAreas: string[];
    useCases: string[];
    preferredLanguage?: string;
    completedAt?: string;
}

interface CacheEntry {
    userId: string;
    value: OnboardingProfile | null;
    at: number;
}

let cache: CacheEntry | null = null;
let inflight: Promise<OnboardingProfile | null> | null = null;
const TTL_MS = 5 * 60 * 1000;

async function fetchProfile(userId: string): Promise<OnboardingProfile | null> {
    try {
        const auth = await getAuthHeader();
        if (!auth.Authorization) return null;
        const r = await fetch(`${API_BASE}/api/onboarding/me`, {
            headers: auth,
            cache: "no-store",
        });
        if (!r.ok) return null;
        const json = (await r.json()) as {
            profile?: {
                role?: string;
                organization?: string;
                jurisdictions?: string[];
                practiceAreas?: string[];
                useCases?: string[];
                preferredLanguage?: string;
                completedAt?: string;
            } | null;
        };
        const p = json.profile ?? null;
        if (!p) return null;
        const value: OnboardingProfile = {
            role: p.role,
            organization: p.organization,
            jurisdictions: p.jurisdictions ?? [],
            practiceAreas: p.practiceAreas ?? [],
            useCases: p.useCases ?? [],
            preferredLanguage: p.preferredLanguage,
            completedAt: p.completedAt,
        };
        cache = { userId, value, at: Date.now() };
        return value;
    } catch {
        return null;
    }
}

export function useOnboardingProfile(): OnboardingProfile | null {
    const { user } = useAuth();
    const [profile, setProfile] = useState<OnboardingProfile | null>(() => {
        if (!user?.id) return null;
        if (cache && cache.userId === user.id && Date.now() - cache.at < TTL_MS) {
            return cache.value;
        }
        return null;
    });

    useEffect(() => {
        if (!user?.id) {
            setProfile(null);
            return;
        }
        if (
            cache &&
            cache.userId === user.id &&
            Date.now() - cache.at < TTL_MS
        ) {
            setProfile(cache.value);
            return;
        }
        let cancelled = false;
        if (!inflight) {
            inflight = fetchProfile(user.id).finally(() => {
                inflight = null;
            });
        }
        inflight.then((value) => {
            if (!cancelled) setProfile(value);
        });
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    return profile;
}
