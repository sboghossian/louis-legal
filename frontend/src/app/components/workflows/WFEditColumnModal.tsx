"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, X } from "lucide-react";
import type { ColumnConfig, ColumnFormat } from "../shared/types";
import { generateTabularColumnPrompt } from "@/app/lib/louisApi";
import { FORMAT_OPTIONS, formatLabel, formatIcon } from "../tabular/columnFormat";
import { TAG_COLORS } from "../tabular/pillUtils";
import { getPresetConfig, PROMPT_PRESETS } from "../tabular/columnPresets";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ColumnDraft {
    name: string;
    prompt: string;
    format: ColumnFormat;
    tags: string[];
    tagInput: string;
}

interface Props {
    column: ColumnConfig;
    onClose: () => void;
    onSave: (col: ColumnConfig) => void;
    onDelete: () => void;
}

export function WFEditColumnModal({ column, onClose, onSave, onDelete }: Props) {
    const [draft, setDraft] = useState<ColumnDraft>({
        name: column.name,
        prompt: column.prompt,
        format: column.format ?? "text",
        tags: column.tags ?? [],
        tagInput: "",
    });
    const [generating, setGenerating] = useState(false);
    const [presetsOpen, setPresetsOpen] = useState(false);
    const presetsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setDraft({
            name: column.name,
            prompt: column.prompt,
            format: column.format ?? "text",
            tags: column.tags ?? [],
            tagInput: "",
        });
        setPresetsOpen(false);
    }, [column]);

    useEffect(() => {
        if (!presetsOpen) return;
        function handleClickOutside(e: MouseEvent) {
            if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
                setPresetsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [presetsOpen]);

    function update(patch: Partial<ColumnDraft>) {
        setDraft((prev) => ({ ...prev, ...patch }));
    }

    function commitTag() {
        const tag = draft.tagInput.trim();
        if (!tag || draft.tags.includes(tag)) {
            update({ tagInput: "" });
            return;
        }
        update({ tags: [...draft.tags, tag], tagInput: "" });
    }

    function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commitTag();
        } else if (e.key === "Backspace" && draft.tagInput === "" && draft.tags.length > 0) {
            update({ tags: draft.tags.slice(0, -1) });
        }
    }

    async function autoGeneratePrompt() {
        const title = draft.name.trim();
        if (!title) return;
        setGenerating(true);
        try {
            const { prompt } = await generateTabularColumnPrompt(title, {
                format: draft.format,
                tags: draft.format === "tag" ? draft.tags : undefined,
            });
            update({ prompt });
        } finally {
            setGenerating(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!draft.name.trim() || !draft.prompt.trim()) return;
        onSave({
            index: column.index,
            name: draft.name.trim(),
            prompt: draft.prompt.trim(),
            format: draft.format,
            tags: draft.format === "tag" ? draft.tags : undefined,
        });
    }

    const FormatIcon = formatIcon(draft.format);

    return createPortal(
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/20 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-card shadow-2xl flex flex-col h-[600px]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Workflows</span>
                        <span>›</span>
                        <span>Edit column</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
                    {/* Body */}
                    <div className="px-6 pt-3 pb-5 overflow-y-auto flex-1">
                        {/* Name row */}
                        <div className="flex items-start gap-2">
                            <div className="relative flex flex-1 items-start" ref={presetsRef}>
                                <input
                                    type="text"
                                    value={draft.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        const preset = getPresetConfig(name);
                                        update({
                                            name,
                                            ...(preset ? {
                                                prompt: preset.prompt,
                                                format: preset.format,
                                                tags: preset.tags ?? [],
                                                tagInput: "",
                                            } : {}),
                                        });
                                    }}
                                    placeholder="Column name"
                                    className="flex-1 text-2xl font-serif text-foreground placeholder-gray-400 focus:outline-none bg-transparent"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setPresetsOpen((v) => !v)}
                                    title="Column presets"
                                    className="mt-1.5 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground/80"
                                >
                                    <ChevronDown className={`h-4 w-4 transition-transform ${presetsOpen ? "rotate-180" : ""}`} />
                                </button>
                                {presetsOpen && (
                                    <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-card shadow-lg overflow-y-auto max-h-64">
                                        <button
                                            type="button"
                                            onClick={() => { update({ name: "", prompt: "", format: "text", tags: [], tagInput: "" }); setPresetsOpen(false); }}
                                            className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted transition-colors border-b border-border"
                                        >
                                            No Preset
                                        </button>
                                        {PROMPT_PRESETS.map((preset) => (
                                            <button
                                                key={preset.name}
                                                type="button"
                                                onClick={() => {
                                                    update({ name: preset.name, prompt: preset.prompt, format: preset.format, tags: preset.tags ?? [], tagInput: "" });
                                                    setPresetsOpen(false);
                                                }}
                                                className="w-full px-3 py-2 text-left text-sm text-foreground/80 hover:bg-muted transition-colors"
                                            >
                                                {preset.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Format */}
                        <div className="mt-4">
                            <label className="text-sm font-medium text-muted-foreground">Format</label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="mt-1 flex items-center justify-between rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground/80 hover:border-border focus:outline-none">
                                        <span className="flex items-center gap-2">
                                            <FormatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                            {formatLabel(draft.format)}
                                        </span>
                                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="z-[200]">
                                    <DropdownMenuRadioGroup
                                        value={draft.format}
                                        onValueChange={(v) => update({ format: v as ColumnFormat, tags: [], tagInput: "" })}
                                    >
                                        {FORMAT_OPTIONS.map((o) => (
                                            <DropdownMenuRadioItem key={o.value} value={o.value}>
                                                <o.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                {o.label}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Tag input */}
                        {draft.format === "tag" && (
                            <div className="mt-3">
                                <label className="text-sm font-medium text-muted-foreground">Tags</label>
                                <div className="mt-1 flex flex-wrap gap-1.5 rounded-md border border-border px-2 py-1.5 focus-within:border-border">
                                    {draft.tags.map((tag, tagIdx) => (
                                        <span
                                            key={tag}
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${TAG_COLORS[tagIdx % TAG_COLORS.length]}`}
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => update({ tags: draft.tags.filter((t) => t !== tag) })}
                                                className="text-muted-foreground hover:text-muted-foreground"
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        value={draft.tagInput}
                                        onChange={(e) => update({ tagInput: e.target.value })}
                                        onKeyDown={handleTagKeyDown}
                                        onBlur={commitTag}
                                        placeholder="Add tag…"
                                        className="min-w-[80px] flex-1 bg-transparent text-sm text-foreground/80 placeholder-gray-400 focus:outline-none"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">Press Enter or comma to add a tag.</p>
                            </div>
                        )}

                        {/* Prompt */}
                        <div className="mt-4 flex items-center justify-between">
                            <label className="text-sm font-medium text-muted-foreground">Prompt</label>
                            <button
                                type="button"
                                onClick={autoGeneratePrompt}
                                disabled={!draft.name.trim() || generating}
                                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:text-muted-foreground"
                            >
                                {generating ? (
                                    <span className="h-4 w-4 rounded-full border-2 border-border border-t-gray-600 animate-spin block" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                                Auto-Generate Prompt
                            </button>
                        </div>
                        <textarea
                            rows={6}
                            value={draft.prompt}
                            onChange={(e) => update({ prompt: e.target.value })}
                            placeholder="Write the analysis prompt — describe what Louis should extract from each document for this column…"
                            className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm text-foreground/80 placeholder-gray-400 focus:border-border focus:outline-none bg-transparent resize-none leading-relaxed"
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border px-6 py-4">
                        <button
                            type="button"
                            onClick={onDelete}
                            className="rounded-lg px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                            Delete
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!draft.name.trim() || !draft.prompt.trim()}
                                className="rounded-lg bg-foreground px-5 py-2 text-sm font-medium text-white hover:bg-foreground disabled:opacity-40 transition-colors"
                            >
                                Save changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
}
