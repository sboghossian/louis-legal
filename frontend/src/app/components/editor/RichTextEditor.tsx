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
import styles from "./editor.module.css";

export interface RichTextEditorProps {
    /** Document id; used for localStorage keying. */
    docId: string;
    /** Document title (for export filenames + ARIA). */
    title: string;
    /** Initial server blocks (loaded from /content endpoint). */
    initialBlocks: ServerBlock[];
    /** Author name to stamp on comments + tracked changes. */
    authorName?: string;
    /** Right rail open by default. */
    railOpen?: boolean;
    /** Optional callback when the user-edited document is committed back to
     *  blocks (every 1.5s during typing, after debounce). */
    onPersist?: (blocks: ServerBlock[], html: string) => void;
}

const DRAFT_KEY      = (docId: string) => `louis.docDraft.${docId}`;
const VERSIONS_KEY   = (docId: string) => `louis.docVersions.${docId}`;
const AUTOSAVE_MS    = 1500;
const VERSIONS_MS    = 5000;
const VERSIONS_LIMIT = 20;

export function RichTextEditor({
    docId,
    title,
    initialBlocks,
    authorName = "You",
    railOpen: railOpenProp = true,
    onPersist,
}: RichTextEditorProps) {
    const [suggestMode, setSuggestMode] = useState(false);
    const [tone, setTone]               = useState(50);
    const [railOpen, setRailOpen]       = useState(railOpenProp);
    const [savedAt, setSavedAt]         = useState<Date | null>(null);
    const [revision, setRevision]       = useState(0);

    // Hold the latest suggestMode / authorName in refs so the SuggestEdit
    // plugin doesn't need to rebuild when they change.
    const suggestModeRef = useRef(suggestMode);
    const authorRef      = useRef(authorName);
    useEffect(() => { suggestModeRef.current = suggestMode; }, [suggestMode]);
    useEffect(() => { authorRef.current      = authorName;   }, [authorName]);

    // Initial content: prefer localStorage draft over server blocks if present
    // (so an unsaved draft survives a refresh).
    const initialHTML = useMemo(() => {
        if (typeof window !== "undefined") {
            try {
                const draft = localStorage.getItem(DRAFT_KEY(docId));
                if (draft) return draft;
            } catch { /* noop */ }
        }
        return blocksToHTML(initialBlocks);
    }, [docId, initialBlocks]);

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

    // Autosave (debounced 1.5s) → localStorage + onPersist callback.
    useEffect(() => {
        if (!editor) return;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const handler = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                try {
                    const html = editor.getHTML();
                    localStorage.setItem(DRAFT_KEY(docId), html);
                    setSavedAt(new Date());
                    if (onPersist) {
                        onPersist(htmlToBlocks(html), html);
                    }
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn("[editor] autosave failed", e);
                }
            }, AUTOSAVE_MS);
        };

        editor.on("update", handler);
        return () => {
            editor.off("update", handler);
            if (timer) clearTimeout(timer);
        };
    }, [editor, docId, onPersist]);

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
            alert("Select some text first, then click Comment.");
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
