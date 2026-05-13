# Practice-area playbooks

Each `CLAUDE.md` file in this directory is a **playbook profile** — a
high-level system instruction that frames the assistant for a specific
practice area. The skill router loads the matching playbook when the
user's active matter / chat is tagged with that practice area.

This mirrors the shape of `claude-for-legal` (Anthropic's open-source
legal skill collection). When we merge `claude-for-legal` skills in,
each one is routed under one of the practice areas defined here, so the
router never has to consider all ~1000 skills for every turn — it loads
the practice-area playbook first, then a tight set of ~8–13 skills
filtered by category × jurisdiction × intent.

## The 10 practice areas

| Slug | Practice area | Covers |
| --- | --- | --- |
| `corporate-ma` | Corporate / M&A | SPAs, term sheets, DD, indemnities, MAC carve-outs, completion mechanics |
| `corporate-commercial` | Corporate / commercial | MSAs, vendor agreements, distribution, agency, JV, supply contracts |
| `corporate-governance` | Corporate governance | Articles, shareholder agreements, board resolutions, ESG, compliance programs |
| `employment` | Employment | Contracts, NDAs, non-competes, terminations, statutory benefits, EOS |
| `disputes-litigation` | Disputes / litigation | Pleadings, motions, discovery, trial prep, settlement strategy |
| `arbitration` | Arbitration | ICC / LCIA / DIFC-LCIA / SCCA / cross-border seats, request for arbitration, awards |
| `ip-licensing` | IP / licensing | Trademarks, patents, copyright, licensing, technology transfer |
| `privacy-data-protection` | Privacy / data protection | GDPR, UAE PDPL, KSA PDPL, DPAs, breach response, ROPA |
| `fintech-payments` | FinTech / payments | E-money, PSP licensing, BNPL, virtual assets, sandbox |
| `legal-ops-billing` | Legal ops / billing | Conflicts, time recording, billing reconciliation, KPI reporting |

## Playbook file conventions

Each `<slug>.CLAUDE.md` file must include:

1. **Frontmatter** with `name`, `description`, `jurisdictions`,
   `tier` (bronze / silver / gold).
2. **Role framing** — a short paragraph naming the persona the model
   adopts ("You are a senior M&A counsel reviewing…").
3. **Standard operating sequence** — the ordered set of moves the model
   takes when given a typical task in this area.
4. **Mandatory checks** — risks that must always be surfaced
   (e.g. fundamental reps carve-outs in M&A).
5. **Output discipline** — formatting + tone rules. Default: plain
   prose, no markdown headers, citations as inline footnotes.

## Merging `claude-for-legal` skills

Source: `https://github.com/anthropics/claude-for-legal` (or whichever
fork we standardize on). Process:

1. Walk the upstream `skills/` directory.
2. For each skill, parse frontmatter and detect its practice area from
   tags/intent/jurisdiction fields.
3. Map upstream slug → Louis slug (drop the upstream prefix, prepend
   the practice-area slug, add a `cfl.` prefix to mark provenance).
4. Drop into the appropriate practice-area subdirectory.
5. Re-run `backend/src/skills/_build-registry.ts` to refresh the index.

See `SKILL_MERGE_PLAN.md` (one level up) for the tracking doc.
