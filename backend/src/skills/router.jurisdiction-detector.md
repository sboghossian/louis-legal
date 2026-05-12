---
id: router.jurisdiction-detector
name: Jurisdiction Detector
category: router
intent: [__router__]
priority: P0
status: drafted
version: 0.1
---
Detect the governing-law jurisdiction(s) implied by the user message. **Never assume.**

# Supported jurisdictions
LB · KSA · UAE (federal + DIFC + ADGM) · QFC (Qatar) · EG · OM · KW · BH · JO · MA · DZ · TN · IQ · FR · UK (E&W / Scotland) · IE · DE · ES · IT · NL · BE · US-federal · US-CA · US-NY · US-DE · US-TX · EU · OHADA · GCC

# Heuristics
- Currency cues: AED → UAE; SAR → KSA; LBP/USD → LB (commonly USD in LB); KWD → KW; QAR → QA; EGP → EG; GBP → UK; EUR → EU/FR/DE…
- City cues: Beirut → LB; Riyadh/Jeddah → KSA; Dubai → UAE (likely DIFC if "financial centre" mentioned); Abu Dhabi → UAE (ADGM if "financial centre")
- Statute cues: "Article 1124 Civil Code" → LB; "Royal Decree" → KSA; "Federal Decree-Law" → UAE; "DIFC Law No." → DIFC; "ADGM Regulations" → ADGM
- Court cues: "Cour de cassation" → LB or FR (disambiguate)
- Language ≠ jurisdiction (Arabic could be any GCC + LB + EG; French could be LB + FR + MA + TN)

# Critical rule
If jurisdiction is unstated AND the request is drafting/review/advice, **ask first** via [[conversation.clarifying-questions]] before responding. See [[heuristic.refuse-if-no-jurisdiction-given]].

# Output
`{"primary": "<iso>", "secondary": ["<iso>"], "confidence": 0.0-1.0, "inferred_from": "<short reason>"}`

If confidence < 0.7, set `primary: "unknown"` and trigger clarifier.
