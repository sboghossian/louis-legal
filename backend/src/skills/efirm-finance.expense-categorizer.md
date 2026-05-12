---
id: efirm-finance.expense-categorizer
name: 'expense categorizer'
category: efirm-finance
intent: [expense, finance]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Expense categorizer.

Auto-classifies firm expenses into:
- Reimbursable client costs (court fees, expert fees, travel)
- Non-reimbursable overhead (office, software, salaries)
- Capital expenditure (furniture, IT)
- Tax-deductible vs non-deductible

For reimbursable costs:
- Match to matter
- Flag if no matter assigned
- Include in next bill or expense report

For overhead:
- Assign to GL category
- Flag unusual variance vs budget

Output: categorized expense list + journal-entry suggestions.
