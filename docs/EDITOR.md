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

1. `doc-workspace/page.tsx` fetches `GET /api/doc-workspace/:docId/content`.
   The response now carries **both** legacy and rich shapes:

   ```jsonc
   {
     "blocks":              [/* legacy ServerBlock[] for review/read/compare */],
     "htmlContent":         "<h2>…</h2><p>…</p>" /* or null */,
     "htmlContentVersion":  3,
     "htmlContentSavedAt":  "2026-05-13T09:14:22.103Z",
     "source":              "live-html" | "live" | "fixture" | …,
     "filename":            "acme-globex-msa-v3.docx"
   }
   ```

   Precedence: when `htmlContent` is non-null, the editor loads from it —
   this is what preserves inline bold/italic/links AND the custom
   `comment` / `insertion` / `deletion` marks across reloads. Otherwise
   the editor falls back to `blocksToHTML(initialBlocks)` for the
   first-ever render of a freshly-uploaded doc.

2. `RichTextEditor` mounts with `initialHtml` + `initialHtmlVersion`. A
   crash-recovery localStorage draft (key `louis.docDraft.<docId>`) takes
   precedence over both — this only matters when the user typed during a
   network outage and we couldn't push to the server.

3. As the user types, TipTap mutates an in-memory ProseMirror state. After
   every keystroke we debounce 1.5s, then:

   - call `onRemoteSave(html, version)` →
     `PUT /api/doc-workspace/:docId/content` (see Persistence below)
   - on success: bump the local version counter, clear any offline draft,
     update the bottom-bar saved-at timestamp
   - on 409 conflict: surface a banner ("Another tab edited this doc")
     with a Reload button
   - on network failure: write to `localStorage[louis.docDraft.<docId>]`
     and show an "Offline — changes saved locally" badge
   - regardless of remote result, call `onPersist(htmlToBlocks(html), html)`
     so the page can stash authoritative blocks for the
     review/read/compare views

4. A separate 5s heartbeat snapshots the current HTML into
   `louis.docVersions.<docId>` (capped at 20 entries). The Versions panel
   reads and restores from this key. (Localstorage-only by design — these
   are casual undo points, not a replacement for the authoritative
   server-side history in `document_versions`.)

### Persistence (PUT /api/doc-workspace/:docId/content)

```http
PUT /api/doc-workspace/{docId}/content
Authorization: Bearer {supabase_access_token}
Content-Type: application/json

{ "html": "<h2>…</h2><p>…</p>", "version": 3 }
```

Responses:

| Status | Body                                                                  | Meaning                                          |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------ |
| 200    | `{ ok: true, version: 4, savedAt: "2026-05-13T09:14:22Z" }`           | Saved. New version counter is `version`.         |
| 400    | `{ error: "html_required" }` / `{ error: "version_required" }`        | Malformed body.                                  |
| 403    | `{ error: "forbidden" }`                                              | Not the doc owner.                               |
| 404    | `{ error: "doc_not_found" }`                                          | No such doc.                                     |
| 409    | `{ error: "version_conflict", currentVersion: 5, message: "…" }`      | Another writer is ahead. Reload + retry.         |
| 413    | `{ error: "html_too_large", maxBytes: 5242880 }`                      | Payload over 5 MiB.                              |

The HTML lands in `public.documents.html_content`. The legacy `blocks`
column (well, the legacy extraction path that reads from the storage
object) is **not** dropped — it's still the read path for any doc whose
`html_content` is null, i.e. anything uploaded before this feature
shipped, and for historical version reads (`?versionId=…`).

### Schema versioning

The migration adds two columns:

- `html_content TEXT` — the authoritative HTML.
- `html_content_version INT DEFAULT 1` — optimistic-concurrency counter.
  Bumped by 1 on every accepted PUT. The frontend echoes the version it
  saw on its most recent GET; if the server's value is ahead, we 409.

The version counter does **double duty**:

1. **Race detection** between concurrent editors (two browser tabs, a
   webhook-driven AI edit, etc.).
2. **Schema migration headroom**. If we ever change how comments or
   track-changes are encoded (e.g. move from inline marks to a sidecar
   `doc_annotations` table, or store ProseMirror JSON instead of HTML),
   the counter is the natural place to stash a per-row schema marker —
   on read, the route can re-shape the payload to match the latest
   client. Until then, `html_content_version = N` simply means "the
   N-th save".

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

### Out of scope (this iteration) — TODOs

- **TODO(editor.page-wiring)** — `frontend/src/app/(pages)/doc-workspace/page.tsx`
  still mounts `<RichTextEditor>` with only the legacy props (no
  `initialHtml`, `initialHtmlVersion`, or `onRemoteSave`). Until that page
  is updated, the editor falls back to its standalone localStorage-only
  autosave path (the same behaviour as before this commit), but the new
  server endpoint is fully wired and ready. The wire-up is:

  ```tsx
  <RichTextEditor
      docId={docId}
      title={title}
      initialBlocks={blocksForRender}
      initialHtml={contentHtml /* from GET /content */}
      initialHtmlVersion={contentHtmlVersion ?? 1}
      onRemoteSave={async (html, version) => {
          const headers = await authHeaders();
          const r = await fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/content`, {
              method: "PUT",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ html, version }),
          });
          if (r.status === 409) {
              const j = await r.json();
              return { ok: false, conflict: true, currentVersion: j.currentVersion };
          }
          if (!r.ok) return { ok: false, network: true };
          const j = await r.json();
          return { ok: true, version: j.version, savedAt: j.savedAt };
      }}
      onPersist={(blocks /*, html */) => setContentBlocks(blocks)}
  />
  ```

  That page is outside the file scope of this commit; ship it in the
  follow-up. While doing so, also re-export `RemoteSaveResult` from
  `frontend/src/app/components/editor/index.ts` so the page can import a
  typed return shape:

  ```ts
  // frontend/src/app/components/editor/index.ts
  export type { RichTextEditorProps, RemoteSaveResult } from "./RichTextEditor";
  ```

  (Skipped here only because `index.ts` is outside the file scope of this
  commit; the type is already exported from `RichTextEditor.tsx`, so a
  deep import is the workaround in the interim.)

### Out of scope (v1) — TODOs

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
5. **HTML as the canonical storage format** — the editor stores HTML
   server-side (in `public.documents.html_content`, see Persistence above)
   and converts to/from `ServerBlock[]` only for the legacy read paths
   (review/read/compare views, exports, AI chat context). Inline
   formatting and the custom comment / insertion / deletion marks all
   survive the round-trip; the lossy direction is HTML → blocks, which
   is fine because the editor never re-loads from blocks during an
   editing session.
6. **`blocks jsonb` / extraction read path kept indefinitely** — we did
   *not* drop the existing storage-object extraction; docs uploaded
   before this feature shipped (and historical `?versionId=…` reads of
   any doc) still need it. Deprecation can happen later once every
   live doc has had at least one rich-editor save.
7. **Single `html_content_version` counter (not per-field)** — comments
   and track-changes ride inside the HTML as ProseMirror marks, so a
   single counter suffices for race-detection across all of them. If we
   later split comments into a `doc_annotations` sidecar table, that
   table will get its own counter; the document-body counter stays put.
