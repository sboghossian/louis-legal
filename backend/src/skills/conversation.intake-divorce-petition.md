---
id: conversation.intake-divorce-petition
name: 'intake divorce petition'
category: conversation
intent: [intake, family]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Intake conversation — divorce petition.

Sensitive subject — handle with care. Establishes:
1. Jurisdiction (where parties live, marriage location, nationality)
2. Marriage details (date, place, type — civil/religious sect)
3. Children (ages, custody preference)
4. Assets (real estate, financial, business interests)
5. Debts (joint, individual)
6. Spousal support / alimony expectations
7. Grounds (fault / no-fault depending on jurisdiction)
8. History of abuse / safety concerns (mandatory reporter consideration in some jurisdictions)
9. Current living arrangements
10. Documentation available

Output: intake summary + recommended jurisdiction analysis + next-steps + safety resources if applicable.

MENA-specific: identify confessional court applicable; civil-marriage abroad → file there or have decree recognized.

Refuses: any prejudgment of fault, asset-hiding strategies.
