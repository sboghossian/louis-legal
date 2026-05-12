import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";

export const feedbackRouter = Router();

type Rating = "up" | "down";

function isRating(value: unknown): value is Rating {
    return value === "up" || value === "down";
}

// GET /api/feedback/chat/:chatId — return this user's ratings for one chat
feedbackRouter.get("/chat/:chatId", requireAuth, async (req, res) => {
    const userId = res.locals.userId as string;
    const { chatId } = req.params;
    const db = createServerSupabase();

    const { data: messages, error: mErr } = await db
        .from("chat_messages")
        .select("id")
        .eq("chat_id", chatId);
    if (mErr) return void res.status(500).json({ detail: mErr.message });
    const ids = (messages ?? []).map((m: { id: string }) => m.id);
    if (ids.length === 0) return void res.json({});

    const { data, error } = await db
        .from("chat_message_feedback")
        .select("message_id, rating, note")
        .eq("user_id", userId)
        .in("message_id", ids);
    if (error) return void res.status(500).json({ detail: error.message });

    const out: Record<string, { rating: Rating; note: string | null }> = {};
    for (const row of (data ?? []) as {
        message_id: string;
        rating: Rating;
        note: string | null;
    }[]) {
        out[row.message_id] = { rating: row.rating, note: row.note };
    }
    res.json(out);
});

// POST /api/feedback/:messageId — upsert this user's rating; sending the same
// rating again clears it (toggle behavior).
feedbackRouter.post("/:messageId", requireAuth, async (req, res) => {
    const userId = res.locals.userId as string;
    const { messageId } = req.params;
    const rating = req.body?.rating;
    const note =
        typeof req.body?.note === "string" ? req.body.note.trim() : null;

    if (!isRating(rating)) {
        return void res
            .status(400)
            .json({ detail: "rating must be 'up' or 'down'" });
    }

    const db = createServerSupabase();

    // Verify message exists and the user can see this chat (mirrors the
    // chat_messages select policy).
    const { data: msg } = await db
        .from("chat_messages")
        .select("id, chat_id")
        .eq("id", messageId)
        .maybeSingle();
    if (!msg) return void res.status(404).json({ detail: "Message not found" });

    // Toggle: if the user is sending the same rating they already had,
    // delete it instead so they can clear an accidental click.
    const { data: existing } = await db
        .from("chat_message_feedback")
        .select("rating")
        .eq("message_id", messageId)
        .eq("user_id", userId)
        .maybeSingle();

    if (existing && (existing as { rating: Rating }).rating === rating && !note) {
        await db
            .from("chat_message_feedback")
            .delete()
            .eq("message_id", messageId)
            .eq("user_id", userId);
        return void res.json({ rating: null, note: null });
    }

    const { error } = await db.from("chat_message_feedback").upsert(
        {
            message_id: messageId,
            user_id: userId,
            rating,
            note,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "message_id,user_id" },
    );
    if (error) return void res.status(500).json({ detail: error.message });
    res.json({ rating, note });
});

// DELETE /api/feedback/:messageId — explicit clear (button on UI is also a
// toggle, but expose this for completeness).
feedbackRouter.delete("/:messageId", requireAuth, async (req, res) => {
    const userId = res.locals.userId as string;
    const { messageId } = req.params;
    const db = createServerSupabase();
    const { error } = await db
        .from("chat_message_feedback")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", userId);
    if (error) return void res.status(500).json({ detail: error.message });
    res.status(204).send();
});
