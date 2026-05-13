/**
 * Track-changes marks
 * -------------------
 * Two custom TipTap marks for redlining:
 *   - InsertionMark  → text inserted while "Suggest edit" mode is ON. Rendered
 *                       as green underline.
 *   - DeletionMark   → text marked as deleted (struck through, red) but not
 *                       yet removed from the document. Accepting a deletion
 *                       removes the text; rejecting it removes the mark.
 *
 * Attrs (shared shape):
 *   id        — stable change id (UUID)
 *   author    — display name
 *   createdAt — ISO timestamp
 *
 * NOTE: this is the v1 schema. Full diff-merge across versions / collaborative
 * track-changes is intentionally out of scope and tracked in docs/EDITOR.md.
 */
import { Mark, mergeAttributes } from "@tiptap/core";

export interface TrackChangeAttrs {
    id: string;
    author: string;
    createdAt: string;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        insertion: {
            setInsertion: (attrs: TrackChangeAttrs) => ReturnType;
            unsetInsertion: (id: string) => ReturnType;
        };
        deletion: {
            setDeletion: (attrs: TrackChangeAttrs) => ReturnType;
            unsetDeletion: (id: string) => ReturnType;
            acceptDeletion: (id: string) => ReturnType;
        };
    }
}

const baseAttrs = () => ({
    id:        { default: "" },
    author:    { default: "" },
    createdAt: { default: "" },
});

export const InsertionMark = Mark.create({
    name: "insertion",
    inclusive: true,
    keepOnSplit: true,

    addAttributes: baseAttrs,

    parseHTML() {
        return [{ tag: "span[data-track-insertion]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(HTMLAttributes, {
                "data-track-insertion": "true",
                "data-change-id":       HTMLAttributes.id,
                "class":                "louis-track-insertion",
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setInsertion:
                (attrs) =>
                ({ commands }) =>
                    commands.setMark(this.name, attrs),

            unsetInsertion:
                (id) =>
                ({ tr, state, dispatch }) => {
                    const mark = state.schema.marks[this.name];
                    if (!mark) return false;
                    state.doc.descendants((node, pos) => {
                        if (!node.isText) return;
                        node.marks.forEach((m) => {
                            if (m.type === mark && m.attrs.id === id) {
                                tr.removeMark(pos, pos + node.nodeSize, mark);
                            }
                        });
                    });
                    if (dispatch) dispatch(tr);
                    return true;
                },
        };
    },
});

export const DeletionMark = Mark.create({
    name: "deletion",
    inclusive: true,
    keepOnSplit: true,

    addAttributes: baseAttrs,

    parseHTML() {
        return [{ tag: "span[data-track-deletion]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(HTMLAttributes, {
                "data-track-deletion": "true",
                "data-change-id":      HTMLAttributes.id,
                "class":               "louis-track-deletion",
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setDeletion:
                (attrs) =>
                ({ commands }) =>
                    commands.setMark(this.name, attrs),

            unsetDeletion:
                (id) =>
                ({ tr, state, dispatch }) => {
                    const mark = state.schema.marks[this.name];
                    if (!mark) return false;
                    state.doc.descendants((node, pos) => {
                        if (!node.isText) return;
                        node.marks.forEach((m) => {
                            if (m.type === mark && m.attrs.id === id) {
                                tr.removeMark(pos, pos + node.nodeSize, mark);
                            }
                        });
                    });
                    if (dispatch) dispatch(tr);
                    return true;
                },

            acceptDeletion:
                (id) =>
                ({ tr, state, dispatch }) => {
                    const mark = state.schema.marks[this.name];
                    if (!mark) return false;
                    // Walk in reverse so deletions don't shift later positions.
                    const ranges: { from: number; to: number }[] = [];
                    state.doc.descendants((node, pos) => {
                        if (!node.isText) return;
                        node.marks.forEach((m) => {
                            if (m.type === mark && m.attrs.id === id) {
                                ranges.push({ from: pos, to: pos + node.nodeSize });
                            }
                        });
                    });
                    ranges.reverse().forEach(({ from, to }) => tr.delete(from, to));
                    if (dispatch) dispatch(tr);
                    return true;
                },
        };
    },
});

export type TrackChangeInDoc = TrackChangeAttrs & {
    kind: "insertion" | "deletion";
    text: string;
    from: number;
    to: number;
};
