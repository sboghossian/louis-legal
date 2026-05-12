/**
 * Clause Library — vetted legal clauses with jurisdiction-aware variants.
 *
 * Each clause has:
 *  - id: stable identifier
 *  - title: human readable
 *  - category: clause family
 *  - jurisdictions: where this variant is appropriate
 *  - language: en | ar | fr
 *  - position: which-side bias (neutral | party-A | party-B)
 *  - body: the clause text (use [VARIABLE] for fill-ins)
 *  - notes: drafting notes / when to use
 *  - risk_flags: what to watch out for
 *  - alternates: links to other clause IDs (escalating / softer / harder variants)
 */
export interface Clause {
  id: string;
  title: string;
  category: ClauseCategory;
  jurisdictions: string[];
  language: "en" | "ar" | "fr";
  position: "neutral" | "party-A" | "party-B";
  body: string;
  notes?: string;
  risk_flags?: string[];
  alternates?: string[];
  tags?: string[];
}

export type ClauseCategory =
  | "governing-law"
  | "dispute-resolution"
  | "limitation-of-liability"
  | "indemnity"
  | "confidentiality"
  | "ip-ownership"
  | "non-compete"
  | "non-solicitation"
  | "term-termination"
  | "force-majeure"
  | "assignment"
  | "warranties"
  | "data-protection"
  | "sanctions-compliance"
  | "anti-bribery"
  | "tax-gross-up"
  | "definitions"
  | "boilerplate"
  | "payment"
  | "audit"
  | "service-levels"
  | "subcontracting"
  | "notices";

