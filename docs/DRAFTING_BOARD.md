# Drafting Board — design

The Drafting Board is Louis's visual workspace for agentic legal
workflows. It replaces the old click-to-add palette with an auto-layout
node graph that mirrors how a transactional or in-house lawyer actually
thinks about a matter — Input, Agent step, Human gate, Output, top to
bottom.

This doc records the layout, the data model, the runner state machine,
the persistence shape, and the open TODOs. Implementation lives under
`frontend/src/app/(pages)/drafting-board/` and
`frontend/src/app/components/drafting/`.

## Lanes

Every node belongs to exactly one lane. The auto-layout uses the lane to
bias its longest-path ranking, so nodes naturally stack in this order:

1. Input — light gray card, file icon. Documents, matter brief, intake
   forms. These start `done` so the rest of the graph is unblocked.
2. Agent step — amber card, sparkles icon. Each step references one or
   more skill slugs from `backend/src/skills/`. When the runner advances
   a step it animates through `idle → running → done`.
3. Human gate — white card with a dashed border, users icon. Gates pause
   the runner and surface a "Needs your approval" banner at the top of
   the canvas. Approving flips the gate `done` and resumes the runner;
   rejecting cascades `blocked` to every downstream node.
4. Output — emerald card, check icon. The deliverable: redline doc,
   memo, executed contract, decision packet.

A fifth `branch` kind is reserved (violet card, git-branch icon) for a
future conditional split — not wired yet.

## Templates

Four templates seed the canvas on first open, with a "Use a template"
menu in the top bar to swap mid-session. Each template's node and edge
list is declared in
`frontend/src/app/components/drafting/templates.ts`.

- M&A — Acme × Globex. Term sheet → DD checklist → DD findings → SPA
  draft → SPA redline → partner gate → closing checklist → bring-down
  certificates → deliverables.
- Employment onboarding. New hire brief → offer letter + NDA + IP
  assignment + benefits, all converging on a hiring-manager gate, then a
  Day-1 welcome packet.
- Vendor due diligence. KYC intake → sanctions screen + MSA review +
  DPA review + conflicts memo → GC approval gate → onboarding decision.
- Contract review. Intake → playbook compare → redline draft → risk
  summary → partner approval → execute.

The default when the user lands without a `?template=` URL parameter or
a stored board is the M&A template — it's the visually richest shape
and the one most likely to look like the haqq prototype the user has in
mind. Worth confirming.

## Auto-layout

Implemented in
`frontend/src/app/components/drafting/auto-layout.ts`. Algorithm:

1. Longest-path ranking, biased by lane order.
2. Barycenter sweep (top-down then bottom-up, four passes) to reduce
   edge crossings.
3. Equal-width row centering — rows with fewer nodes are centered on
   the canvas instead of pinned to the left.

I chose to ship an in-house dagre-style solver rather than add a
dependency. The rationale: the user asked not to run `npm install`, the
graphs are small (six to nine nodes), and the in-house solver keeps the
bundle lean. Swapping in `dagre` or `elkjs` later is a thirty-line
change — the only interface this module exposes is
`computeLayout(board) → { positions, width, height }`. Worth confirming
the user is fine with the in-house solver.

The file is intentionally not named `layout.ts` because Next.js would
otherwise interpret `frontend/src/app/components/drafting/layout.ts` as
a route-segment layout file (the `app/` tree is route-scanned).

## Node status flow

Defined in `frontend/src/app/components/drafting/runner.ts`. The state
machine is small and pure — every transition produces a fresh `Board`,
which the page then sets via `setBoard`.

- `idle` is the resting state. Cream card.
- `running` — flipped when the runner picks the node. Pulsing gold dot
  inside the card via the existing `.louis-pulse` keyframe. Edges
  leading out also animate via `.louis-shimmer`.
- `done` — emerald ring, check chip.
- `blocked` — red ring + alert chip. Reason copied from the upstream
  rejection.
- `needs_approval` — amber ring with a breathing border (`.louis-shimmer`)
  and a banner at the top of the canvas linking to the inspector.
- `rejected` — only gates enter this state, via the inspector's Reject
  button. Marks the gate red and cascades `blocked` to every transitively
  downstream node.

The runner is a small event loop: pick the next ready idle node, flip it
`running`, wait 1.5–3 seconds (random, to feel like real work), flip it
`done`, recurse. Gates short-circuit the loop and pause the runner. The
fake dwell is wired against `window.setTimeout` so the
`prefers-reduced-motion` media query in `globals.css` still suppresses
the CSS animations even while the runner is "working".

## Run agent

