"use client";

/**
 * SuggestionsRail
 * ---------------
 * Right-side, collapsible rail with three tabbed panels:
 *   - Suggestions: every pending track-change in the doc (Accept / Reject).
 *   - Comments:    every comment thread (click to scroll, Resolve, Delete).
 *   - Versions:    autosaved snapshots in localStorage with Restore.
 *
 * The rail reads directly from the editor's state via collect helpers, so
 * it stays in sync without prop-drilling.
 */
import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Check, X, MessageCircle, History, ListChecks, Trash2 } from "lucide-react";
import { collectComments, collectTrackChanges } from "./utils/extract";
import styles from "./editor.module.css";

export interface VersionSnapshot {
    id: string;
    createdAt: string;
    html: string;
    wordCount: number;
}

interface Props {
    editor: Editor | null;
    docId: string;
    onScrollTo: (pos: number) => void;
    /** Bumps every time the editor doc changes; forces collect re-runs. */
    revision: number;
}

type RailTab = "suggestions" | "comments" | "versions";

const VERSIONS_KEY = (docId: string) => `louis.docVersions.${docId}`;

export function SuggestionsRail({ editor, docId, onScrollTo, revision }: Props) {
    const [tab, setTab] = useState<RailTab>("suggestions");
    const [versions, setVersions] = useState<VersionSnapshot[]>([]);

    const comments = useMemo(() => collectComments(editor), [editor, revision]);
    const changes  = useMemo(() => collectTrackChanges(editor), [editor, revision]);

    // Load versions from localStorage.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(VERSIONS_KEY(docId));
            setVersions(raw ? (JSON.parse(raw) as VersionSnapshot[]) : []);
        } catch {
            setVersions([]);
        }
    }, [docId, revision]);

    function refreshVersions() {
        try {
            const raw = localStorage.getItem(VERSIONS_KEY(docId));
            setVersions(raw ? (JSON.parse(raw) as VersionSnapshot[]) : []);
        } catch {
            /* noop */
        }
    }

    return (
        <div className={styles.rail} aria-label="Editor side rail">
            <div className={styles.railTabs} role="tablist">
                <button
                    role="tab"
                    aria-selected={tab === "suggestions"}
                    className={`${styles.railTab} ${tab === "suggestions" ? styles.active : ""}`}
                    onClick={() => setTab("suggestions")}
                >
                    <ListChecks size={12} style={{ display: "inline", marginRight: 4 }} />
                    Suggestions {changes.length ? `(${changes.length})` : ""}
                </button>
                <button
                    role="tab"
                    aria-selected={tab === "comments"}
                    className={`${styles.railTab} ${tab === "comments" ? styles.active : ""}`}
                    onClick={() => setTab("comments")}
                >
                    <MessageCircle size={12} style={{ display: "inline", marginRight: 4 }} />
                    Comments {comments.length ? `(${comments.length})` : ""}
                </button>
                <button
                    role="tab"
                    aria-selected={tab === "versions"}
                    className={`${styles.railTab} ${tab === "versions" ? styles.active : ""}`}
                    onClick={() => { setTab("versions"); refreshVersions(); }}
                >
                    <History size={12} style={{ display: "inline", marginRight: 4 }} />
                    Versions {versions.length ? `(${versions.length})` : ""}
                </button>
            </div>

            <div className={styles.railBody}>
                {tab === "suggestions" && (
                    <SuggestionsPanel editor={editor} changes={changes} onScrollTo={onScrollTo} />
                )}
                {tab === "comments" && (
                    <CommentsPanel editor={editor} comments={comments} onScrollTo={onScrollTo} />
                )}
                {tab === "versions" && (
                    <VersionsPanel
                        editor={editor}
                        docId={docId}
                        versions={versions}
                        onChanged={refreshVersions}
                    />
                )}
            </div>
        </div>
    );
}

// ---------------- Suggestions ----------------
function SuggestionsPanel({
    editor, changes, onScrollTo,
}: {
    editor: Editor | null;
    changes: ReturnType<typeof collectTrackChanges>;
    onScrollTo: (pos: number) => void;
}) {
    if (!editor) return null;
    if (!changes.length) {
        return <div style={{ color: "#9ca3af", fontSize: 12 }}>No tracked changes yet. Toggle “Suggest edit” in the toolbar to start redlining.</div>;
    }
    return (
        <>
            {changes.map((c) => (
                <div key={`${c.kind}:${c.id}`} className={styles.railItem}>
                    <div className={styles.meta}>
                        <strong style={{ color: c.kind === "insertion" ? "#166534" : "#b91c1c" }}>
                            {c.kind === "insertion" ? "Insert" : "Delete"}
                        </strong>
                        {" · "}
                        {c.author || "unknown"} · {new Date(c.createdAt).toLocaleString()}
                    </div>
                    <div
                        className={styles.quote}
                        onClick={() => onScrollTo(c.from)}
                        style={{
                            textDecoration: c.kind === "deletion" ? "line-through" : "underline",
                            color: c.kind === "deletion" ? "#b91c1c" : "#166534",
                            cursor: "pointer",
                        }}
                    >
                        {c.text.length > 160 ? c.text.slice(0, 160) + "…" : c.text}
                    </div>
                    <div className={styles.railActions}>
                        <button
                            className={`${styles.railBtn} ${styles.primary}`}
                            onClick={() => {
                                if (c.kind === "insertion") {
                                    editor.chain().focus().unsetInsertion(c.id).run();
                                } else {
                                    editor.chain().focus().acceptDeletion(c.id).run();
                                }
                            }}
                            aria-label="Accept change"
                        >
                            <Check size={11} /> Accept
                        </button>
                        <button
                            className={`${styles.railBtn} ${styles.danger}`}
                            onClick={() => {
                                if (c.kind === "insertion") {
                                    // Reject insertion = remove the text.
                                    editor.chain().focus().deleteRange({ from: c.from, to: c.to }).run();
                                } else {
                                    // Reject deletion = drop the mark, keep the text.
                                    editor.chain().focus().unsetDeletion(c.id).run();
                                }
                            }}
                            aria-label="Reject change"
                        >
                            <X size={11} /> Reject
                        </button>
                    </div>
                </div>
            ))}
        </>
    );
}

