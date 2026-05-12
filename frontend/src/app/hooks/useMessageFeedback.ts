"use client";

import { useCallback, useEffect, useState } from "react";
import {
    listChatFeedback,
    rateMessage,
    type MessageFeedbackMap,
    type MessageRating,
} from "@/app/lib/louisApi";

/**
 * Loads + mutates per-message thumbs feedback for one chat. Returns the
 * server's authoritative state for each `onFeedback` call so the UI can
 * reconcile its optimistic toggle (sending the same rating clears it).
 */
export function useMessageFeedback(chatId: string | undefined) {
    const [feedback, setFeedback] = useState<MessageFeedbackMap>({});

    useEffect(() => {
        if (!chatId) {
            setFeedback({});
            return;
        }
        let cancelled = false;
        listChatFeedback(chatId)
            .then((map) => {
                if (!cancelled) setFeedback(map);
            })
            .catch(() => {
                if (!cancelled) setFeedback({});
            });
        return () => {
            cancelled = true;
        };
    }, [chatId]);

    const onFeedback = useCallback(
        async (
            messageId: string,
            rating: MessageRating,
        ): Promise<MessageRating | null> => {
            try {
                const { rating: next } = await rateMessage(messageId, rating);
                setFeedback((prev) => {
                    const copy = { ...prev };
                    if (next) copy[messageId] = { rating: next, note: null };
                    else delete copy[messageId];
                    return copy;
                });
                return next;
            } catch {
                return feedback[messageId]?.rating ?? null;
            }
        },
        [feedback],
    );

    return { feedback, onFeedback };
}
