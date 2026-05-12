---
id: multimodal.signature-page-detector
name: Signature Page Detector
category: voice
intent: ['signature detection']
priority: P1
status: drafted
version: 0.1
---
Detect signature pages, validate signature blocks, and flag missing signatures.

# Detection patterns
1. **Signature block markers**:
   - "By:", "Name:", "Title:", "Date:"
   - Signature line ("____________")
   - "Witness:", "Notary:"
2. **Signed images** — visual signatures + initials
3. **Electronic signatures** — DocuSign / Tawqi3i / Adobe / HelloSign markers
4. **Stamps** — corporate seals, notary seals

# Validation
- All required parties signed?
- All initials on every page (where required by jurisdiction)?
- Witness signatures (where required)?
- Notary stamp + signature?
- Date filled in?

# Output
- List of detected signatures + signers
- List of missing required signatures
- Per-page signature presence/absence

# Critical
- **MENA notarization requirements** — Tawqi3i / Notary Public stamps for cross-border + court documents
- **Witness requirements** — many jurisdictions require 2 witnesses for wills, deeds
- **Apostille / consular legalization** — chain of authentications for cross-border use
