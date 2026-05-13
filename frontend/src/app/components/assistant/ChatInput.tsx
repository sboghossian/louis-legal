"use client";

import {
    useState,
    useCallback,
    useEffect,
    useRef,
    forwardRef,
    useImperativeHandle,
} from "react";
import {
    ArrowRight,
    AudioLines,
    Check,
    File,
    FileText,
    FolderOpen,
    Library,
    Mic,
    MicOff,
    Sparkles,
    Square,
    X,
} from "lucide-react";
import { AddDocButton } from "./AddDocButton";
import { AddDocumentsModal } from "../shared/AddDocumentsModal";
import { AssistantWorkflowModal } from "./AssistantWorkflowModal";
import { ApiKeyMissingModal } from "../shared/ApiKeyMissingModal";
import { ModelToggle } from "./ModelToggle";
import { VoiceModeOverlay } from "./VoiceModeOverlay";
import { useSelectedModel } from "@/app/hooks/useSelectedModel";
import { useRotatingPrompt } from "@/app/hooks/useRotatingPrompt";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLocale } from "@/contexts/LocaleContext";
import {
    getModelProvider,
    isModelAvailable,
    type ModelProvider,
} from "@/app/lib/modelAvailability";
import { subscribeTtsSpeaking } from "@/app/lib/voice/voiceModeBus";
import type { LouisDocument, LouisMessage } from "../shared/types";

const AUTO_ROUTE_STORAGE_KEY = "louis.autoRouteModel";

/**
 * Read the persisted auto-route preference. Defaults to `true` for new users —
 * matches the Settings page checkbox default. Stored as "1"/"0".
 */
function readAutoRoutePref(): boolean {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(AUTO_ROUTE_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1";
}

function writeAutoRoutePref(next: boolean): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTO_ROUTE_STORAGE_KEY, next ? "1" : "0");
}

export interface ChatInputHandle {
    addDoc: (doc: LouisDocument) => void;
}

interface Props {
    onSubmit: (message: LouisMessage) => void;
    onCancel: () => void;
    isLoading: boolean;
    hideAddDocButton?: boolean;
    hideWorkflowButton?: boolean;
    onProjectsClick?: () => void;
    projectName?: string;
    projectCmNumber?: string | null;
}

