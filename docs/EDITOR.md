# Louis Rich-Text Editor

Native, ProseMirror-based document editor for the doc-workspace surface.
Replaces the previous `docx-preview` read-only render with a real authoring
environment that supports paragraphs, headings, lists, inline formatting,
comments, tracked changes, and export.

## Stack decision: TipTap

We picked **TipTap** (ProseMirror under the hood) over the alternatives:

| Lib       | Why we considered it                              | Why we said no                                                                |
| --------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| TipTap    | React-native, extension API, ProseMirror schema   | (chosen)                                                                      |
| Lexical   | Meta-backed, fast                                 | Smaller plugin ecosystem; track-changes prior art weaker                      |
| Slate     | Full schema control                               | Manual heavy lift for selection, history, lists; less battle-tested at scale  |

We already had `@tiptap/react`, `@tiptap/starter-kit`, and `@tiptap/pm` in
`frontend/package.json` (used by `WorkflowPromptEditor`), so adopting TipTap
for the document workspace is a small marginal-cost decision.

## Architecture

```
frontend/src/app/components/editor/
├── RichTextEditor.tsx        ← top-level component used by doc-workspace
├── Toolbar.tsx               ← formatting toolbar (sticky)
├── SuggestionsRail.tsx       ← right rail: Suggestions / Comments / Versions
├── BottomBar.tsx             ← word/char count, saved-at, export menu
├── editor.module.css         ← paper-style canvas + toolbar styling
├── index.ts                  ← public exports
├── extensions/
│   ├── comment-mark.ts       ← custom Mark: comment threads anchored to ranges
│   ├── track-change-marks.ts ← custom Marks: insertion (green) + deletion (red)
│   ├── suggest-edit.ts       ← PM plugin: auto-stamp inserts while suggest-mode is on
│   └── index.ts              ← `buildExtensions(...)` factory
└── utils/
    ├── blocks.ts             ← ServerBlock[] ↔ HTML
    ├── extract.ts            ← collect comments + track-changes from editor state
    └── export.ts             ← .md / .html / .docx download
```

### Data flow

1. `doc-workspace/page.tsx` fetches `/api/doc-workspace/:docId/content` and
   gets `ServerBlock[]` (`{ id, heading?, text?, changed? }`).
2. `RichTextEditor` converts blocks to HTML once at mount via
   `blocksToHTML(initialBlocks)`. A localStorage draft (key
   `louis.docDraft.<docId>`) takes precedence if present.
3. As the user types, TipTap mutates an in-memory ProseMirror state. After
   every keystroke we debounce 1.5s, then:
   - write the current HTML to `localStorage[louis.docDraft.<docId>]`
   - call `onPersist(htmlToBlocks(html), html)` so the page can stash
     authoritative blocks
   - update the bottom-bar saved-at timestamp
4. A separate 5s heartbeat snapshots the current HTML into
   `louis.docVersions.<docId>` (capped at 20 entries). The Versions panel
   reads and restores from this key.

### Custom marks

#### `comment` (CommentMark)

- Attrs: `id`, `author`, `text`, `createdAt`, `resolved` (boolean).
- Rendered as `<span data-comment-id="…" class="louis-comment">`.
- Commands: `setComment(attrs)`, `unsetComment(id)`,
  `toggleCommentResolved(id)`.

#### `insertion` (InsertionMark) / `deletion` (DeletionMark)

- Shared attrs: `id`, `author`, `createdAt`.
- Insertion = green underline (`<span data-track-insertion class="louis-track-insertion">`).
- Deletion  = red strikethrough (`<span data-track-deletion class="louis-track-deletion">`).
- Commands per mark: `setX(attrs)`, `unsetX(id)`, plus `acceptDeletion(id)`
  which deletes the marked text.
- Accepting an insertion = `unsetInsertion(id)`; rejecting an insertion =
  `deleteRange(from, to)`.
- Accepting a deletion = `acceptDeletion(id)` (removes the text); rejecting a
  deletion = `unsetDeletion(id)` (keeps the text).

#### `SuggestEdit` plugin

ProseMirror plugin that listens via `appendTransaction`. When suggest-mode is
on and a transaction inserted text, the inserted range is auto-stamped with
the `insertion` mark.

## Toolbar

- **Style dropdown**: Paragraph, H1–H4.
- **Inline marks**: Bold, Italic, Underline, Strikethrough.
- **Blocks**: Bullet list, Ordered list, Blockquote, Code block.
- **Insert**: Link, Comment-on-selection.
- **Suggest edit toggle**: red pill when ON.
- **Tone slider** (plain / balanced / formal): `console.log` on change. Real
  AI-rewrite wiring is TODO (see below).

Keyboard shortcuts:
- `Cmd/Ctrl+B` Bold
- `Cmd/Ctrl+I` Italic
- `Cmd/Ctrl+U` Underline
- `Cmd/Ctrl+K` Link

All buttons carry `aria-label` and `aria-pressed` where appropriate. The
toolbar is `role="toolbar"` and Tab-navigable.

## Right rail (`SuggestionsRail`)

