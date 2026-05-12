"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAssistantChat } from "@/app/hooks/useAssistantChat";
import { InitialView } from "@/app/components/assistant/InitialView";
import { ChatView } from "@/app/components/assistant/ChatView";
import type { LouisMessage } from "@/app/components/shared/types";

export default function AssistantPage() {
    const router = useRouter();
    const { messages, isResponseLoading, handleChat, handleNewChat, cancel } =
        useAssistantChat();
    const consumedRef = useRef(false);

    async function handleInitialSubmit(message: LouisMessage) {
        const chatId = await handleNewChat(message);
        if (chatId) router.push(`/assistant/chat/${chatId}`);
    }

    // Consume any prompt seeded by /home composer
    useEffect(() => {
        if (consumedRef.current) return;
        if (typeof window === "undefined") return;
        const seeded = sessionStorage.getItem("louis.initialPrompt");
        if (seeded && seeded.trim()) {
            consumedRef.current = true;
            sessionStorage.removeItem("louis.initialPrompt");
            sessionStorage.removeItem("louis.category");
            void handleInitialSubmit({ role: "user", content: seeded });
        }
    }, []);

    if (messages.length === 0) {
        return (
            <InitialView
                onSubmit={(message) => void handleInitialSubmit(message)}
            />
        );
    }

    return (
        <ChatView
            messages={messages}
            isResponseLoading={isResponseLoading}
            handleChat={handleChat}
            cancel={cancel}
        />
    );
}
