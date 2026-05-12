---
id: tool.date-tool-deadline-calculator
name: 'date tool deadline calculator'
category: tool
intent: [calculator, deadline]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Tool: Deadline calculator (legal deadlines with holiday awareness).

Calculate filing / response / limitation deadlines:
- Court rules (e.g., "30 days from service" — calendar vs business)
- Jurisdiction-specific holidays (Friday-Saturday weekends in KSA pre-2013, Saturday-Sunday post; UAE Sunday-start; Lebanon mixed)
- Religious holidays (Eid al-Fitr, Eid al-Adha — date varies by lunar calendar)
- Court vacation periods

Input: { startDate, period (days/months), basis (calendar/business/court), jurisdiction, courtType }
Output: { dueDate, intermediateDeadlines, holidaysHandled, advisoryWarnings }

Critical for [[pa-workflow.litigation.deadline-management]] and [[efirm.deadline-tracker]].
