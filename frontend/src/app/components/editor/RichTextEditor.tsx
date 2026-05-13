"use client";

/**
 * RichTextEditor
 * --------------
 * Top-level rich-text editor for Louis. Wraps TipTap with our custom
 * extensions (Comment, Insertion/Deletion marks, SuggestEdit plugin),
 * a Toolbar, a SuggestionsRail, and a BottomBar.
 *
 * Performance: autosave is debounced 1.5s after the last keystroke and
 * mirrored to localStorage (`louis.docDraft.<docId>`). Snapshots into the
 * Versions panel happen on the 5s heartbeat (autosave-to-versions) so the
 * user can roll back without manually hitting "Snapshot now".
 *
 * Editor extensions are loaded inside this component, which is itself
 * dynamically imported by the page so the StarterKit + marks stay out of
 * the route-shell bundle.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { Toolbar } from "./Toolbar";
import { SuggestionsRail } from "./SuggestionsRail";
import { BottomBar } from "./BottomBar";
import { buildExtensions } from "./extensions";
import type { CommentAttrs } from "./extensions/comment-mark";
import { blocksToHTML, htmlToBlocks, type ServerBlock } from "./utils/blocks";
import { useToast } from "@/contexts/ToastContext";
import styles from "./editor.module.css";

export interface RichTextEditorProps {
    /** Document id; used for localStorage keying. */
    docId: string;
    /** Document title (for export filenames + ARIA). */
    title: string;
    /** Initial server blocks (loaded from /content endpoint). */
    initialBlocks: ServerBlock[];
    /**
     * Authoritative HTML from the server, if any. When present, the editor
     * loads from this string (preserving inline formatting, comments, and
     * track-changes marks) rather than from `initialBlocks`.
     */
    initialHtml?: string | null;
    /**
     * Optimistic-concurrency counter for the HTML payload. Echoed back to
     * the server on every PUT; a 409 response triggers a reload-latest flow.
     * Defaults to 1 (matches the migration default for fresh docs).
     */
    initialHtmlVersion?: number;
    /** Author name to stamp on comments + tracked changes. */
    authorName?: string;
    /** Right rail open by default. */
    railOpen?: boolean;
    /** Optional callback when the user-edited document is committed back to
     *  blocks (every 1.5s during typing, after debounce). */
    onPersist?: (blocks: ServerBlock[], html: string) => void;
    /**
     * Async PUT to the backend. The editor calls this on the autosave
     * debounce (1.5s). The implementation lives in the page so the editor
     * stays auth-free; the page wraps `fetch(PUT /api/doc-workspace/:id/content)`.
     *
     * Resolve with `{ ok: true, version }` on success; resolve with
     * `{ ok: false, conflict: true, currentVersion }` on a 409 so the editor
     * can show the conflict toast and reload; reject (or resolve with
     * `{ ok: false, network: true }`) on a network failure so the editor
     * can flip to the offline badge.
     */
    onRemoteSave?: (html: string, version: number) => Promise<RemoteSaveResult>;
}

export type RemoteSaveResult =
    | { ok: true; version: number; savedAt?: string }
    | { ok: false; conflict: true; currentVersion: number }
    | { ok: false; network: true; message?: string };

const DRAFT_KEY      = (docId: string) => `louis.docDraft.${docId}`;
const VERSIONS_KEY   = (docId: string) => `louis.docVersions.${docId}`;
const AUTOSAVE_MS    = 1500;
const VERSIONS_MS    = 5000;
const VERSIONS_LIMIT = 20;

