/**
 * SuggestEdit extension
 * ---------------------
 * When `getEnabled()` returns true, every user-driven insertion is
 * auto-stamped with the `insertion` mark so it renders green-underlined and
 * surfaces in the SuggestionsRail.
 *
 * v1 SCOPE — what's implemented:
 *   - Typing while suggest-mode is on → text is marked `insertion`.
 *   - Pasting blocks → entire pasted range is marked `insertion`.
 *   - Accepting an insertion (rail) → removes the mark, keeps the text.
 *   - Rejecting an insertion (rail) → deletes the range.
 *
 * v1 NON-SCOPE — TODO (documented in docs/EDITOR.md):
 *   - Deletions while suggest-mode is on are still hard deletes. Real "mark as
 *     deletion instead of delete" requires intercepting backspace at the
 *     keymap layer (or rewriting ReplaceSteps), which is risky to do
 *     correctly across compositions and IME. Deferred until v2.
 *   - Multi-author conflict resolution.
 *   - Persistent track-changes across version restores.
 */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReplaceStep } from "@tiptap/pm/transform";

export interface SuggestEditOptions {
    getEnabled: () => boolean;
    getAuthor: () => string;
    newId: () => string;
}

export const SuggestEditKey = new PluginKey("suggest-edit");

export const SuggestEdit = Extension.create<SuggestEditOptions>({
    name: "suggestEdit",

    addOptions() {
        return {
            getEnabled: () => false,
            getAuthor:  () => "You",
            newId:      () => Math.random().toString(36).slice(2, 10),
        };
    },

    addProseMirrorPlugins() {
        const opts = this.options;

        return [
            new Plugin({
                key: SuggestEditKey,

                /**
                 * After any insertion in suggest-mode, mark the inserted range.
                 * We map each ReplaceStep's insertion through subsequent steps
                 * so the marked range lands in the final document.
                 */
                appendTransaction(transactions, _oldState, newState) {
                    if (!opts.getEnabled()) return null;
                    const insertionMark = newState.schema.marks.insertion;
                    if (!insertionMark) return null;

                    const ranges: { from: number; to: number }[] = [];
                    for (const tr of transactions) {
                        if (tr.getMeta("suggestEditApplied")) continue;
                        if (!tr.docChanged) continue;
                        for (let i = 0; i < tr.steps.length; i++) {
                            const step = tr.steps[i];
                            if (!(step instanceof ReplaceStep)) continue;
                            const inserted = step.slice.size;
                            if (inserted <= 0) continue;
                            const startInThisStep = (step as ReplaceStep & { from: number }).from;
                            const endInThisStep   = startInThisStep + inserted;
                            // Map through later steps to land in the final doc.
                            let from = startInThisStep;
                            let to   = endInThisStep;
                            for (let j = i + 1; j < tr.steps.length; j++) {
                                const m = tr.mapping.maps[j];
                                from = m.map(from, 1);
                                to   = m.map(to, -1);
                            }
                            if (to > from) ranges.push({ from, to });
                        }
                    }

                    if (!ranges.length) return null;

                    const attrs = {
                        id:        opts.newId(),
                        author:    opts.getAuthor(),
                        createdAt: new Date().toISOString(),
                    };

                    const tr = newState.tr;
                    ranges.forEach(({ from, to }) => {
                        tr.addMark(from, to, insertionMark.create(attrs));
                    });
                    tr.setMeta("suggestEditApplied", true);
                    tr.setMeta("addToHistory", false);
                    return tr.steps.length ? tr : null;
                },
            }),
        ];
    },
});
