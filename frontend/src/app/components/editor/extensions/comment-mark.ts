/**
 * CommentMark
 * -----------
 * A custom TipTap mark that anchors a comment thread to a text range.
 *
 * Attrs:
 *  - id:        stable UUID of the comment
 *  - author:    display name
 *  - text:      comment body
 *  - createdAt: ISO timestamp
 *  - resolved:  boolean, default false
 *
 * Renders as a <span data-comment-id="..."> with a yellow underline. The
 * SuggestionsRail Comments panel reads these from the editor state.
 */
import { Mark, mergeAttributes } from "@tiptap/core";

export interface CommentAttrs {
    id: string;
    author: string;
    text: string;
    createdAt: string;
    resolved: boolean;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        comment: {
            setComment: (attrs: CommentAttrs) => ReturnType;
            unsetComment: (id: string) => ReturnType;
            toggleCommentResolved: (id: string) => ReturnType;
        };
    }
}

export const CommentMark = Mark.create<{ HTMLAttributes: Record<string, unknown> }>({
    name: "comment",

    addOptions() {
        return { HTMLAttributes: {} };
    },

    // Allow nesting alongside bold/italic/etc.
    inclusive: false,
    excludes: "",
    keepOnSplit: true,

    addAttributes() {
        return {
            id:        { default: "" },
            author:    { default: "" },
            text:      { default: "" },
            createdAt: { default: "" },
            resolved:  { default: false },
        };
    },

    parseHTML() {
        return [{ tag: "span[data-comment-id]" }];
    },

    renderHTML({ HTMLAttributes }) {
        const resolved = HTMLAttributes.resolved === true || HTMLAttributes.resolved === "true";
        return [
            "span",
            mergeAttributes(this.options.HTMLAttributes, {
                "data-comment-id":  HTMLAttributes.id,
                "data-author":      HTMLAttributes.author,
                "data-created-at":  HTMLAttributes.createdAt,
                "data-resolved":    String(resolved),
                "title":            HTMLAttributes.text,
                "class":            resolved
                    ? "louis-comment louis-comment--resolved"
                    : "louis-comment",
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setComment:
                (attrs) =>
                ({ commands }) =>
                    commands.setMark(this.name, attrs),

            unsetComment:
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

            toggleCommentResolved:
                (id) =>
                ({ tr, state, dispatch }) => {
                    const mark = state.schema.marks[this.name];
                    if (!mark) return false;
                    state.doc.descendants((node, pos) => {
                        if (!node.isText) return;
                        node.marks.forEach((m) => {
                            if (m.type === mark && m.attrs.id === id) {
                                tr.removeMark(pos, pos + node.nodeSize, mark);
                                tr.addMark(
                                    pos,
                                    pos + node.nodeSize,
                                    mark.create({ ...m.attrs, resolved: !m.attrs.resolved }),
                                );
                            }
                        });
                    });
                    if (dispatch) dispatch(tr);
                    return true;
                },
        };
    },
});

export type CommentInDoc = CommentAttrs & {
    /** ProseMirror document position of the first character of the comment range. */
    from: number;
    /** ProseMirror document position of the character past the comment range. */
    to: number;
};
