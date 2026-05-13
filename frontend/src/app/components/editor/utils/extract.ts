/**
 * Walk the editor's ProseMirror document and pull out every comment +
 * track-change annotation. Used by SuggestionsRail's Comments and
 * Suggestions panels.
 */
import type { Editor } from "@tiptap/react";
import type { CommentInDoc } from "../extensions/comment-mark";
import type { TrackChangeInDoc } from "../extensions/track-change-marks";

/**
 * Collect all `comment` marks. Adjacent text nodes carrying the same comment
 * id are coalesced into a single range.
 */
export function collectComments(editor: Editor | null): CommentInDoc[] {
    if (!editor) return [];
    const out = new Map<string, CommentInDoc>();
    editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        node.marks.forEach((m) => {
            if (m.type.name !== "comment") return;
            const id = m.attrs.id as string;
            if (!id) return;
            const from = pos;
            const to = pos + node.nodeSize;
            const existing = out.get(id);
            if (existing) {
                existing.to = Math.max(existing.to, to);
                existing.from = Math.min(existing.from, from);
            } else {
                out.set(id, {
                    id,
                    author:    (m.attrs.author    as string) || "",
                    text:      (m.attrs.text      as string) || "",
                    createdAt: (m.attrs.createdAt as string) || "",
                    resolved:  Boolean(m.attrs.resolved),
                    from,
                    to,
                });
            }
        });
    });
    return Array.from(out.values()).sort((a, b) => a.from - b.from);
}

/**
 * Collect insertion + deletion marks as pending track-changes. Each mark
 * id collapses adjacent runs into one entry; `text` is the affected text.
 */
export function collectTrackChanges(editor: Editor | null): TrackChangeInDoc[] {
    if (!editor) return [];
    const out = new Map<string, TrackChangeInDoc>();
    editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        node.marks.forEach((m) => {
            const kind = m.type.name === "insertion"
                ? "insertion"
                : m.type.name === "deletion"
                ? "deletion"
                : null;
            if (!kind) return;
            const id = m.attrs.id as string;
            if (!id) return;
            const key  = `${kind}:${id}`;
            const from = pos;
            const to   = pos + node.nodeSize;
            const text = node.text || "";
            const existing = out.get(key);
            if (existing) {
                existing.to = Math.max(existing.to, to);
                existing.from = Math.min(existing.from, from);
                existing.text = `${existing.text}${text}`;
            } else {
                out.set(key, {
                    kind,
                    id,
                    author:    (m.attrs.author    as string) || "",
                    createdAt: (m.attrs.createdAt as string) || "",
                    text,
                    from,
                    to,
                });
            }
        });
    });
    return Array.from(out.values()).sort((a, b) => a.from - b.from);
}
