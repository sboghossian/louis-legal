# Lessons

## 2026-05-22 — Processor v2 integration + going live

**Parallel worktree agents can be pruned before they commit.** Agent C's
four-tier memory work was lost when its `/tmp/louis-wt-c` worktree was pruned
with no commit on `feat/pv2-memory`. Always verify `git log <base>..<branch>`
shows a commit for *every* parallel agent before pruning worktrees — worktree
existence ≠ committed work. (Had to rebuild AC3 from scratch.)

**Discard mass-formatting noise before integrating.** A repo-wide Prettier
reformat (1178 files) sat staged on the integration branch and collided with
Agent A's `_router.ts`. It made the diff unreviewable and would have polluted the
PR. `git reset --hard` it — formatting is regenerable; never carry it into a
feature integration.

**Pin the test runner in the plan, not per-agent.** Agent A added vitest
(declared but never `npm install`ed) while Agent B wrote `node:test` because it
assumed "no network" in its worktree. Result: `npm run test` was broken and the
suites were split across two runners. Decide the runner in the AC so parallel
agents converge. (Resolved: installed vitest, converted the one `node:test`
file, excluded the legacy `_llm-classifier.test.ts`.)

**"Module + tests" is not "live".** Processor v2 shipped in PR #1 with green
tests but `memoryStore` was imported nowhere and the budget guard was never
enforced — dormant. After shipping a subsystem, `grep -rl "import.*<module>"`
to confirm it's actually wired, or add an explicit wiring AC. Shipping dormant
code feels like progress but delivers none.

**`gh pr create` on a fork defaults its base to the upstream parent.** It tried
to open against `willchen96:main` (the mike fork source). Use
`gh pr create --repo sboghossian/louis-legal` or `gh api repos/.../pulls`.

**Fail-safe trailing SSE blocks are the safe way to add to a hot streaming
path.** grounding, budget alert, and memory capture all run *after* the answer
streams, each in its own try/catch with a `devLog` skip — none can break a
successful turn. Reuse this pattern for future post-turn work.

**Top follow-up — cross-user isolation.** `memoryStore` is a process-global
in-memory `Map`. Scoped tiers (matter/session) are gated by id so blast radius is
zero today (nothing writes the unscoped institutional/precedent tiers), but
before any multi-tenant use add a `userId` field + Supabase persistence (the
`MemoryStore` interface seam already exists for this).