Tabbed:

- **Suggestions** — every pending track-change. Accept / Reject per item.
- **Comments**    — every comment thread. Click to scroll, Resolve, Delete.
- **Versions**    — snapshots in `localStorage.louis.docVersions.<docId>`,
  with Snapshot-now, Restore, Delete.

## Bottom bar

- Word count, character count.
- Last-saved-at timestamp (autosave to localStorage every 1.5s after last
  keystroke).
- **Export** menu: `.docx`, `.md`, `.html`.

## Aesthetic

- Cream paper background `#fbf8f2`.
- Body font: **EB Garamond** (already wired via `--font-eb-garamond`).
- Toolbar font: system sans-serif (UI legibility > vibes).
- Thin gold rule (`#c8a64a40`) above H2.
- Max content width 720px.

## Performance

- TipTap extensions assembled in `buildExtensions({…})` and the
  `RichTextEditor` is `React.lazy`-imported by `doc-workspace/page.tsx`, so
  the route shell is untouched on first paint when the user is on a
  non-edit view.
- Autosave is debounced 1.5s.
- Versions heartbeat is gated on HTML changing, so an idle editor doesn't
  thrash localStorage.

## Accessibility

- Editor container has `role="textbox"`, `aria-multiline="true"`, and an
  `aria-label` tying it to the document title.
- Toolbar is `role="toolbar"`, each button has `aria-label` +
  `aria-pressed` where applicable.
- Rail tabs are `role="tab"` with `aria-selected`.
- Tone slider is a native `<input type="range">` with `aria-value*` attrs
  and an `aria-valuetext` mapping the numeric value to a label.

## Scope / non-scope

### In scope (v1, this PR)

- TipTap-based rich editor for paragraphs / headings (H1–H4) / lists /
  blockquote / code block / link / underline / strike / bold / italic.
- Custom marks for comments + tracked insertions + tracked deletions.
- Toolbar, right rail (Suggestions / Comments / Versions), bottom bar.
- localStorage drafts + versions.
- `.md` and `.html` export.
- Lazy-loaded editor module in `doc-workspace/page.tsx`.

### Out of scope (v1) — TODOs

- `.docx` export currently emits an HTML payload with a `.docx` filename and
  a console warning. The `docx` npm package is already a dep; a real builder
  walking the ProseMirror doc and emitting `Paragraph`/`TextRun` is the next
  step. **TODO(editor.docx)** in `utils/export.ts`.
- Backend persistence: there's no `PUT /api/doc-workspace/:docId/content`
  endpoint yet. The editor autosaves to `localStorage.louis.docDraft.<docId>`
  and exposes the current blocks via `onPersist`, but a refresh on a
  different device gives you the server's last-known content. **TODO(editor.persistence)**
  — backend route in `backend/src/routes/docWorkspace.ts` is out of file
  scope for this PR.
- Suggest-mode deletions: typing → tracked. Backspacing → still hard
  deletes. Real "intercept Backspace, convert to deletion mark" needs
  keymap-level work that respects IME / composition events.
  **TODO(editor.delete-as-suggestion)** in `extensions/suggest-edit.ts`.
- Multi-author conflict resolution + collaborative cursors.
- Tone-slider hook: currently emits a `console.log`. Real action is to
  call the AI rewrite endpoint on a selection. **TODO(editor.tone-rewrite)**
  in `RichTextEditor.tsx`.
- Tracked-changes survival across version restores — restoring a version
  via the rail re-loads the snapshot's HTML; pending track-change marks
  saved into that snapshot are preserved, but downstream merge semantics
  with the live doc are out of scope.
- "Comment" UI is `window.prompt` for v1. Inline popover with author
  avatar + threaded replies is TODO.

## Local dev — new commands

The editor adds two new TipTap dependencies. Run:

```bash
cd frontend
npm install
```

(`npm install` is intentionally NOT executed in this commit — the dev
runs it locally.)

## Decisions worth confirming

1. **TipTap vs Lexical vs Slate** — picked TipTap because Louis already
   imports it for `WorkflowPromptEditor`. Adopting a second editor lib for
   doc-workspace would have meant carrying two ProseMirror-shaped stacks.
2. **Default heading levels** — H1 through H4 only. Legal documents rarely
   go deeper, and clauping the dropdown at 4 keeps the style picker tight.
3. **Track-changes schema** — two marks (`insertion`, `deletion`) instead of
   a single mark with a `kind` attr. Reasoning: distinct marks make
   `editor.isActive('insertion')` and per-type accept/reject commands
   simpler, and ProseMirror's mark-merging logic handles each independently
   (e.g. an insertion that wraps a deletion stays semantically distinct).
4. **localStorage as the version store** — explicitly requested in the
   prompt. Cap at 20 entries to avoid quota issues on long documents.
5. **HTML as the canonical storage format** — the editor stores HTML in
   localStorage and converts to/from `ServerBlock[]` only at the boundary.
   This loses some inline formatting on the round-trip back to blocks
   (since blocks have no inline structure), but the editor itself never
   re-loads from blocks during an editing session.
