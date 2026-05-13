# UI Audit — 2026-05-13

Pass on every surface inside `frontend/src/app/(pages)/` after the swarm
rebuild + semantic-token migration. Goal: catch regressions, not redesign.

The harness left the dev servers running on `localhost:3000` /
`localhost:3001`; the public URL `legal.dashable.dev` was live throughout.

## Method

1. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/<route>`
   for every priority route — all 28+ surfaces returned **200**.
2. `curl … | grep -oE '>([a-z]+\.){1,3}[a-z_]+<'` on each rendered HTML
   page to surface literal i18n keys leaking through (returning the key
   when the dictionary entry is missing). **Zero leaks found** after the
   `bde56c1` fix added the 4 missing `nav.*` keys.
3. `grep -rE` for color literals the prior `bdda8d1` sweep missed.
4. Source-file read on every page in the priority list, looking for
   broken handlers, hardcoded user data, dead links, missing empty
   states, mobile-breakpoint regressions.

## Surfaces visited

All 200, all rendered without runtime errors:

`/home` · `/assistant` · `/inbox` · `/projects` · `/projects/[id]` ·
`/all-chats` · `/settings` · `/settings/api-keys` · `/doc-workspace` ·
`/drafting-board` · `/vault` · `/plugins` · `/customize` · `/skills` ·
`/workflows` · `/integrations` · `/matters` · `/efirm` · `/routines` ·
`/clauses` · `/risk` · `/citations` · `/calculators/eos` ·
`/legal-flows` · `/tabular-reviews` · `/prompt-library` · `/feed` ·
`/team` · `/referral` · `/billing` · `/upgrade` · `/academy` ·
`/transparency` · `/about`

## Issues + fixes

### Color-token leaks the prior migration missed

The `bdda8d1` sweep only targeted `gray-*` and `bg-white`. Found and
replaced:

- **stone-*** in `plugins/page.tsx` + every `components/vault/*.tsx` file
  (61 occurrences across 7 files). The plugins page intentionally keeps
  the `bg-[#fbf8f2]` cream literal — only the on-cream text + borders
  switched to semantic tokens.
- **slate-*** in `drafting-board/page.tsx` + `components/drafting/*` +
  `components/tabular/TRSidePanel.tsx` + `components/tabular/pillUtils.ts`.
  The two primary CTAs that were `bg-slate-900 / hover:bg-slate-800`
  now read `bg-foreground / hover:bg-foreground/90`.
- **ring-gray-900** on the AppearanceTab theme/font selected-ring.
- **ring-gray-200** on the toast `info` variant.
- **border-t-gray-{600,700}** on the app layout's auth-loading spinner
  + the two AI-thinking column spinners in `AddColumnModal` +
  `WFEditColumnModal`.
- **accent-gray-900** on 4 range / checkbox inputs in `settings/page.tsx`
  and `doc-workspace/page.tsx`.

### Profile data leak

`/settings` Profile tab rendered the literal `"Stephane Boghossian"`,
`"stephane.boghossian@haqq.ai"`, `"HAQQ"`, `"HAQQ — Beirut · Partner"`
for every signed-in user — leftover from the prototype. Wired
`useAuth()` + `useUserProfile()` so it shows the actual user. Same fix
on `/efirm` (the badge `"HAQQ — Beirut"` was hardcoded; now reads
`profile.organisation` and hides if unset).

### Empty-state gaps

- **`/all-chats`** with zero chats showed a blank panel and the text
  `"start one from /assistant"` (literal path). Replaced with an icon +
  CTA button that pushes to `/assistant`.
- **`/team`** with zero members showed an empty bordered div. Added a
  dashed-border empty card with an `Invite your first teammate` CTA.

### Dead-link / no-op

- **`VoiceModeOverlay`** had an `<a href="#" onClick={preventDefault}>`
  for its hint label, which behaves like a button-but-isn't and breaks
  keyboard navigation. Replaced with `<span class="cursor-help">`.

### Sidebar regression — already fixed in `bde56c1`

The duplicated rail+panel rendering bug + 4 missing `nav.*` keys
(`favorites`, `pinned`, `assistant_history`, `share`) were already
caught and committed prior to this audit. Verified clean.

## Surfaces I touched (this audit)

- `frontend/src/app/(pages)/all-chats/page.tsx` — empty state
- `frontend/src/app/(pages)/doc-workspace/page.tsx` — `accent-foreground`
- `frontend/src/app/(pages)/drafting-board/page.tsx` — slate sweep
- `frontend/src/app/(pages)/efirm/page.tsx` — `profile.organisation` badge
- `frontend/src/app/(pages)/layout.tsx` — spinner border token
- `frontend/src/app/(pages)/plugins/page.tsx` — stone sweep
- `frontend/src/app/(pages)/settings/page.tsx` — real user data, accent
- `frontend/src/app/(pages)/settings/AppearanceTab.tsx` — ring-foreground
- `frontend/src/app/(pages)/team/page.tsx` — empty state
- `frontend/src/app/(pages)/vault/page.tsx` — stone toggle
- `frontend/src/app/components/assistant/VoiceModeOverlay.tsx` — dead-link → span
- `frontend/src/app/components/drafting/inspector.tsx` — slate sweep
- `frontend/src/app/components/drafting/nodes.tsx` — border token
- `frontend/src/app/components/tabular/AddColumnModal.tsx` — spinner token
- `frontend/src/app/components/tabular/TRSidePanel.tsx` — hover token
- `frontend/src/app/components/tabular/pillUtils.ts` — currency-pill fallback
- `frontend/src/app/components/vault/AllowAIToggle.tsx` — stone sweep
- `frontend/src/app/components/vault/EncryptionBadge.tsx` — stone sweep
- `frontend/src/app/components/vault/PassphraseSetupModal.tsx` — stone sweep
- `frontend/src/app/components/vault/PassphraseUnlockModal.tsx` — stone sweep
- `frontend/src/app/components/vault/RecoveryPhraseCard.tsx` — stone sweep
- `frontend/src/app/components/vault/VaultSettingsPanel.tsx` — stone sweep
- `frontend/src/app/components/workflows/WFEditColumnModal.tsx` — spinner token
- `frontend/src/contexts/ToastContext.tsx` — ring token

## Commits

- `2e9e689` — `fix(ui): migrate stone/slate colors to semantic tokens`
- `45d08e1` — `fix(ui): real user data in settings, graceful empty states, gray accents`
- `dba7969` — `fix(ui): drop remaining gray tokens from layout, toasts, e-Firm header`
- (next) — `fix(ui): voice overlay dead-link, audit doc`

`tsc --noEmit -p frontend/tsconfig.json` clean after every commit.

## TODO — needs more than a quick fix

Things I noticed but didn't take on because they're bigger than the
audit scope:

1. **Native `alert()` / `confirm()` everywhere.** `all-chats`,
   `account/page.tsx`, `account/models/page.tsx`,
   `editor/RichTextEditor.tsx`, `routines/page.tsx`,
   `projects/ProjectsOverview.tsx`, `team/page.tsx` all still throw the
   browser native confirm prompt for destructive actions. The codebase
   has a polished `ToastContext` and a `ConfirmDialog` pattern would
   close this gap. ~15 call sites.
2. **`/settings` Billing tab still lists $0–$199/mo plans.** Louis is
   100% free per `project_louis_decisions` — the tab should redirect
   to `/billing` (the explainer) or be removed from the tab list. Same
   for the `tier: "Free (BYO keys)"` Card label.
3. **`/inbox` + `/team` + `/efirm` + `/integrations` still hit the
   backend with `x-user-id: "demo"`** instead of the Supabase JWT.
   This is the live data layer, not UI, but the audit surfaces still
   render demo data for every user as a result.
4. **i18n coverage is sidebar + a few features only.** The dictionary
   has ~220 EN keys. Many page bodies (matters list, all-chats
   filters, integrations cards, efirm tab labels, routines kinds,
   citations form labels, EOS calculator inputs, transparency page
   prose) are still hardcoded English. Not a regression — never wired
   in the first place. Needs a deliberate pass; `docs/I18N.md` has
   the playbook.
5. **`/doc-workspace` fixture-vs-live blending.** The page falls back
   to a hardcoded `DOC_DEFAULT` ("Acme x Globex MSA") for parties /
   defs / cites / blocks. When the user uploads a real doc but the
   `/metadata` endpoint returns sparse data, they see a mix of their
   own title and Acme/Globex fixture parties. Either delete the
   fallback or only fall back when `source === "fixture"`.
6. **Academy + transparency pages have huge bodies of English prose.**
   Translating them is real translation work, not a wiring change.
   Both pages render fine in any locale today (English fallback) but
   it's a TODO for the i18n team.
7. **`/projects` table** uses a sticky-left `bg-card` cell that breaks
   at narrow widths because the `min-w-max` parent never collapses.
   On mobile the table scrolls horizontally; fine, but the sticky
   stack overlaps the page padding awkwardly. A real fix would either
   make it a card list at `< md` or pin only the name column.
8. **`/drafting-board` empty state on first visit triggers
   `setBoard(seedBoardByKey(DEFAULT_TEMPLATE))` immediately**, so
   users never see the "pick a template" `EmptyState` defined at the
   bottom of the file. It only renders when `localStorage` is empty
   AND there's no `?template=` URL param. Worth checking whether the
   intent was to default into the M&A board or always show the
   chooser.
