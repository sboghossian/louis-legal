# Lavern-inspired feature wave 1

Four self-contained modules ported (in spirit) from `AnttiHero/lavern` (Apache-2.0),
extending Louis's trust + onboarding surface. All are backend modules with unit
tests; the two with API routes are usable now, frontend surfaces are follow-ups.

## 1. Legal-Design quality suite — `backend/src/quality/`
Deterministic, zero-LLM analysis of legal text:
- `runEthicsAudit(text)` — 7 dark-pattern categories (time pressure, default
  manipulation, illusory consent, asymmetric accept/decline, coercive language →
  RED; legalese wall, information overload → YELLOW). Visual-nudging is omitted
  (needs rendered UI).
- `scoreReadability(text)` — Flesch-Kincaid grade, long sentences, passive hits,
  jargon hits. Plus `PLAIN_LANGUAGE_GUIDANCE` prompt-pack for an LLM rewrite.
- `diffRiskFlags(original, simplified)` — flags dropped defined terms, numbers,
  party names, regulatory refs. Plus `MEANING_PRESERVATION_PROTOCOL` (dual-artifact rule).

**API:** `POST /api/quality/audit { text, original? }` → `{ ethics, readability, risk }`.

## 2. Agent-builder / firm onboarding — `backend/src/onboarding/`
- `scrapeFirmSite(url)` — SSRF-hardened (https-only, blocks private/reserved IPs
  via pure `isPrivateIp`, 5MB/12s caps, max 3 pages, strips nav/script/style).
- `analyzeFirm(scraped, llm)` — turns scraped text into proposed `AgentProfile[]`,
  each carrying a `seenOnSite` citation (Zod-validated; profiles without it dropped).

**API:** `POST /api/agent-builder/analyze { url }` → `{ profiles }` (auth'd; uses
the user's BYO keys + `DEFAULT_MAIN_MODEL`).

## 3. Auto-brief intake — `backend/src/intake/`
- `shouldAutoBrief({ message, attachedDocCount })` — true for a short message
  (≤15 words / stub phrase) + ≥1 attached doc.
- `buildAutoBrief({ message, documents, llm })` — reads the docs and synthesizes
  the real task ("the cover email IS the briefing"), bounded to 8k chars/doc.

**Wiring:** module + tests shipped; `/chat` pre-dispatch wiring is a follow-up
(adds one pre-turn LLM call when triggered).

## 4. Output-quality eval harness — `backend/src/evals/`
- `scoreDeterministic(output, expectations)` — expectation coverage + placeholder/
  length guards; `runEval(cases, produce, { judge? })` aggregates mean + pass rate
  with an optional injected LLM judge. Seed cases under `evals/cases/`.

**Wiring:** library, usable programmatically; a CLI against the live assistant is
a follow-up.

## Tests
`cd backend && npx vitest run` — 229 tests (incl. quality 54, onboarding 37,
intake 25, evals 34).
