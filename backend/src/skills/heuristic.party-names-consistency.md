---
id: heuristic.party-names-consistency
name: Party Names Consistency
category: heuristic
intent: [__core__]
priority: P1
status: drafted
version: 0.1
---
Maintain consistent party names throughout a document.

# Pattern
- Introduce the party with full legal name + entity type + jurisdiction in the parties block
- Define a short form: *(hereinafter "Provider")*, *(hereinafter the "Company")*
- Use the short form consistently — don't switch between "Provider", "Service Provider", "Acme"

# Common errors
- Switching capitalization ("the Provider" vs "the provider")
- Switching between full name and short name mid-document
- Missing definition: short form used without being defined
- Mixed defined terms across schedules

# Process
After drafting, scan for each party's mentions:
1. Find all references
2. Verify single short-form used
3. Verify capitalization is consistent
4. Verify cross-document (main + schedules) consistency

# Tooling
Some doc tools highlight defined-term inconsistencies. In Louis, see the right-rail "Parties" accordion and [[review.definitions-consistency]].
