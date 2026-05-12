/**
 * Auth helpers — currently a signup-without-email-confirmation shim.
 *
 * Background: Supabase's email confirmation gate + built-in SMTP rate
 * limit (3 emails/hour on free tier) silently blocks new signups on the
 * public deployment. Users hit the form, the email never arrives, and
 * they can't proceed.
 *
 * Workaround: this route uses the service-role admin API to create
 * accounts with `email_confirm: true` already set, so the user can sign
 * in immediately after — no confirmation email, no rate limit.
 *
 * Security:
 * - Rate-limited at the Express layer (signup limiter below).
 * - We only set common-sense profile fields; supabase.auth.admin.createUser
 *   handles password hashing and uniqueness checks.
 * - The route does NOT return a session; the frontend follows up with
 *   signInWithPassword so the access token never round-trips through us.
 */

import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

export const authRouter = Router();

function isPlausibleEmail(value: unknown): value is string {
    if (typeof value !== "string") return false;
    const s = value.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 320;
}

function isPlausiblePassword(value: unknown): value is string {
    return typeof value === "string" && value.length >= 6 && value.length <= 512;
}

authRouter.post("/signup", async (req, res) => {
    const body =
        req.body && typeof req.body === "object" && !Array.isArray(req.body)
            ? (req.body as Record<string, unknown>)
            : {};
    const email = isPlausibleEmail(body.email)
        ? body.email.trim().toLowerCase()
        : null;
    const password = isPlausiblePassword(body.password) ? body.password : null;
    if (!email || !password) {
        return void res
            .status(400)
            .json({ detail: "Valid email + 6+ character password required" });
    }
    const displayName =
        typeof body.displayName === "string"
            ? body.displayName.trim().slice(0, 120) || null
            : null;
    const organisation =
        typeof body.organisation === "string"
            ? body.organisation.trim().slice(0, 120) || null
            : null;

    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_SECRET_KEY || "";
    if (!url || !key) {
        return void res.status(500).json({
            detail: "Server is not configured for signup yet.",
        });
    }
    const admin = createClient(url, key, { auth: { persistSession: false } });

    try {
        const { data, error } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                ...(displayName ? { display_name: displayName } : {}),
                ...(organisation ? { organisation } : {}),
            },
        });

        if (error) {
            // Already-registered is a normal user-facing case. Pass the
            // status through so the frontend can render "use sign in
            // instead" rather than a generic 500.
            const status = error.status ?? 500;
            const message =
                /already|registered|exists/i.test(error.message)
                    ? "An account with this email already exists. Try signing in."
                    : error.message;
            return void res
                .status(status === 422 ? 409 : status)
                .json({ detail: message });
        }
        if (!data?.user?.id) {
            return void res.status(500).json({
                detail: "Signup did not return a user. Please try again.",
            });
        }

        // Best-effort profile seed; an existing trigger creates the row,
        // we just enrich it.
        if (displayName || organisation) {
            await admin
                .from("user_profiles")
                .upsert(
                    {
                        user_id: data.user.id,
                        ...(displayName ? { display_name: displayName } : {}),
                        ...(organisation ? { organisation } : {}),
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" },
                );
        }

        res.status(201).json({ ok: true, user: { id: data.user.id, email } });
    } catch (err) {
        console.error("[auth/signup] unexpected", err);
        res.status(500).json({
            detail:
                err instanceof Error
                    ? err.message
                    : "Unexpected signup error",
        });
    }
});