// ---------------- Comments ----------------
function CommentsPanel({
    editor, comments, onScrollTo,
}: {
    editor: Editor | null;
    comments: ReturnType<typeof collectComments>;
    onScrollTo: (pos: number) => void;
}) {
    if (!editor) return null;
    if (!comments.length) {
        return <div style={{ color: "#9ca3af", fontSize: 12 }}>No comments yet. Select text and click <strong>Comment</strong> in the toolbar.</div>;
    }
    return (
        <>
            {comments.map((c) => (
                <div key={c.id} className={styles.railItem} style={{ opacity: c.resolved ? 0.6 : 1 }}>
                    <div className={styles.meta}>
                        <strong>{c.author || "Anon"}</strong> · {new Date(c.createdAt).toLocaleString()}
                        {c.resolved && <span> · resolved</span>}
                    </div>
                    <div
                        className={styles.quote}
                        onClick={() => onScrollTo(c.from)}
                    >
                        “{c.text}”
                    </div>
                    <div className={styles.railActions}>
                        <button
                            className={styles.railBtn}
                            onClick={() => editor.chain().focus().toggleCommentResolved(c.id).run()}
                        >
                            {c.resolved ? "Re-open" : "Resolve"}
                        </button>
                        <button
                            className={`${styles.railBtn} ${styles.danger}`}
                            onClick={() => editor.chain().focus().unsetComment(c.id).run()}
                            aria-label="Delete comment"
                        >
                            <Trash2 size={11} />
                        </button>
                    </div>
                </div>
            ))}
        </>
    );
}

// ---------------- Versions ----------------
function VersionsPanel({
    editor, docId, versions, onChanged,
}: {
    editor: Editor | null;
    docId: string;
    versions: VersionSnapshot[];
    onChanged: () => void;
}) {
    if (!editor) return null;

    function saveNow() {
        try {
            const next: VersionSnapshot = {
                id: `v_${Date.now()}`,
                createdAt: new Date().toISOString(),
                html: editor!.getHTML(),
                wordCount: countWords(editor!.getText()),
            };
            const raw = localStorage.getItem(VERSIONS_KEY(docId));
            const list = raw ? (JSON.parse(raw) as VersionSnapshot[]) : [];
            list.unshift(next);
            localStorage.setItem(VERSIONS_KEY(docId), JSON.stringify(list.slice(0, 20)));
            onChanged();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("[editor] saveNow failed", e);
        }
    }

    function restore(v: VersionSnapshot) {
        if (!editor) return;
        if (!confirm(`Restore version from ${new Date(v.createdAt).toLocaleString()}? Your current draft will be replaced (a fresh snapshot is taken first).`)) return;
        saveNow();
        editor.commands.setContent(v.html, { emitUpdate: true });
    }

    function remove(id: string) {
        try {
            const raw = localStorage.getItem(VERSIONS_KEY(docId));
            const list = raw ? (JSON.parse(raw) as VersionSnapshot[]) : [];
            localStorage.setItem(VERSIONS_KEY(docId), JSON.stringify(list.filter((v) => v.id !== id)));
            onChanged();
        } catch {
            /* noop */
        }
    }

    return (
        <>
            <button className={`${styles.railBtn} ${styles.primary}`} onClick={saveNow} style={{ marginBottom: 8 }}>
                Snapshot now
            </button>
            {!versions.length && (
                <div style={{ color: "#9ca3af", fontSize: 12 }}>No saved versions yet.</div>
            )}
            {versions.map((v) => (
                <div key={v.id} className={styles.railItem}>
                    <div className={styles.meta}>
                        {new Date(v.createdAt).toLocaleString()} · {v.wordCount} words
                    </div>
                    <div className={styles.railActions}>
                        <button className={styles.railBtn} onClick={() => restore(v)}>Restore</button>
                        <button className={`${styles.railBtn} ${styles.danger}`} onClick={() => remove(v.id)} aria-label="Delete version">
                            <Trash2 size={11} />
                        </button>
                    </div>
                </div>
            ))}
        </>
    );
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}
