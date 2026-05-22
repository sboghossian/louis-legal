import Anthropic from "@anthropic-ai/sdk";
import type {
    Tool,
    TextBlockParam,
    OutputConfig,
} from "@anthropic-ai/sdk/resources/messages/messages";
import type {
    StreamChatParams,
    StreamChatResult,
    NormalizedToolCall,
    NormalizedToolResult,
} from "./types";
import { toClaudeTools } from "./tools";

/**
 * Build the Claude `system` param with a prompt-caching breakpoint on the
 * stable prefix (skills/system block). The whole system prompt is treated as
 * the cacheable prefix — it's identical across turns in a chat, so a single
 * `cache_control: { type: "ephemeral" }` breakpoint lets the API reuse it and
 * bills cached input at a fraction of the rate. No-op for other providers.
 */
function buildSystemWithCache(systemPrompt: string): string | Array<TextBlockParam> {
    if (!systemPrompt) return systemPrompt;
    return [
        {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
        },
    ];
}

type ContentBlock =
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: unknown }
    | { type: string; [key: string]: unknown };

type NativeMessage = {
    role: "user" | "assistant";
    content: string | ContentBlock[];
};

const MAX_TOKENS = 16384;

function client(override?: string | null): Anthropic {
    const apiKey = override?.trim() || process.env.ANTHROPIC_API_KEY || "";
    return new Anthropic({ apiKey });
}

function toNativeMessages(
    messages: StreamChatParams["messages"],
): NativeMessage[] {
    return messages.map((m) => ({ role: m.role, content: m.content }));
}

export async function streamClaude(
    params: StreamChatParams,
): Promise<StreamChatResult> {
    const {
        model,
        systemPrompt,
        tools = [],
        callbacks = {},
        runTools,
        apiKeys,
        enableThinking,
        effort,
    } = params;
    const maxIter = params.maxIterations ?? 10;
    const anthropic = client(apiKeys?.claude);
    const claudeTools = toClaudeTools(tools);

    const messages: NativeMessage[] = toNativeMessages(params.messages);
    let fullText = "";

    // Adaptive cost governor: the router's effort tier wins; when thinking is on
    // without an explicit effort we keep the prior "high" default. Typed against
    // the SDK's OutputConfig (no casts) so a future SDK change fails the build.
    const resolvedEffort: OutputConfig["effort"] | undefined =
        effort ?? (enableThinking ? "high" : undefined);

    for (let iter = 0; iter < maxIter; iter++) {
        const stream = anthropic.messages.stream({
            model,
            // Prompt-caching breakpoint on the stable system prefix (Claude only).
            system: buildSystemWithCache(systemPrompt),
            messages: messages as Anthropic.MessageParam[],
            tools: claudeTools.length
                ? (claudeTools as unknown as Tool[])
                : undefined,
            max_tokens: MAX_TOKENS,
            // Claude 4.x models require `thinking.type: "adaptive"` and drive
            // effort via `output_config.effort` rather than a fixed token
            // budget. Thinking opt-in is unchanged; effort is governor-driven.
            ...(enableThinking ? { thinking: { type: "adaptive" } } : {}),
            ...(resolvedEffort ? { output_config: { effort: resolvedEffort } } : {}),
            // Extended thinking requires temperature to be default (omitted).
        });

        let sawThinking = false;

        stream.on("text", (delta) => {
            callbacks.onContentDelta?.(delta);
        });
        if (enableThinking) {
            stream.on("thinking", (delta) => {
                sawThinking = true;
                callbacks.onReasoningDelta?.(delta);
            });
        }

        const final = await stream.finalMessage();
        if (sawThinking) callbacks.onReasoningBlockEnd?.();
        const stopReason = final.stop_reason;
        const assistantBlocks = final.content as ContentBlock[];

        // Extract text content and tool_use calls from the final assistant
        // message so we can accumulate text and drive the tool-call loop.
        const toolCalls: NormalizedToolCall[] = [];
        for (const block of assistantBlocks) {
            if (block.type === "text") {
                const txt = (block as { text: string }).text;
                if (typeof txt === "string") fullText += txt;
            } else if (block.type === "tool_use") {
                const tu = block as {
                    id: string;
                    name: string;
                    input: unknown;
                };
                const call: NormalizedToolCall = {
                    id: tu.id,
                    name: tu.name,
                    input: (tu.input as Record<string, unknown>) ?? {},
                };
                callbacks.onToolCallStart?.(call);
                toolCalls.push(call);
            }
        }

        if (stopReason !== "tool_use" || !toolCalls.length || !runTools) {
            break;
        }

        const results = await runTools(toolCalls);

        // Record the assistant turn (preserving the original content blocks,
        // which Claude requires on the follow-up) and the user turn that
        // carries the tool_result blocks.
        messages.push({ role: "assistant", content: assistantBlocks });
        messages.push({
            role: "user",
            content: results.map((r) => ({
                type: "tool_result",
                tool_use_id: r.tool_use_id,
                content: r.content,
            })),
        });
    }

    return { fullText };
}

export async function completeClaudeText(params: {
    model: string;
    systemPrompt?: string;
    user: string;
    maxTokens?: number;
    apiKeys?: { claude?: string | null };
}): Promise<string> {
    const anthropic = client(params.apiKeys?.claude);
    const resp = await anthropic.messages.create({
        model: params.model,
        max_tokens: params.maxTokens ?? 512,
        system: params.systemPrompt,
        messages: [{ role: "user", content: params.user }],
    });
    const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
    return text;
}

// Helper re-export for callers wanting to hand normalized results back in.
export type { NormalizedToolResult };