export function RichTextEditor({
    docId,
    title,
    initialBlocks,
    initialHtml = null,
    initialHtmlVersion = 1,
    authorName = "You",
    railOpen: railOpenProp = true,
    onPersist,
    onRemoteSave,
}: RichTextEditorProps) {
    const { toast } = useToast();
    const [suggestMode, setSuggestMode] = useState(false);
    const [tone, setTone]               = useState(50);
    const [railOpen, setRailOpen]       = useState(railOpenProp);
    const [savedAt, setSavedAt]         = useState<Date | null>(null);
    const [revision, setRevision]       = useState(0);
    const [offline, setOffline]         = useState(false);
    const [conflict, setConflict]       = useState(false);

    // Optimistic-concurrency counter. The PUT echoes the version back; we
    // bump our local copy on success so subsequent saves match the server's
    // expectation.
    const versionRef = useRef(initialHtmlVersion);
    useEffect(() => { versionRef.current = initialHtmlVersion; }, [initialHtmlVersion]);

    // Hold the latest suggestMode / authorName in refs so the SuggestEdit
    // plugin doesn't need to rebuild when they change.
    const suggestModeRef = useRef(suggestMode);
    const authorRef      = useRef(authorName);
    useEffect(() => { suggestModeRef.current = suggestMode; }, [suggestMode]);
    useEffect(() => { authorRef.current      = authorName;   }, [authorName]);

    // Initial content precedence:
    //   1. localStorage offline draft  (network was down → user kept typing)
    //   2. server-provided HTML        (authoritative, preserves comments + track-changes)
    //   3. server-provided blocks      (legacy / first-ever load, no HTML yet)
    //
    // The localStorage draft is the *crash-recovery* tier — it only matters
    // when the user typed during a network outage. Once a remote save
    // succeeds, the draft is cleared (see autosave effect below).
    const initialHTML = useMemo(() => {
        if (typeof window !== "undefined") {
            try {
                const draft = localStorage.getItem(DRAFT_KEY(docId));
                if (draft) return draft;
            } catch { /* noop */ }
        }
        if (initialHtml && initialHtml.length > 0) return initialHtml;
        return blocksToHTML(initialBlocks);
    }, [docId, initialBlocks, initialHtml]);

    const editor = useEditor({
        extensions: [
            ...buildExtensions({
                placeholder: "Start typing your document…",
                suggestEdit: {
                    getEnabled: () => suggestModeRef.current,
                    getAuthor:  () => authorRef.current,
                    newId:      () => Math.random().toString(36).slice(2, 12),
                },
            }),
            Placeholder.configure({
                placeholder: "Start typing your document…",
                emptyEditorClass: "is-editor-empty",
            }),
        ],
        content: initialHTML,
        immediatelyRender: false, // SSR-safe per TipTap docs
        editorProps: {
            attributes: {
                role: "textbox",
                "aria-multiline": "true",
                "aria-label": `Document body: ${title}`,
                spellcheck: "true",
            },
        },
        onUpdate: () => {
            // Bump revision so the right rail re-collects.
            setRevision((r) => r + 1);
        },
    });

    // Autosave (debounced 1.5s).
    //
    // Happy path: call onRemoteSave(html, version) → bump versionRef, clear
    // any offline draft, surface savedAt.
    //
    // 409 conflict: another tab persisted newer HTML. We toast and reload
    // the latest (the page is expected to re-fetch /content; we expose the
    // conflict state via a `conflict` flag the page can subscribe to).
    //
    // Network failure: write the HTML to localStorage so the user doesn't
    // lose work, flip the `offline` flag so the toolbar can show the
    // "Offline — changes saved locally" badge. On the next successful
    // remote save the offline draft is cleared.
    //
    // If onRemoteSave isn't provided (e.g. mounted in a story / preview),
    // we fall back to the previous localStorage-only behaviour so the
    // component remains usable in isolation.
    useEffect(() => {
        if (!editor) return;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;

        const handler = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(async () => {
                if (cancelled) return;
                const html = editor.getHTML();
                if (onPersist) {
                    try { onPersist(htmlToBlocks(html), html); } catch { /* noop */ }
                }

                if (!onRemoteSave) {
                    // Standalone fallback — preserves the pre-persistence behavior.
                    try {
                        localStorage.setItem(DRAFT_KEY(docId), html);
                        setSavedAt(new Date());
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.warn("[editor] local autosave failed", e);
                    }
                    return;
                }

                try {
                    const result = await onRemoteSave(html, versionRef.current);
                    if (cancelled) return;
                    if (result.ok) {
                        versionRef.current = result.version;
                        setSavedAt(result.savedAt ? new Date(result.savedAt) : new Date());
                        setOffline(false);
                        setConflict(false);
                        // Successful remote save → any offline draft is stale.
                        try { localStorage.removeItem(DRAFT_KEY(docId)); } catch { /* noop */ }
                    } else if ("conflict" in result && result.conflict) {
                        // eslint-disable-next-line no-console
                        console.warn("[editor] save conflict — server version", result.currentVersion);
                        setConflict(true);
                        // Don't clobber the user's in-memory buffer; the page-level
                        // handler is responsible for re-fetching /content and
                        // re-mounting the editor with the new HTML if the user accepts.
                    } else {
                        // network failure → keep work in localStorage
                        try {
                            localStorage.setItem(DRAFT_KEY(docId), html);
                            setOffline(true);
                            setSavedAt(new Date());
                        } catch { /* noop */ }
                    }
                } catch (e) {
                    // Treat thrown errors as a network failure.
                    try {
                        localStorage.setItem(DRAFT_KEY(docId), html);
                        setOffline(true);
                        setSavedAt(new Date());
                    } catch { /* noop */ }
                    // eslint-disable-next-line no-console
                    console.warn("[editor] remote save threw, kept local draft", e);
                }
            }, AUTOSAVE_MS);
        };

        editor.on("update", handler);
        return () => {
            cancelled = true;
            editor.off("update", handler);
            if (timer) clearTimeout(timer);
        };
    }, [editor, docId, onPersist, onRemoteSave]);

    // Versions heartbeat: every 5s, if the doc changed since the last
    // snapshot, push a snapshot into localStorage. Capped at VERSIONS_LIMIT.
    useEffect(() => {
        if (!editor) return;
        let lastHTML = editor.getHTML();
        const interval = setInterval(() => {
            const html = editor.getHTML();
            if (html === lastHTML) return;
            lastHTML = html;
            try {
                const raw = localStorage.getItem(VERSIONS_KEY(docId));
                const list = raw ? (JSON.parse(raw) as Array<{ id: string; createdAt: string; html: string; wordCount: number }>) : [];
                list.unshift({
                    id: `v_${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    html,
                    wordCount: countWords(editor.getText()),
                });
                localStorage.setItem(VERSIONS_KEY(docId), JSON.stringify(list.slice(0, VERSIONS_LIMIT)));
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn("[editor] versions heartbeat failed", e);
            }
        }, VERSIONS_MS);
        return () => clearInterval(interval);
    }, [editor, docId]);

    // Cmd/Ctrl+K → insert link. Cmd+B/I/U are handled by StarterKit/Underline.
    useEffect(() => {
        if (!editor) return;
        const onKey = (e: KeyboardEvent) => {
            const cmd = e.metaKey || e.ctrlKey;
            if (cmd && e.key.toLowerCase() === "k") {
                e.preventDefault();
                const prev = editor.getAttributes("link").href as string | undefined;
                const url = window.prompt("Link URL", prev || "https://");
                if (url === null) return;
                if (url === "") {
                    editor.chain().focus().extendMarkRange("link").unsetLink().run();
                } else {
                    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                }
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [editor]);

    function insertComment() {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        if (from === to) {
            toast({
                title: "Select some text first",
                description: "Highlight a passage, then click Comment.",
                variant: "info",
            });
            return;
        }
        const text = window.prompt("Comment");
        if (!text || !text.trim()) return;
        const attrs: CommentAttrs = {
            id: Math.random().toString(36).slice(2, 12),
            author: authorName,
            text: text.trim(),
            createdAt: new Date().toISOString(),
            resolved: false,
        };
        editor.chain().focus().setComment(attrs).run();
    }

    function scrollToPos(pos: number) {
        if (!editor) return;
        editor.commands.focus();
        editor.commands.setTextSelection(pos);
        // Use ProseMirror DOM coords to scroll the editor into view.
        const { node } = editor.view.domAtPos(pos);
        const el = node instanceof Element ? node : node.parentElement;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            <Toolbar
                editor={editor}
                suggestMode={suggestMode}
                onToggleSuggestMode={() => setSuggestMode((v) => !v)}
                onInsertComment={insertComment}
                tone={tone}
                onToneChange={(v) => {
                    setTone(v);
                    const lbl = v < 33 ? "plain" : v < 67 ? "balanced" : "formal";
                    // eslint-disable-next-line no-console
                    console.log("[editor] tone changed:", { value: v, label: lbl });
                }}
            />

            {(offline || conflict) && (
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        padding: "4px 12px",
                        fontSize: 12,
                        background: conflict ? "#fef3c7" : "#fee2e2",
                        color: conflict ? "#92400e" : "#991b1b",
                        borderBottom: "1px solid",
                        borderColor: conflict ? "#fcd34d" : "#fecaca",
                    }}
                >
                    {conflict ? (
                        <>
                            <span>Another tab edited this doc. Reload to see the latest version.</span>
                            <button
                                type="button"
                                onClick={() => { if (typeof window !== "undefined") window.location.reload(); }}
                                style={{
                                    marginLeft: "auto",
                                    border: "1px solid currentColor",
                                    background: "transparent",
                                    color: "inherit",
                                    fontSize: 11,
                                    padding: "1px 6px",
                                    borderRadius: 3,
                                    cursor: "pointer",
                                }}
                            >
                                Reload
                            </button>
                        </>
                    ) : (
                        <span>Offline — changes saved locally and will sync when you're back online.</span>
                    )}
                </div>
            )}

            <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                <div className={styles.paper} style={{ flex: 1, overflowY: "auto" }}>
                    <div className={styles.sheet}>
                        <EditorContent editor={editor} />
                    </div>
                </div>

                {railOpen && (
                    <SuggestionsRail
                        editor={editor}
                        docId={docId}
                        revision={revision}
                        onScrollTo={scrollToPos}
                    />
                )}
            </div>

            <BottomBar editor={editor} title={title} savedAt={savedAt} />

            {/* tiny rail-toggle, anchored bottom-right of the editor pane */}
            <button
                type="button"
                onClick={() => setRailOpen((v) => !v)}
                aria-label={railOpen ? "Hide side rail" : "Show side rail"}
                style={{
                    position: "absolute",
                    right: 8, bottom: 32,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    borderRadius: 4,
                    fontSize: 11,
                    padding: "2px 6px",
                    cursor: "pointer",
                }}
            >
                {railOpen ? "» hide rail" : "« show rail"}
            </button>
        </div>
    );
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}