export const ChatInput = forwardRef<ChatInputHandle, Props>(function ChatInput(
    {
        onSubmit,
        onCancel,
        isLoading,
        hideAddDocButton,
        hideWorkflowButton,
        onProjectsClick,
        projectName,
        projectCmNumber,
    }: Props,
    ref,
) {
    const [value, setValue] = useState("");
    const rotatingPlaceholder = useRotatingPrompt({ enabled: value.length === 0 });
    const [attachedDocs, setAttachedDocs] = useState<LouisDocument[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState<{
        id: string;
        title: string;
    } | null>(null);
    const [model, setModel] = useSelectedModel();
    // Local auto-route state mirrors `localStorage.louis.autoRouteModel`. The
    // Settings page also writes to the same key; we re-read on mount so the
    // checkbox state stays in sync. Default ON for new users.
    const [autoRoute, setAutoRouteState] = useState<boolean>(true);
    useEffect(() => {
        setAutoRouteState(readAutoRoutePref());
    }, []);
    const setAutoRoute = useCallback((next: boolean) => {
        setAutoRouteState(next);
        writeAutoRoutePref(next);
    }, []);
    const { profile } = useUserProfile();
    const { t } = useLocale();
    const apiKeys = profile?.apiKeys;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [docSelectorOpen, setDocSelectorOpen] = useState(false);
    const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
    const [apiKeyModalProvider, setApiKeyModalProvider] =
        useState<ModelProvider | null>(null);

    // Voice dictation via Web Speech API. Captures interim + final results
    // and appends them to the composer. Falls back gracefully when the
    // browser doesn't support it (no button is rendered).
    const recognitionRef = useRef<unknown>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);
    // Full-screen voice-mode overlay (ChatGPT-style continuous dictation).
    // Distinct from the single-shot Mic above: the overlay feeds final
    // transcripts straight into onSubmit (same path as Enter-to-send) and
    // lifts to the global "speaking" status while TTS reads the reply.
    const [voiceModeOpen, setVoiceModeOpen] = useState(false);
    // Track loading transitions so we can flip the overlay's status from
    // "thinking" → "listening" once the assistant reply lands. The actual
    // TTS auto-play is driven by SpeakMessage reading `voiceModeOpen` via
    // a window event — see notifyVoiceModeReply below.
    const wasLoadingRef = useRef(false);
    const [overlayStatus, setOverlayStatus] = useState<
        "listening" | "thinking" | "speaking" | "paused"
    >("listening");
    useEffect(() => {
        if (!voiceModeOpen) return;
        if (isLoading && !wasLoadingRef.current) {
            setOverlayStatus("thinking");
        } else if (!isLoading && wasLoadingRef.current) {
            // Reply just finished streaming. SpeakMessage auto-plays the
            // reply (when TTS is supported + voice-mode is open) and
            // publishes "speaking" on the voiceModeBus. We follow that
            // signal — the subscription below flips us back to
            // "listening" when TTS ends, instead of guessing at 800ms.
            setOverlayStatus("speaking");
        }
        wasLoadingRef.current = isLoading;
    }, [isLoading, voiceModeOpen]);

    // Subscribe to the TTS speaking signal so the orb status reflects
    // real playback state. When TTS ends we return to "listening" if
    // we're not actively waiting on a reply; if there's no TTS support
    // SpeakMessage never fires, and we time out to "listening" after a
    // short grace so the UI doesn't get stuck on "speaking".
    useEffect(() => {
        if (!voiceModeOpen) return;
        let graceTimer: ReturnType<typeof setTimeout> | null = null;
        const unsubscribe = subscribeTtsSpeaking((active) => {
            if (active) {
                if (graceTimer) {
                    clearTimeout(graceTimer);
                    graceTimer = null;
                }
                setOverlayStatus("speaking");
            } else {
                // Defer the listen flip by a tick so React batches the
                // status with whatever next state event arrives (e.g.
                // a new isLoading=true if the user already spoke again).
                graceTimer = setTimeout(() => {
                    setOverlayStatus((s) =>
                        s === "speaking" ? "listening" : s,
                    );
                }, 0);
            }
        });
        // Safety net: if the overlay sits on "speaking" without any
        // TTS event firing within 8s (no-TTS browsers, mute mode), drop
        // back to listening so the UI is usable.
        const safety = setTimeout(() => {
            setOverlayStatus((s) => (s === "speaking" ? "listening" : s));
        }, 8000);
        return () => {
            unsubscribe();
            if (graceTimer) clearTimeout(graceTimer);
            clearTimeout(safety);
        };
    }, [voiceModeOpen]);

    // Probe browser support after mount so SSR matches.
    if (typeof window !== "undefined" && !voiceSupported) {
        const w = window as unknown as {
            SpeechRecognition?: new () => unknown;
            webkitSpeechRecognition?: new () => unknown;
        };
        if (w.SpeechRecognition || w.webkitSpeechRecognition) {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            setVoiceSupported(true);
        }
    }

    function ensureRecognizer(): unknown {
        if (recognitionRef.current) return recognitionRef.current;
        if (typeof window === "undefined") return null;
        const w = window as unknown as {
            SpeechRecognition?: new () => unknown;
            webkitSpeechRecognition?: new () => unknown;
        };
        const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
        if (!Ctor) return null;
        const rec = new Ctor() as {
            lang: string;
            interimResults: boolean;
            continuous: boolean;
            onresult: (e: unknown) => void;
            onerror: (e: unknown) => void;
            onend: () => void;
        };
        rec.lang =
            (typeof navigator !== "undefined" && navigator.language) || "en-US";
        rec.interimResults = true;
        rec.continuous = true;
        rec.onresult = (event: unknown) => {
            const e = event as {
                resultIndex: number;
                results: ArrayLike<{
                    isFinal: boolean;
                    0: { transcript: string };
                }>;
            };
            let finalText = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i];
                if (r.isFinal) finalText += r[0].transcript;
            }
            if (finalText) {
                setValue((prev) =>
                    prev ? `${prev} ${finalText.trim()}` : finalText.trim(),
                );
                if (textareaRef.current) {
                    textareaRef.current.style.height = "auto";
                    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                }
            }
        };
        rec.onerror = (event: unknown) => {
            const e = event as { error?: string };
            setVoiceError(e?.error ?? "voice-input-error");
            setIsRecording(false);
        };
        rec.onend = () => {
            setIsRecording(false);
        };
        recognitionRef.current = rec;
        return rec;
    }

    function toggleVoice() {
        const rec = ensureRecognizer() as {
            start: () => void;
            stop: () => void;
        } | null;
        if (!rec) {
            setVoiceError(t("chat.voice.unsupported"));
            return;
        }
        if (isRecording) {
            rec.stop();
            setIsRecording(false);
        } else {
            setVoiceError(null);
            try {
                rec.start();
                setIsRecording(true);
            } catch {
                // start() throws if a previous session is still finishing —
                // ignore and let onend() reset state.
            }
        }
    }

    useImperativeHandle(ref, () => ({
        addDoc: (doc: LouisDocument) => {
            setAttachedDocs((prev) => {
                if (prev.some((d) => d.id === doc.id)) return prev;
                return [...prev, doc];
            });
        },
    }));

    const handleAddDocFromProject = useCallback((doc: LouisDocument) => {
        setAttachedDocs((prev) => {
            if (prev.some((d) => d.id === doc.id)) return prev;
            return [...prev, doc];
        });
    }, []);

    const handleAddDocsFromSelector = useCallback(
        (selectedDocs: LouisDocument[]) => {
            setAttachedDocs((prev) => {
                const existing = new Set(prev.map((d) => d.id));
                return [
                    ...prev,
                    ...selectedDocs.filter((d) => !existing.has(d.id)),
                ];
            });
        },
        [],
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        const el = e.target;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    };

    const handleSubmit = () => {
        const query = value.trim();
        if (!query || isLoading) return;
        // When auto-route is ON, skip the per-provider key check — the
        // backend classifier picks among the user's available keys and
        // falls back to the env default otherwise.
        if (!autoRoute && apiKeys && !isModelAvailable(model, apiKeys)) {
            setApiKeyModalProvider(getModelProvider(model));
            return;
        }
        setValue("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        const files = attachedDocs.map((d) => ({
            filename: d.filename,
            document_id: d.id,
        }));
        setAttachedDocs([]);
        const wf = selectedWorkflow;
        setSelectedWorkflow(null);

        // Precedence on the server: composer pick > classifier recommendation
        // > env default. When auto-route is ON we omit `model` entirely so
        // the backend's classifier picks per-turn. When OFF, the explicit
        // composer pick wins regardless of `autoRouteModel`.
        //
        // TODO(out-of-scope: frontend/src/app/hooks/useAssistantChat.ts):
        //   the hook should pluck `autoRouteModel` off `message` and forward
        //   it as a top-level field in the streamChat() / streamProjectChat()
        //   POST body. Today the backend defaults to ON when the flag is
        //   absent, so the precedence still works correctly for both "auto"
        //   and "explicit pick" — but a user who explicitly disables
        //   auto-route in Settings AND leaves the composer on a real model
        //   gets identical behavior (the explicit pick wins anyway). The
        //   only un-served case is "auto OFF but composer empty" — which is
        //   unreachable from the UI today because toggling auto OFF auto-
        //   selects a real model.
        onSubmit?.({
            role: "user",
            content: query,
            files: files.length > 0 ? files : undefined,
            workflow: wf ?? undefined,
            model: autoRoute ? undefined : model,
        });
    };

    const handleActionClick = () => {
        if (isLoading) {
            onCancel();
        } else {
            handleSubmit();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <>
            <div className="w-full">
                <div className="border border-border rounded-[16px] md:rounded-[20px] bg-card">
                    {/* Attached chips */}
                    {(selectedWorkflow || attachedDocs.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 px-2 pt-2">
                            {selectedWorkflow && (
                                <div className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs bg-blue-600 text-white border border-white/20 shadow backdrop-blur-sm">
                                    <Library className="h-2.5 w-2.5 shrink-0" />
                                    <span className="max-w-[140px] truncate">
                                        {selectedWorkflow.title}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedWorkflow(null)
                                        }
                                        className="rounded-full p-0.5 ml-0.5 text-white/60 hover:text-white hover:bg-card/20 transition-colors"
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </div>
                            )}
                            {attachedDocs.map((doc) => {
                                const ft = doc.file_type?.toLowerCase();
                                const isPdf = ft === "pdf";
                                return (
                                    <div
                                        key={doc.id}
                                        className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs text-white shadow border border-white/20 bg-black backdrop-blur-sm"
                                    >
                                        {isPdf ? (
                                            <FileText className="h-2.5 w-2.5 shrink-0 text-red-400" />
                                        ) : (
                                            <File className="h-2.5 w-2.5 shrink-0 text-blue-400" />
                                        )}
                                        <span className="max-w-[140px] truncate">
                                            {doc.filename}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setAttachedDocs((prev) =>
                                                    prev.filter(
                                                        (d) => d.id !== doc.id,
                                                    ),
                                                )
                                            }
                                            className="rounded-full p-0.5 ml-0.5 text-white/60 hover:text-white hover:bg-card/20 transition-colors"
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Input */}
                    <div className="px-4 pt-4">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            // Rotate jurisdiction-aware sample prompts while the
                            // input is empty so first-time users see a viable
                            // starting question instead of generic placeholder.
                            placeholder={
                                value.length === 0
                                    ? rotatingPlaceholder
                                    : t("chat.placeholder.default")
                            }
                            value={value}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            className="w-full resize-none text-sm overflow-hidden border-0 text-base p-0 bg-transparent outline-none placeholder:text-muted-foreground leading-6 max-h-48"
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between md:p-2.5 p-2">
                        <div className="flex items-center gap-1">
                            {!hideAddDocButton && (
                                <AddDocButton
                                    onSelectDoc={handleAddDocFromProject}
                                    onBrowseAll={() => setDocSelectorOpen(true)}
                                    selectedDocIds={attachedDocs.map(
                                        (d) => d.id,
                                    )}
                                />
                            )}
                            {onProjectsClick && (
                                <button
                                    type="button"
                                    onClick={onProjectsClick}
                                    aria-label={t("chat.aria.projects")}
                                    className="flex items-center gap-1.5 rounded-lg px-2 h-8 text-sm text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
                                >
                                    <FolderOpen className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">
                                        {t("chat.btn.projects")}
                                    </span>
                                </button>
                            )}
                            {!hideWorkflowButton && (
                                <button
                                    type="button"
                                    onClick={() => setWorkflowModalOpen(true)}
                                    aria-label={t("chat.aria.workflows")}
                                    className={`flex items-center gap-1.5 rounded-lg px-2 h-8 text-sm transition-colors ${selectedWorkflow ? "text-blue-600 hover:bg-blue-50" : "text-muted-foreground hover:bg-muted hover:text-foreground/80"}`}
                                >
                                    {selectedWorkflow ? (
                                        <Check className="h-3.5 w-3.5" />
                                    ) : (
                                        <Library className="h-3.5 w-3.5" />
                                    )}
                                    <span className="hidden sm:inline">
                                        {t("chat.btn.workflows")}
                                    </span>
                                </button>
                            )}
                            {voiceSupported && (
                                <button
                                    type="button"
                                    onClick={() => setVoiceModeOpen(true)}
                                    aria-label={t("chat.aria.voice_mode")}
                                    title={t("chat.voice.title.tooltip")}
                                    className="flex items-center gap-1.5 rounded-lg px-2 h-8 text-sm text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
                                >
                                    <AudioLines className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">
                                        {t("chat.btn.voice_mode")}
                                    </span>
                                </button>
                            )}
                            {voiceSupported && (
                                <button
                                    type="button"
                                    onClick={toggleVoice}
                                    aria-label={
                                        isRecording
                                            ? t("chat.aria.voice_stop")
                                            : t("chat.aria.voice_start")
                                    }
                                    title={
                                        voiceError
                                            ? `${t("chat.btn.voice")}: ${voiceError}`
                                            : isRecording
                                              ? t("chat.voice.tip.listening")
                                              : t("chat.voice.tip.dictate")
                                    }
                                    className={`flex items-center gap-1.5 rounded-lg px-2 h-8 text-sm transition-colors ${
                                        isRecording
                                            ? "text-red-600 bg-red-50 hover:bg-red-100"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground/80"
                                    }`}
                                >
                                    {isRecording ? (
                                        <MicOff className="h-3.5 w-3.5" />
                                    ) : (
                                        <Mic className="h-3.5 w-3.5" />
                                    )}
                                    <span className="hidden sm:inline">
                                        {isRecording ? t("chat.btn.listening") : t("chat.btn.voice")}
                                    </span>
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Auto-route toggle. ON = let the backend's
                                classifier pick the model per turn (recommended
                                default). OFF = pin to the model in ModelToggle.
                                Mirrors the Settings page checkbox. */}
                            <button
                                type="button"
                                onClick={() => setAutoRoute(!autoRoute)}
                                aria-pressed={autoRoute}
                                aria-label={
                                    autoRoute
                                        ? t("chat.auto.aria.on")
                                        : t("chat.auto.aria.off")
                                }
                                title={
                                    autoRoute
                                        ? t("chat.auto.tooltip.on")
                                        : t("chat.auto.tooltip.off")
                                }
                                className={`flex items-center gap-1.5 rounded-lg px-2 h-8 text-sm transition-colors cursor-pointer ${
                                    autoRoute
                                        ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground/80"
                                }`}
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t("chat.auto.label")}</span>
                            </button>
                            {!autoRoute && (
                                <ModelToggle
                                    value={model}
                                    onChange={setModel}
                                    apiKeys={apiKeys}
                                />
                            )}
                            <button
                                type="button"
                                className="relative bg-gradient-to-b from-neutral-700 to-black text-white rounded-[10px] h-8 w-8 flex items-center justify-center cursor-pointer disabled:cursor-default disabled:from-neutral-600 disabled:to-black backdrop-blur-xl border border-white/30 active:enabled:scale-95 transition-all duration-150"
                                onClick={handleActionClick}
                                disabled={!isLoading && !value.trim()}
                            >
                                {isLoading ? (
                                    <Square
                                        className="h-4 w-4"
                                        fill="currentColor"
                                        strokeWidth={0}
                                    />
                                ) : (
                                    <ArrowRight className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <AddDocumentsModal
                open={docSelectorOpen}
                onClose={() => setDocSelectorOpen(false)}
                onSelect={handleAddDocsFromSelector}
                breadcrumb={["Assistant", "Add Documents"]}
            />
            <AssistantWorkflowModal
                open={workflowModalOpen}
                onClose={() => setWorkflowModalOpen(false)}
                onSelect={(wf) => {
                    setSelectedWorkflow({ id: wf.id, title: wf.title });
                    setWorkflowModalOpen(false);
                }}
                projectName={projectName}
                projectCmNumber={projectCmNumber}
            />
            <ApiKeyMissingModal
                open={apiKeyModalProvider !== null}
                provider={apiKeyModalProvider}
                onClose={() => setApiKeyModalProvider(null)}
            />
            <VoiceModeOverlay
                open={voiceModeOpen}
                onClose={() => setVoiceModeOpen(false)}
                externalStatus={overlayStatus}
                onSubmitTranscript={(transcript) => {
                    // Reuse the same submit pipeline as the textarea — we
                    // bypass `value` state because the overlay holds its
                    // own transcript and we don't want a flash in the
                    // composer behind the cream backdrop.
                    if (isLoading) return;
                    const query = transcript.trim();
                    if (!query) return;
                    if (
                        !autoRoute &&
                        apiKeys &&
                        !isModelAvailable(model, apiKeys)
                    ) {
                        setApiKeyModalProvider(getModelProvider(model));
                        return;
                    }
                    const files = attachedDocs.map((d) => ({
                        filename: d.filename,
                        document_id: d.id,
                    }));
                    setAttachedDocs([]);
                    const wf = selectedWorkflow;
                    setSelectedWorkflow(null);
                    onSubmit?.({
                        role: "user",
                        content: query,
                        files: files.length > 0 ? files : undefined,
                        workflow: wf ?? undefined,
                        model: autoRoute ? undefined : model,
                    });
                }}
            />
        </>
    );
});