export const CLAUSES: Clause[] = [
  // ============== GOVERNING LAW ==============
  {
    id: "gov-law.difc",
    title: "Governing Law — DIFC",
    category: "governing-law",
    jurisdictions: ["UAE-DIFC"],
    language: "en",
    position: "neutral",
    body: "This Agreement, and any non-contractual obligations arising out of or in connection with it, shall be governed by, and construed in accordance with, the laws applied in the Dubai International Financial Centre (DIFC), to the exclusion of the laws of the Emirate of Dubai or any other state or jurisdiction.",
    notes: "Use when parties want English-common-law style governing law and have DIFC nexus. Pair with DIFC Courts forum or DIAC arbitration with DIFC seat.",
    risk_flags: ["Confirm at least one party has DIFC nexus to avoid challenge to choice", "DIFC choice does not automatically extend to mandatory MENA rules (e.g., UAE Commercial Agencies Law)"],
    alternates: ["gov-law.adgm", "gov-law.english", "gov-law.uae-onshore"],
    tags: ["common-law", "menai", "international"],
  },
  {
    id: "gov-law.adgm",
    title: "Governing Law — ADGM",
    category: "governing-law",
    jurisdictions: ["UAE-ADGM"],
    language: "en",
    position: "neutral",
    body: "This Agreement, and any non-contractual obligations arising out of or in connection with it, shall be governed by and construed in accordance with the laws of the Abu Dhabi Global Market (ADGM), including the application of English law to the extent permitted by ADGM Regulations.",
    notes: "ADGM applies English common law directly via Application of English Law Regulations 2015. Strong choice for finance / fintech.",
    risk_flags: ["Confirm subject matter is within ADGM jurisdiction", "Watch interplay with onshore Abu Dhabi mandatory law"],
    alternates: ["gov-law.difc", "gov-law.english"],
  },
  {
    id: "gov-law.english",
    title: "Governing Law — English Law",
    category: "governing-law",
    jurisdictions: ["UK", "__cross-border__"],
    language: "en",
    position: "neutral",
    body: "This Agreement and any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with it or its subject matter or formation shall be governed by and construed in accordance with the law of England and Wales.",
    notes: "Most-used cross-border choice in commercial contracts globally. Excellent precedent base + commercial sensibility.",
    risk_flags: ["Post-Brexit: judgment recognition no longer automatic in EU — assess enforcement track", "Mandatory MENA law may still override (sanctions, employment, agency)"],
    alternates: ["gov-law.new-york", "gov-law.difc", "gov-law.adgm"],
  },
  {
    id: "gov-law.uae-onshore",
    title: "Governing Law — UAE Onshore (Federal)",
    category: "governing-law",
    jurisdictions: ["UAE"],
    language: "en",
    position: "neutral",
    body: "This Agreement shall be governed by and construed in accordance with the federal laws of the United Arab Emirates as applicable in the Emirate of [Emirate].",
    notes: "Use when parties are UAE-based and prefer onshore courts; common for real estate, employment, agency.",
    risk_flags: ["Mandatory rules override choice (Commercial Agencies Law, Labor Law, Consumer Protection)", "Arabic prevails in case of bilingual conflict"],
    alternates: ["gov-law.difc", "gov-law.adgm"],
  },
  {
    id: "gov-law.ksa",
    title: "Governing Law — Kingdom of Saudi Arabia",
    category: "governing-law",
    jurisdictions: ["KSA"],
    language: "en",
    position: "neutral",
    body: "This Agreement shall be governed by and construed in accordance with the laws and regulations of the Kingdom of Saudi Arabia, including principles of Islamic Sharia to the extent applicable.",
    notes: "Default for any Saudi-nexus contract. Sharia principles inform commercial interpretation (gharar, riba, maysir doctrines).",
    risk_flags: ["Penalty clauses unenforceable beyond actual damage", "Interest clauses unenforceable — restructure as price differential or murabaha", "Foreign-judgment enforcement requires reciprocity"],
    alternates: ["gov-law.ksa-sharia-priority"],
  },
  {
    id: "gov-law.ksa.ar",
    title: "Governing Law — KSA (Arabic)",
    category: "governing-law",
    jurisdictions: ["KSA"],
    language: "ar",
    position: "neutral",
    body: "تخضع هذه الاتفاقية وتُفسر وفقاً لأنظمة وقوانين المملكة العربية السعودية، بما في ذلك مبادئ الشريعة الإسلامية متى ما كانت منطبقة.",
    notes: "Arabic variant. For bilingual contracts with KSA nexus, Arabic typically prevails in case of conflict — confirm in language clause.",
    alternates: ["gov-law.ksa"],
  },
  {
    id: "gov-law.lebanon",
    title: "Governing Law — Lebanon",
    category: "governing-law",
    jurisdictions: ["LB"],
    language: "en",
    position: "neutral",
    body: "This Agreement shall be governed by, and construed in accordance with, the laws of the Lebanese Republic.",
    notes: "Lebanese civil-law tradition (Napoleonic / French influence). Strong contract-freedom default with mandatory rules carve-outs.",
    risk_flags: ["LBP currency clause traps post-2019 — specify currency + exchange-rate convention explicitly", "Banking Secrecy Law 1956 + 2022 amendments apply"],
    alternates: ["gov-law.french"],
  },
  {
    id: "gov-law.new-york",
    title: "Governing Law — New York",
    category: "governing-law",
    jurisdictions: ["US-NY"],
    language: "en",
    position: "neutral",
    body: "This Agreement shall be governed by, and construed in accordance with, the laws of the State of New York, without regard to its conflict-of-laws principles.",
    notes: "Default for cross-border commercial / finance. NY Gen. Oblig. L. § 5-1401 explicitly permits choice for >$250k contracts without nexus.",
    risk_flags: ["Federal preemption areas (securities, IP, antitrust) override state choice", "Class actions / consumer protection may force forum"],
    alternates: ["gov-law.english", "gov-law.delaware"],
  },
  {
    id: "gov-law.french",
    title: "Governing Law — France",
    category: "governing-law",
    jurisdictions: ["FR"],
    language: "en",
    position: "neutral",
    body: "This Agreement is governed by, and shall be construed in accordance with, the laws of France.",
    notes: "Civil law jurisdiction. Code Civil 2016 reform modernized contract rules. Good-faith and abuse-of-right doctrines applicable.",
    risk_flags: ["Mandatory consumer / employment rules override", "Hardship doctrine (Art. 1195) allows renegotiation on changed circumstances"],
    alternates: ["gov-law.english", "gov-law.swiss"],
  },

  // ============== DISPUTE RESOLUTION ==============
  {
    id: "dr.diac-arbitration",
    title: "Arbitration — DIAC, Dubai",
    category: "dispute-resolution",
    jurisdictions: ["UAE", "UAE-DIFC", "__cross-border__"],
    language: "en",
    position: "neutral",
    body: "Any dispute, controversy or claim arising out of or relating to this Agreement, including its existence, validity, interpretation, performance, breach or termination, shall be referred to and finally resolved by arbitration administered by the Dubai International Arbitration Centre (DIAC) in accordance with the DIAC Arbitration Rules in effect at the time of the request for arbitration. The seat of arbitration shall be Dubai International Financial Centre (DIFC). The tribunal shall consist of [one/three] arbitrator(s). The language of the arbitration shall be English.",
    notes: "Post-2021 DIAC absorbed DIFC-LCIA. Most-used Gulf arbitration choice. DIFC seat means DIFC Court is supervisory. Output awards enforceable under NY Convention.",
    risk_flags: ["Specify number of arbitrators based on quantum (typically 3 above $5M)", "Confirm subject matter is arbitrable (employment, real estate liens, some IP may not be)"],
    alternates: ["dr.lcia-arbitration", "dr.icc-arbitration", "dr.scca-arbitration"],
  },
  {
    id: "dr.scca-arbitration",
    title: "Arbitration — SCCA, Saudi Arabia",
    category: "dispute-resolution",
    jurisdictions: ["KSA"],
    language: "en",
    position: "neutral",
    body: "Any dispute, controversy or claim arising out of or relating to this Agreement, including its existence, validity, interpretation, performance, breach or termination, shall be referred to and finally resolved by arbitration administered by the Saudi Center for Commercial Arbitration (SCCA) under the SCCA Arbitration Rules. The seat of arbitration shall be Riyadh, Kingdom of Saudi Arabia. The tribunal shall consist of [one/three] arbitrator(s). The language of the arbitration shall be [English/Arabic].",
    notes: "SCCA is rapidly maturing post-2017 Arbitration Law reforms. NY Convention enforceable. Arabic option available.",
    risk_flags: ["Sharia compliance is required — substantive law cannot conflict with public order", "Confirm award enforcement track if proceeding abroad"],
    alternates: ["dr.diac-arbitration", "dr.icc-arbitration"],
  },
  {
    id: "dr.lcia-arbitration",
    title: "Arbitration — LCIA, London",
    category: "dispute-resolution",
    jurisdictions: ["UK", "__cross-border__"],
    language: "en",
    position: "neutral",
    body: "Any dispute arising out of or in connection with this Agreement, including any question regarding its existence, validity or termination, shall be referred to and finally resolved by arbitration under the LCIA Rules, which Rules are deemed to be incorporated by reference into this clause. The number of arbitrators shall be [one/three]. The seat, or legal place, of arbitration shall be London. The language used in the arbitral proceedings shall be English.",
    notes: "Gold-standard institutional arbitration for cross-border commercial. LCIA awards strongly enforceable via NY Convention.",
    alternates: ["dr.icc-arbitration", "dr.diac-arbitration"],
  },
  {
    id: "dr.icc-arbitration",
    title: "Arbitration — ICC, Paris",
    category: "dispute-resolution",
    jurisdictions: ["__cross-border__"],
    language: "en",
    position: "neutral",
    body: "All disputes arising out of or in connection with this Agreement shall be finally settled under the Rules of Arbitration of the International Chamber of Commerce by one or more arbitrators appointed in accordance with the said Rules. The seat of arbitration shall be [Paris/Geneva/Singapore]. The language of the arbitration shall be English. The number of arbitrators shall be [one/three].",
    notes: "ICC chosen for highest-value disputes given administrative rigor + scrutiny of awards. Court of Arbitration is widely respected.",
    risk_flags: ["ICC fees scale with quantum — meaningful upfront cost", "Scrutiny step lengthens process but improves enforceability"],
    alternates: ["dr.lcia-arbitration", "dr.diac-arbitration"],
  },
  {
    id: "dr.difc-courts",
    title: "Dispute Resolution — DIFC Courts",
    category: "dispute-resolution",
    jurisdictions: ["UAE-DIFC"],
    language: "en",
    position: "neutral",
    body: "The parties irrevocably submit to the exclusive jurisdiction of the Courts of the Dubai International Financial Centre to settle any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with this Agreement or its subject matter or formation.",
    notes: "DIFC Courts hear English-language common-law commercial disputes. Judgments enforceable in onshore Dubai via DIFC Law 12/2020 mechanism.",
    risk_flags: ["Confirm DIFC jurisdiction gateway is met (party located in / contract performed in / etc.)"],
    alternates: ["dr.adgm-courts", "dr.diac-arbitration"],
  },
  {
    id: "dr.adgm-courts",
    title: "Dispute Resolution — ADGM Courts",
    category: "dispute-resolution",
    jurisdictions: ["UAE-ADGM"],
    language: "en",
    position: "neutral",
    body: "The parties irrevocably submit to the exclusive jurisdiction of the Courts of the Abu Dhabi Global Market to settle any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with this Agreement or its subject matter or formation.",
    alternates: ["dr.difc-courts", "dr.diac-arbitration"],
  },
  {
    id: "dr.multi-tier",
    title: "Multi-Tier — Negotiation → Mediation → Arbitration",
    category: "dispute-resolution",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "neutral",
    body: "Step 1 (Negotiation): The parties shall attempt in good faith to resolve any dispute arising out of or relating to this Agreement promptly by negotiation between senior executives. \n\nStep 2 (Mediation): If the dispute has not been resolved by negotiation within thirty (30) days, the parties shall attempt in good faith to resolve the dispute by mediation administered by [DIAC / CEDR / JAMS] under its mediation rules. \n\nStep 3 (Arbitration): Any dispute not resolved by mediation within sixty (60) days after submission to mediation shall be resolved by arbitration under the [DIAC Arbitration Rules / LCIA Rules / ICC Rules]. The seat shall be [DIFC]. The tribunal shall consist of [three] arbitrators. The language of the arbitration shall be English.",
    notes: "Multi-tier needs precise drafting to be enforceable — vague 'good faith' steps unenforceable. Bound time limits + clear escalation.",
    risk_flags: ["Singapore Convention 2019 enforces mediated settlements cross-border — opt in if applicable", "Carve out urgent interim relief from mandatory tiers"],
    alternates: ["dr.diac-arbitration"],
  },

  // ============== LIMITATION OF LIABILITY ==============
  {
    id: "lol.cap-fees-paid",
    title: "Limitation of Liability — Cap at Fees Paid (12 months)",
    category: "limitation-of-liability",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "party-A",
    body: "EXCEPT FOR LIABILITY ARISING FROM (i) BREACH OF CONFIDENTIALITY, (ii) INDEMNIFICATION OBLIGATIONS, (iii) WILLFUL MISCONDUCT OR GROSS NEGLIGENCE, OR (iv) AMOUNTS OWED FOR SERVICES RENDERED, THE TOTAL CUMULATIVE LIABILITY OF EITHER PARTY ARISING UNDER OR IN CONNECTION WITH THIS AGREEMENT, REGARDLESS OF THE FORM OF ACTION (CONTRACT, TORT, STRICT LIABILITY OR OTHERWISE), SHALL NOT EXCEED THE FEES ACTUALLY PAID BY CUSTOMER TO SERVICE PROVIDER UNDER THIS AGREEMENT IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM. IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, CONSEQUENTIAL, SPECIAL, INCIDENTAL, EXEMPLARY OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, OR BUSINESS INTERRUPTION, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.",
    notes: "Standard mid-market SaaS / services cap. Carve-outs are critical — too few = unenforceable as unconscionable; too many = no real cap.",
    risk_flags: [
      "Sharia / Saudi law: punitive damages exclusion redundant — Sharia doesn't recognize punitives",
      "Consumer-protection laws (UAE Consumer Protection, EU) override caps for consumer contracts",
      "Personal injury / death cap unenforceable in most jurisdictions",
    ],
    alternates: ["lol.cap-fees-total", "lol.cap-multiple", "lol.unlimited"],
  },
  {
    id: "lol.cap-multiple",
    title: "Limitation of Liability — Cap at 2x or 3x Fees",
    category: "limitation-of-liability",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "party-B",
    body: "EXCEPT FOR LIABILITY ARISING FROM (i) INDEMNIFICATION OBLIGATIONS, (ii) BREACH OF CONFIDENTIALITY, (iii) DATA PROTECTION VIOLATIONS, (iv) IP INFRINGEMENT, (v) WILLFUL MISCONDUCT OR GROSS NEGLIGENCE, OR (vi) FRAUD, THE TOTAL CUMULATIVE LIABILITY OF SERVICE PROVIDER UNDER THIS AGREEMENT SHALL NOT EXCEED TWO TIMES (2x) THE FEES PAID BY CUSTOMER TO SERVICE PROVIDER UNDER THIS AGREEMENT IN THE TWENTY-FOUR (24) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.",
    notes: "Customer-leaning variant — higher cap and broader carve-outs. Common for enterprise SaaS with sensitive data.",
    alternates: ["lol.cap-fees-paid", "lol.unlimited"],
  },

  // ============== INDEMNITY ==============
  {
    id: "indem.ip-third-party",
    title: "IP Indemnity — Third-Party Claims",
    category: "indemnity",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "party-B",
    body: "Service Provider shall indemnify, defend and hold harmless Customer and its affiliates, officers, directors, employees and agents from and against any and all third-party claims, suits, actions, proceedings, demands, damages, losses, liabilities, judgments, settlements, costs and expenses (including reasonable attorneys' fees) arising out of or in connection with any allegation that Customer's use of the Services as permitted under this Agreement infringes, misappropriates or otherwise violates any third-party intellectual property right. The foregoing indemnification obligation shall not apply to the extent the alleged infringement arises from (i) Customer's combination of the Services with materials not provided by Service Provider, (ii) Customer's modification of the Services, or (iii) Customer's use of the Services in violation of this Agreement. If a claim under this Section is made or appears likely, Service Provider may at its option (a) procure for Customer the right to continue using the Services, (b) modify the Services to be non-infringing, or (c) terminate this Agreement and refund a pro rata portion of fees prepaid for the unused period.",
    notes: "Standard IP indemnity. Carve-outs limit to Service Provider's responsibility. Refund option is essential — avoid 'modify or terminate' as sole remedy without refund.",
    alternates: ["indem.broad", "indem.mutual"],
  },
  {
    id: "indem.mutual",
    title: "Mutual Indemnity",
    category: "indemnity",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "neutral",
    body: "Each Party (the 'Indemnifying Party') shall indemnify, defend, and hold harmless the other Party, its affiliates, and its and their respective officers, directors, employees and agents (the 'Indemnified Party') from and against any and all third-party claims, demands, suits, actions and proceedings, and all resulting losses, damages, liabilities, judgments, settlements, costs and expenses (including reasonable attorneys' fees), to the extent arising out of or resulting from (i) the Indemnifying Party's breach of this Agreement, (ii) the Indemnifying Party's gross negligence, willful misconduct or fraud, or (iii) bodily injury, death, or damage to tangible property caused by the Indemnifying Party.",
    alternates: ["indem.ip-third-party", "indem.broad"],
  },

  // ============== CONFIDENTIALITY ==============
  {
    id: "conf.standard-mutual",
    title: "Confidentiality — Mutual, Standard",
    category: "confidentiality",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "neutral",
    body: "'Confidential Information' means any non-public information of a Party ('Disclosing Party') disclosed to the other Party ('Receiving Party') in connection with this Agreement, whether disclosed in writing, orally, visually or in any other form, that is marked or identified as confidential at the time of disclosure or that should reasonably be understood to be confidential given the nature of the information and the circumstances of disclosure, including without limitation trade secrets, business plans, customer and supplier information, financial information, technical data, pricing, source code, designs, and personnel information. Confidential Information shall not include information that the Receiving Party can demonstrate: (a) was rightfully in its possession without confidentiality obligation prior to disclosure; (b) is or becomes publicly available through no fault of the Receiving Party; (c) is rightfully obtained from a third party without confidentiality obligation; or (d) is independently developed by the Receiving Party without use of or reference to the Disclosing Party's Confidential Information. The Receiving Party shall (i) maintain the confidentiality of Confidential Information using at least the same degree of care it uses to protect its own confidential information of similar nature, but in no event less than reasonable care; (ii) use Confidential Information solely to perform its obligations or exercise its rights under this Agreement; (iii) limit access to Confidential Information to employees, contractors and advisors who need access and who are bound by confidentiality obligations no less stringent than those herein; and (iv) not disclose Confidential Information to any third party without the prior written consent of the Disclosing Party. The Receiving Party shall promptly notify the Disclosing Party in writing of any unauthorized use or disclosure of Confidential Information. Confidentiality obligations shall survive the termination of this Agreement for a period of five (5) years from the date of disclosure; provided that trade secrets shall remain confidential for as long as they qualify as trade secrets under applicable law.",
    notes: "Mid-market standard. 5-year tail; trade-secrets indefinite.",
    risk_flags: [
      "MENA practice: include Arabic confidentiality language if bilingual contract",
      "GDPR / PDPL: confidentiality is separate from data-protection; need DPA addendum for personal data",
      "Trade-secret indefinite duration may be unenforceable in some jurisdictions; check local law"
    ],
    alternates: ["conf.one-way", "conf.short-tail"],
  },
  {
    id: "conf.one-way",
    title: "Confidentiality — One-Way (Disclosure Only by Provider to Customer)",
    category: "confidentiality",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "party-A",
    body: "Customer acknowledges that during the course of this Agreement it may receive non-public information of Service Provider ('Confidential Information'), including without limitation trade secrets, software, technical specifications, pricing, business plans, and proposals. Customer shall (i) maintain the confidentiality of Confidential Information using at least the same degree of care it uses to protect its own confidential information of similar nature; (ii) not use Confidential Information except in connection with its authorized use of the Services; (iii) not disclose Confidential Information to any third party except to its employees, contractors and advisors who need access and who are bound by confidentiality obligations no less stringent than those herein; and (iv) promptly notify Service Provider of any unauthorized disclosure. Confidentiality obligations shall survive termination of this Agreement.",
    alternates: ["conf.standard-mutual"],
  },

  // ============== IP OWNERSHIP ==============
  {
    id: "ip.work-product-customer",
    title: "IP — Work Product Owned by Customer",
    category: "ip-ownership",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "party-A",
    body: "All right, title and interest in and to any work product, deliverables, materials, inventions, improvements, derivative works, modifications and other intellectual property created, conceived, developed, reduced to practice or fixed in tangible form by Service Provider, alone or jointly with Customer or others, in the performance of the Services under this Agreement ('Work Product') shall be the sole and exclusive property of Customer. Service Provider hereby irrevocably assigns to Customer all of its right, title and interest in and to the Work Product, including all intellectual property rights therein, effective upon creation. Service Provider shall execute all documents and take all actions reasonably requested by Customer to perfect Customer's ownership of the Work Product. Service Provider retains ownership of any pre-existing tools, methods, know-how and frameworks ('Background IP'), and grants Customer a perpetual, worldwide, royalty-free, non-exclusive license to use Background IP solely as incorporated into the Work Product to the extent necessary for Customer's use of the Work Product.",
    notes: "Use 'hereby assigns' present-tense — not 'agrees to assign' (Stanford v Roche). Critical drafting nuance.",
    risk_flags: [
      "Moral rights: in France, Lebanon, Egypt, KSA — moral rights are inalienable; consider 'waives to the extent permitted by law'",
      "Patent assignments require additional formalities (PTO recordation in US; national-phase filings in EPO/MENA)",
      "Open-source contamination — flag if Service Provider uses GPL/AGPL libraries",
    ],
    alternates: ["ip.work-product-provider-license-to-customer", "ip.joint-ownership"],
  },
  {
    id: "ip.work-product-provider-license-to-customer",
    title: "IP — Provider Retains, Customer Gets Perpetual License",
    category: "ip-ownership",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "party-B",
    body: "Service Provider shall retain all right, title and interest in and to all work product, deliverables, materials, methodologies, software, frameworks, inventions, and improvements created, conceived, developed, reduced to practice or fixed in tangible form by Service Provider in the course of providing the Services ('Provider IP'). Service Provider hereby grants to Customer a perpetual, worldwide, non-exclusive, irrevocable, royalty-free, transferable (with the underlying business unit) license to use, reproduce, modify, distribute and display Provider IP solely for Customer's internal business purposes. Customer shall not sublicense, sell, or otherwise commercialize the Provider IP except as expressly permitted herein. Customer shall retain all right, title and interest in and to any Customer Data and Customer's pre-existing intellectual property.",
    alternates: ["ip.work-product-customer", "ip.joint-ownership"],
  },

  // ============== NON-COMPETE ==============
  {
    id: "noncompete.uae-employment",
    title: "Non-Compete — UAE Employment (Reformed)",
    category: "non-compete",
    jurisdictions: ["UAE"],
    language: "en",
    position: "party-A",
    body: "During the term of employment and for a period of [twelve (12) months] following termination, Employee shall not, directly or indirectly, whether as employee, contractor, owner, partner, shareholder, advisor, consultant or otherwise, engage in or provide services to any business that competes with Employer in the field of [specific field — e.g., legal-tech SaaS] within the geographic scope of [Emirate of Dubai / United Arab Emirates]. Employee acknowledges that this restriction is reasonable in scope, duration and geographic reach given Employee's role and access to confidential information, and is necessary to protect Employer's legitimate business interests.",
    notes: "Per FDL 33/2021 + Ministerial Resolution 1/2022 — non-compete must be (a) <2 years, (b) limited to specific field, (c) geographic limit, (d) Employee must have had access to confidential information / customers, (e) be reasonable.",
    risk_flags: [
      "UAE courts will narrow over-broad non-compete to reasonable scope",
      "No consideration requirement strictly, but courts favor enforcement when fairly compensated",
      "Cannot prevent employee from earning a livelihood entirely",
    ],
    alternates: ["noncompete.ksa-employment", "noncompete.lebanon-employment", "noncompete.commercial"],
  },
  {
    id: "noncompete.ksa-employment",
    title: "Non-Compete — KSA Employment",
    category: "non-compete",
    jurisdictions: ["KSA"],
    language: "en",
    position: "party-A",
    body: "Following termination of employment, Employee shall not, for a period not exceeding two (2) years, engage in any business or employment that competes directly with Employer in [specific field] within [geographic scope]. This restriction applies only insofar as Employee had access to Employer's confidential information or relationships with customers during employment.",
    notes: "Per KSA Labor Law Art. 83 — max 2 years. Must be written, specific, reasonable. Sharia 'darar' (no harm) principle limits enforcement.",
    risk_flags: [
      "Saudization compliance — cannot use to block a Saudi national from KSA labor market unreasonably",
      "Court will narrow over-broad terms",
      "Consideration not strictly required but practically helpful",
    ],
    alternates: ["noncompete.uae-employment", "noncompete.lebanon-employment"],
  },
  {
    id: "noncompete.lebanon-employment",
    title: "Non-Compete — Lebanon Employment",
    category: "non-compete",
    jurisdictions: ["LB"],
    language: "en",
    position: "party-A",
    body: "Following termination of employment, Employee shall not, for a period of [twelve (12)] months, directly or indirectly engage in any business that competes with Employer's [specific business] within [geographic scope, e.g., Lebanese Republic]. This restriction applies only to activities that would utilize confidential information or customer relationships acquired during employment.",
    notes: "Lebanese Labor Code is silent — common-law contract principles apply. Courts enforce when reasonable in scope + duration; pay for the restriction strengthens enforceability.",
    risk_flags: ["No statutory max — courts assess reasonableness", "Currency clause critical for any payment during restriction (LBP/USD)"],
    alternates: ["noncompete.uae-employment", "noncompete.ksa-employment"],
  },

  // ============== FORCE MAJEURE ==============
  {
    id: "fm.standard-with-pandemic",
    title: "Force Majeure — Standard + Pandemic + Sanctions",
    category: "force-majeure",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "neutral",
    body: "Neither Party shall be liable for any failure or delay in the performance of its obligations under this Agreement (excluding payment obligations) to the extent such failure or delay is caused by a 'Force Majeure Event' meaning an event beyond the reasonable control of the affected Party, including without limitation: (i) acts of God; (ii) war, hostilities (whether declared or not), invasion, acts of foreign enemies, mobilization, requisition or embargo; (iii) terrorism, civil commotion, riot, insurrection or revolution; (iv) strikes, work stoppages, labor disputes, lockouts, or other industrial action (other than those of the affected Party's own employees); (v) earthquake, fire, flood, hurricane, tsunami, volcanic eruption, or other natural disaster; (vi) epidemic, pandemic, or quarantine (including the COVID-19 pandemic and any future epidemic); (vii) action or inaction of any governmental authority including the imposition of new sanctions, export controls, or trade restrictions that prohibit or materially restrict performance; and (viii) failure of public utilities or critical infrastructure including the internet. The Party affected by a Force Majeure Event shall promptly notify the other Party in writing of the occurrence and expected duration of the event and shall use reasonable efforts to mitigate its effects and resume performance. If a Force Majeure Event continues for a period exceeding [ninety (90) days], either Party may terminate this Agreement upon written notice without liability.",
    notes: "Post-COVID standard — explicit pandemic carve-in. Post-Russia-sanctions, explicit sanctions carve-in. Always exclude payment obligations from FM cover.",
    alternates: ["fm.narrow", "fm.hardship-civil-law"],
  },
  {
    id: "fm.hardship-civil-law",
    title: "Hardship Clause — Civil Law (Rebus Sic Stantibus)",
    category: "force-majeure",
    jurisdictions: ["FR", "LB", "UAE", "EG", "DE"],
    language: "en",
    position: "neutral",
    body: "If a change in circumstances unforeseen at the time of execution of this Agreement makes the performance of obligations by a Party excessively onerous (such circumstances not amounting to force majeure), the affected Party may request the renegotiation of the relevant obligations. Such request shall be made in writing and shall identify the changed circumstances and the specific obligations affected. The Parties shall negotiate in good faith for a period of [sixty (60) days]. If the Parties do not reach agreement on revised terms within such period, either Party may submit the matter to the dispute-resolution procedure set forth in this Agreement for adjustment of the relevant obligations.",
    notes: "Common in civil-law jurisdictions (UAE Civil Code Art. 249; French Code Civ. Art. 1195; German BGB §313). Common-law jurisdictions traditionally reject; pacta sunt servanda preferred.",
    alternates: ["fm.standard-with-pandemic"],
  },

  // ============== DATA PROTECTION (DPA) ==============
  {
    id: "dp.dpa-gdpr-pdpl",
    title: "Data Processing Addendum — GDPR + UAE/KSA PDPL",
    category: "data-protection",
    jurisdictions: ["EU", "UAE", "KSA", "__cross-border__"],
    language: "en",
    position: "neutral",
    body: "1. Definitions. 'Personal Data', 'Processing', 'Controller', 'Processor', and 'Data Subject' shall have the meanings ascribed to them in the EU General Data Protection Regulation (Regulation (EU) 2016/679) ('GDPR'), the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021) ('UAE PDPL') and the KSA Personal Data Protection Law (Royal Decree M/19 of 2023) ('KSA PDPL'), as applicable.\n\n2. Roles. Customer is the Controller and Service Provider is the Processor of Personal Data processed in connection with the Services.\n\n3. Scope. Service Provider shall Process Personal Data only on documented instructions from Customer, including with regard to transfers of Personal Data to a third country or international organization.\n\n4. Confidentiality. Service Provider shall ensure that persons authorized to Process Personal Data have committed themselves to confidentiality.\n\n5. Security. Service Provider shall implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including encryption in transit and at rest, access controls, regular testing, and incident response.\n\n6. Sub-Processors. Service Provider shall not engage another processor without prior specific or general written authorization of Customer. Service Provider shall maintain a current list of Sub-Processors at [URL] and shall notify Customer of any changes at least thirty (30) days in advance.\n\n7. Data Subject Rights. Service Provider shall assist Customer, by appropriate technical and organizational measures, in fulfilling Customer's obligation to respond to requests for exercising Data Subject rights.\n\n8. Breach Notification. Service Provider shall notify Customer without undue delay (and in any event within seventy-two (72) hours) after becoming aware of a Personal Data breach.\n\n9. Audits. Service Provider shall make available to Customer all information necessary to demonstrate compliance with this DPA and allow for and contribute to audits, including inspections, conducted by Customer or an auditor mandated by Customer, subject to reasonable confidentiality obligations.\n\n10. Cross-Border Transfers. The parties shall comply with the 2021 Standard Contractual Clauses (Module 2: Controller-to-Processor) for transfers from the EEA to a third country. For transfers from the UAE / KSA, the parties shall implement appropriate safeguards in accordance with UAE PDPL Article 22 / KSA PDPL Article 29.\n\n11. Return / Deletion. Upon termination of the Agreement, Service Provider shall return or delete Personal Data at Customer's choice, unless retention is required by applicable law.\n\n12. Liability. The parties' liability under this DPA shall be subject to the limitations set forth in the main Agreement, except that nothing in this DPA shall limit liability for breach of GDPR / UAE PDPL / KSA PDPL to the extent such limitation is prohibited by applicable law.",
    notes: "Multi-jurisdiction DPA — works for EU/UAE/KSA. Cross-border transfer mechanism specified.",
    risk_flags: [
      "If transferring to/from EU: must implement 2021 SCCs + Transfer Impact Assessment",
      "UAE PDPL: requires explicit consent or specific lawful basis for cross-border transfer",
      "KSA PDPL: SDAIA adequacy decision route or controller assurance",
    ],
    alternates: ["dp.gdpr-only", "dp.pdpl-mena-only"],
  },

  // ============== SANCTIONS COMPLIANCE ==============
  {
    id: "sanc.standard-multi-list",
    title: "Sanctions Compliance — Multi-List",
    category: "sanctions-compliance",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "neutral",
    body: "Each Party represents and warrants that, as of the Effective Date and throughout the term of this Agreement: (a) neither it nor any of its directors, officers, employees, agents or affiliates is a Sanctioned Person; (b) it shall not, in connection with this Agreement, engage in any transaction or activity that would violate any Sanctions; and (c) it shall comply with all applicable Sanctions in the performance of this Agreement. 'Sanctioned Person' means any individual or entity that is (i) listed on any Sanctions List, (ii) located in, organized under the laws of, or ordinarily resident in any Sanctioned Country, or (iii) owned 50% or more, individually or in the aggregate, by, or controlled by, any of the foregoing. 'Sanctions' means any economic or trade sanctions or restrictive measures administered or enforced by the United Nations Security Council, the United States Government (including OFAC), the European Union, any Member State of the European Union, the United Kingdom (including HMT/OFSI), or any competent authority in the United Arab Emirates, the Kingdom of Saudi Arabia, or the Republic of Lebanon. 'Sanctions List' means the Specially Designated Nationals and Blocked Persons List maintained by OFAC, the Consolidated List maintained by the UN Security Council, the consolidated list of persons, groups and entities subject to EU financial sanctions, the UK Consolidated List, the UAE EOCN list, the KSA NCASGS list, the Lebanon BDL Special Investigation Commission list, and any similar list maintained by any competent authority. Either Party may terminate this Agreement immediately upon written notice if the other Party (or its controllers / affiliates) becomes a Sanctioned Person or breaches this clause.",
    notes: "Multi-list compliance — UN + OFAC + EU + UK + UAE + KSA + LB. Termination right is critical.",
    risk_flags: [
      "Russia-specific sanctions (EU 833/2014 et seq.) — consider explicit sectoral carve-out if dealing with energy/financial Russian counterparties",
      "Cuba sanctions are particularly broad (re-export, indirect)",
      "Iran/Syria/DPRK: near-total commercial bans + secondary sanctions for non-US persons",
    ],
    alternates: ["sanc.us-only", "sanc.eu-only"],
  },

  // ============== ANTI-BRIBERY ==============
  {
    id: "ab.fcpa-ukba-ksa",
    title: "Anti-Bribery — FCPA + UK Bribery Act + KSA",
    category: "anti-bribery",
    jurisdictions: ["__multi__"],
    language: "en",
    position: "neutral",
    body: "Each Party represents, warrants and covenants that it shall comply, and shall cause its directors, officers, employees, agents, subcontractors and affiliates to comply, with all applicable anti-corruption and anti-bribery laws and regulations, including without limitation the United States Foreign Corrupt Practices Act of 1977 (as amended) ('FCPA'), the United Kingdom Bribery Act 2010 ('UKBA'), the Saudi Arabian Anti-Bribery Law (Royal Decree No. M/36 dated 1412H) and any other applicable anti-corruption laws. In connection with this Agreement, neither Party shall, directly or indirectly, offer, promise, give, authorize, request or receive any payment, gift or other thing of value to or from any government official, political party, candidate for political office, or any other person for the purpose of (i) influencing any act or decision in such person's official capacity, (ii) inducing such person to do or omit to do any act in violation of his or her lawful duty, (iii) securing any improper advantage, or (iv) inducing such person to use his or her influence to affect any government act or decision. Each Party shall maintain accurate books and records reflecting all financial transactions in connection with this Agreement. Either Party may terminate this Agreement immediately upon written notice if it has a reasonable basis to believe that the other Party has breached this clause, and shall be entitled to seek indemnification for any related losses.",
    notes: "Multi-jurisdiction anti-bribery. FCPA reaches non-US persons via securities-listing nexus. UKBA has wider 'commercial bribery' coverage. KSA enforcement increasing post-Vision 2030.",
    risk_flags: [
      "Local agents in MENA — high-risk channel; require pre-engagement compliance diligence",
      "Facilitation payments: FCPA carve-out narrow; UKBA no carve-out; KSA no carve-out",
      "Gifts & hospitality: maintain registers; cap below local custom + value-of-influence threshold",
    ],
    alternates: ["ab.fcpa-only"],
  },
];

