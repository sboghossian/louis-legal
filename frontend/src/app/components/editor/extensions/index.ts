/**
 * Editor extensions bundle.
 *
 * Lazily loaded by RichTextEditor so the initial bundle stays small.
 */
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { CommentMark } from "./comment-mark";
import { InsertionMark, DeletionMark, type TrackChangeInDoc } from "./track-change-marks";
import { SuggestEdit, type SuggestEditOptions } from "./suggest-edit";

export interface BuildExtensionsArgs {
    placeholder?: string;
    suggestEdit: SuggestEditOptions;
}

export function buildExtensions(args: BuildExtensionsArgs) {
    return [
        StarterKit.configure({
            // Use our own heading config below if needed; SK ships with H1–H6.
            heading: { levels: [1, 2, 3, 4] },
            // We bring our own Link to control behaviour.
            link: false,
        }),
        Underline,
        Link.configure({
            openOnClick: false,
            autolink: true,
            linkOnPaste: true,
            HTMLAttributes: {
                class: "louis-link",
                rel:   "noopener noreferrer",
                target: "_blank",
            },
        }),
        CommentMark,
        InsertionMark,
        DeletionMark,
        SuggestEdit.configure(args.suggestEdit),
    ];
}

export { CommentMark } from "./comment-mark";
export type { CommentAttrs, CommentInDoc } from "./comment-mark";
export { InsertionMark, DeletionMark } from "./track-change-marks";
export type { TrackChangeAttrs, TrackChangeInDoc } from "./track-change-marks";
export { SuggestEdit, SuggestEditKey } from "./suggest-edit";
