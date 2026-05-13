"use client";

/**
 * Editor toolbar. Sans-serif labels, hairline borders, no skeuomorphism.
 *
 * Keyboard shortcuts (active globally inside the editor):
 *   Cmd/Ctrl+B  → bold
 *   Cmd/Ctrl+I  → italic
 *   Cmd/Ctrl+U  → underline
 *   Cmd/Ctrl+K  → insert link
 *
 * Every button has an aria-label. The toolbar is keyboard navigable (Tab).
 */
import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Quote, Code2, Link2, MessageSquarePlus,
    GitPullRequestArrow,
} from "lucide-react";
import styles from "./editor.module.css";

interface Props {
    editor: Editor | null;
    suggestMode: boolean;
    onToggleSuggestMode: () => void;
    onInsertComment: () => void;
    tone: number;
    onToneChange: (v: number) => void;
}

export function Toolbar({
    editor, suggestMode, onToggleSuggestMode,
    onInsertComment, tone, onToneChange,
}: Props) {
    const headingValue: string = (() => {
        if (!editor) return "p";
        for (const lv of [1, 2, 3, 4] as const) {
            if (editor.isActive("heading", { level: lv })) return `h${lv}`;
        }
        return "p";
    })();

    const setHeading = useCallback(
        (v: string) => {
            if (!editor) return;
            if (v === "p") {
                editor.chain().focus().setParagraph().run();
                return;
            }
            const lv = parseInt(v.slice(1), 10);
            editor.chain().focus().toggleHeading({ level: lv as 1 | 2 | 3 | 4 }).run();
        },
        [editor],
    );

    const insertLink = useCallback(() => {
        if (!editor) return;
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Link URL", prev || "https://");
        if (url === null) return;
        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }, [editor]);

    if (!editor) {
        return <div className={styles.toolbar} aria-label="Editor toolbar" />;
    }

    const toneLabel = tone < 33 ? "plain" : tone < 67 ? "balanced" : "formal";

    return (
        <div className={styles.toolbar} role="toolbar" aria-label="Editor toolbar">
            <select
                aria-label="Paragraph style"
                value={headingValue}
                onChange={(e) => setHeading(e.target.value)}
            >
                <option value="p">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Heading 4</option>
            </select>

            <span className={styles.sep} />

            <button
                type="button"
                aria-label="Bold"
                aria-pressed={editor.isActive("bold")}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
                title="Bold (Cmd/Ctrl+B)"
            >
                <Bold size={14} />
            </button>
            <button
                type="button"
                aria-label="Italic"
                aria-pressed={editor.isActive("italic")}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
                title="Italic (Cmd/Ctrl+I)"
            >
                <Italic size={14} />
            </button>
            <button
                type="button"
                aria-label="Underline"
                aria-pressed={editor.isActive("underline")}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
                title="Underline (Cmd/Ctrl+U)"
            >
                <UnderlineIcon size={14} />
            </button>
            <button
                type="button"
                aria-label="Strikethrough"
                aria-pressed={editor.isActive("strike")}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
                title="Strikethrough"
            >
                <Strikethrough size={14} />
            </button>

            <span className={styles.sep} />

            <button
                type="button"
                aria-label="Bullet list"
                aria-pressed={editor.isActive("bulletList")}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
                title="Bullet list"
            >
                <List size={14} />
            </button>
            <button
                type="button"
                aria-label="Ordered list"
                aria-pressed={editor.isActive("orderedList")}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
                title="Ordered list"
            >
                <ListOrdered size={14} />
            </button>
            <button
                type="button"
                aria-label="Blockquote"
                aria-pressed={editor.isActive("blockquote")}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}
                title="Blockquote"
            >
                <Quote size={14} />
            </button>
            <button
                type="button"
                aria-label="Code block"
                aria-pressed={editor.isActive("codeBlock")}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}
                title="Code block"
            >
                <Code2 size={14} />
            </button>

            <span className={styles.sep} />

            <button
                type="button"
                aria-label="Insert link"
                aria-pressed={editor.isActive("link")}
                onMouseDown={(e) => { e.preventDefault(); insertLink(); }}
                title="Insert link (Cmd/Ctrl+K)"
            >
                <Link2 size={14} />
            </button>
            <button
                type="button"
                aria-label="Add comment on selection"
                onMouseDown={(e) => { e.preventDefault(); onInsertComment(); }}
                title="Comment on selection"
            >
                <MessageSquarePlus size={14} />
                <span style={{ fontSize: 11 }}>Comment</span>
            </button>

            <span className={styles.spacer} />

            <button
                type="button"
                className={styles.suggestToggle}
                aria-label="Toggle suggest-edit mode"
                aria-pressed={suggestMode}
                onMouseDown={(e) => { e.preventDefault(); onToggleSuggestMode(); }}
                title={suggestMode ? "Suggest edit: ON (changes are tracked)" : "Suggest edit: OFF"}
            >
                <GitPullRequestArrow size={14} />
                <span style={{ fontSize: 11 }}>{suggestMode ? "Suggesting" : "Suggest edit"}</span>
            </button>

            <span className={styles.sep} />

            <label className={styles.toneSlider} aria-label="Tone slider">
                <span style={{ fontSize: 11 }}>tone</span>
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={tone}
                    onChange={(e) => onToneChange(parseInt(e.target.value, 10))}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={tone}
                    aria-valuetext={toneLabel}
                    style={{ width: 80 }}
                />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{toneLabel}</span>
            </label>
        </div>
    );
}