export interface ClauseQuery {
  category?: string;
  jurisdiction?: string;
  language?: string;
  position?: string;
  q?: string;
}

export function searchClauses(query: ClauseQuery): Clause[] {
  let results = CLAUSES;
  if (query.category) {
    results = results.filter(c => c.category === query.category);
  }
  if (query.jurisdiction) {
    results = results.filter(c =>
      c.jurisdictions.includes(query.jurisdiction!) ||
      c.jurisdictions.includes("__multi__") ||
      c.jurisdictions.includes("__cross-border__")
    );
  }
  if (query.language) {
    results = results.filter(c => c.language === query.language);
  }
  if (query.position) {
    results = results.filter(c => c.position === query.position);
  }
  if (query.q) {
    const needle = query.q.toLowerCase();
    results = results.filter(c =>
      c.id.toLowerCase().includes(needle) ||
      c.title.toLowerCase().includes(needle) ||
      c.body.toLowerCase().includes(needle) ||
      (c.tags || []).some(t => t.toLowerCase().includes(needle))
    );
  }
  return results;
}

export function getClause(id: string): Clause | undefined {
  return CLAUSES.find(c => c.id === id);
}

export function listCategories(): { category: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const c of CLAUSES) {
    counts[c.category] = (counts[c.category] || 0) + 1;
  }
  return Object.entries(counts).map(([category, count]) => ({ category, count }));
}

export function listJurisdictions(): { jurisdiction: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const c of CLAUSES) {
    for (const j of c.jurisdictions) {
      counts[j] = (counts[j] || 0) + 1;
    }
  }
  return Object.entries(counts).map(([jurisdiction, count]) => ({ jurisdiction, count }));
}