Top bar has a "Run agent" button that calls into the runner. Each step
appends to a horizontal timeline strip at the bottom of the canvas:

- A `Running ${title}` entry the moment the step starts, with the skill
  IDs it's "firing" — e.g. `Running SPA redline (firing
  pa-workflow.transactional.contract-redline-20min,
  prompt-pack.full-contract-risk-review).`
- A `${title} is done.` entry when the step completes.
- A gate banner copy when the runner pauses.
- A blocked-with-reason entry when a gate is rejected.

The user can pause mid-run; the pause cooperates with the next dwell
boundary.

## Inspector (right rail)

`frontend/src/app/components/drafting/inspector.tsx`. Opens when the
user clicks any node and closes via the X button or by clicking the same
node again.

Sections:

- Identity — title and subtitle, inline-editable.
- Skills (agent steps only) — chips for each wired skill, plus an
  autocomplete picker against a curated list of slugs from the
  `backend/src/skills/` tree. Free-text entry is also allowed for slugs
  the autocomplete doesn't know about.
- Approval gate (gate nodes only) — editable approval question, an
  approver dropdown (Partner — M&A, GC, Hiring manager, Privacy officer,
  etc.), and the Approve / Reject buttons that surface when the gate is
  `needs_approval`.
- Consumes / Produces — the inputs and outputs declared in the
  template. These power the run log copy.
- History — the chronological list of status transitions on the node.

## Persistence

`frontend/src/app/components/drafting/storage.ts` reads and writes
`localStorage.louis.drafting-board.<templateKey>` on every board
mutation. The shape mirrors the in-memory `Board` type — a JSON object
with `templateKey`, `name`, `nodes[]`, `edges[]`.

A server-side save is stubbed but not wired:

- TODO — `POST /api/drafting-boards` that accepts the same JSON
  payload, scoped per matter / per project. The backend's matters table
  is the most natural home.
- TODO — `GET /api/drafting-boards/:id` for cross-device restore.
- TODO — diff the local board against the server snapshot on focus
  and surface a "Restore from cloud?" banner if they diverge.

## Aesthetic

- Canvas: cream `var(--louis-cream)` background, with two faint radial
  gradients (gold top-left, slate bottom-right) for warmth.
- Nodes: rounded-2xl, backdrop-blur, drop-shadow soft on rest, deeper
  on hover.
- Active running nodes get a gold-leaf ring (`#C9A961`) and the
  breathing `.louis-shimmer` border.
- Edges: dashed slate for unrun, solid gold for actively traversing,
  solid emerald for completed paths, solid red for blocked.
- Typography: node titles in EB Garamond (`var(--font-eb-garamond)`),
  status labels and skill slugs in the default Inter sans, skill slugs
  monospaced.
- `prefers-reduced-motion: reduce` is already honored globally in
  `globals.css` — the `.louis-pulse` / `.louis-shimmer` keyframes are
  disabled there. We do not gate animation in JS.

## Empty state

When the user lands without a stored board and the URL has no
`?template=...`, the canvas is replaced with a centered card titled
"Start from a template" and the four template cards below. Picking one
seeds the board and animates the canvas in.

## Open questions worth confirming

- Default template — currently M&A. Switch to Contract review if
  that's the canonical demo flow?
- Dagre vs in-house solver — kept in-house to avoid `npm install`. If
  the graphs grow past ~30 nodes the in-house solver will start to look
  thin; we can swap to `dagre` then.
- Persistence shape — flat per-template-key, no matter-scoping. Once a
  user can have multiple M&A boards they'll need a board id; the
  server-side TODO above is where I'd introduce it.
- Drag-to-reposition — intentionally omitted. The original page had
  per-node drag and the user explicitly asked for auto-layout, so I
  dropped manual positioning. Easy to add back as a per-node `pinned: {x, y}`
  override if the auto-layout disagrees with the user.
- The pre-existing search-param hooks (`?docId=`, `?suggestions=`)
  from the old page are NOT wired into the new graph yet. If those URLs
  are linked from `/doc-workspace` we'll need to either redirect or seed
  a node from those params. Captured as a TODO.

## Out-of-scope notes (touched the boundary of the file scope)

Nothing was edited outside the file scope.

- `frontend/package.json` was left alone — no graph-layout dep was
  added because the in-house solver covers our needs.
- `frontend/src/app/globals.css` was left alone — we reuse the
  existing `.louis-pulse` and `.louis-shimmer` keyframes.
- The `?docId=` / `?suggestions=` integration into `/doc-workspace` is
  a TODO captured above; it would require touching the doc workspace
  page, which is outside scope.
