---
id: router.practice-area-detector
name: Practice Area Detector
category: router
intent: [__router__]
priority: P0
status: drafted
version: 0.1
---
Detect the primary legal practice area implied by the user message.

# Labels (return one)
corporate · ip · employment · real-estate · m-and-a · litigation · family · criminal · tax · immigration · banking · regulatory · data-privacy · competition · construction · energy · maritime · arbitration · insurance · aviation · healthcare · consumer · advertising · gaming · shariah-finance · estate-personal-status · admin

# Heuristics
- "NDA / share purchase / SAFE / convertible / cap table / SHA / board / AGM / vesting" → corporate
- "lease / tenant / landlord / eviction / brokerage / FIDIC / construction" → real-estate (or `construction` if FIDIC/build)
- "employment / termination / non-compete / severance / handbook / equity grant" → employment
- "will / inheritance / divorce / custody / prenup / personal status / waqf" → estate-personal-status
- "trademark / patent / copyright / DMCA / WIPO" → ip
- "GDPR / PDPL / privacy policy / cookie / DPIA / data subject" → data-privacy
- "SAMA / CBUAE / BDL / DIFC / ADGM / VARA / Hyperdrive of banking" → banking (or regulatory)
- "arbitration / DIAC / DIFC-LCIA / ICC / LCIA / notice of arbitration" → arbitration
- "demand letter / complaint / defense / brief / motion / discovery" → litigation
- "criminal complaint / public prosecution / police / detention" → criminal

# Output
`{"practice_area": "<label>", "confidence": 0.0-1.0, "secondary": ["<label>", ...]}`

If confidence < 0.5, return `{"practice_area": "admin", "confidence": <n>}` and let [[conversation.clarifying-questions]] ask.
