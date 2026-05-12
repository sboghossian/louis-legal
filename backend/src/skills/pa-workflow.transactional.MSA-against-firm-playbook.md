---
id: pa-workflow.transactional.MSA-against-firm-playbook
name: MSA Against Firm Playbook
category: pa-workflow
intent: [__workflow__]
priority: P1
status: drafted
version: 0.1
---
Compare incoming MSA against the firm's pre-defined playbook.
# Steps
1. Load firm playbook (positions on key clauses)
2. Compare incoming clauses
3. Score against playbook
4. Highlight deviations + recommended responses
5. Generate redline

Integrates with [[tool.RAG-firm-knowledge]].
