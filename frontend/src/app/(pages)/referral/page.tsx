"use client";

import { useState } from "react";
import { Gift, Copy, Check, Mail, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// SCAFFOLD: ported from haqq-prototype REFERRAL_AI + REFERRAL_EFIRM.
// Renders the consumer-AI and e-firm referral tabs with mock data. Backend is stubbed.

const REFERRAL_AI = {
    code: "stephane-h7q",
    link: "louis.legal/r/stephane-h7q",
    creditsBalance: 60,
    pendingPayout: 20,
    totalEarned: 140,
    shareCopy: "I've been using Louis for legal drafting and it's the first tool that actually feels built for lawyers. Use my link and you'll get +50% credits on your first paid month: louis.legal/r/stephane-h7q",
    invites: [
        { name: "Layla K.", email: "layla@…", stage: "converted", reward: 20, when: "2 days ago" },
        { name: "Omar D.",  email: "omar@…",  stage: "signed up", reward: null, when: "5 days ago" },
        { name: "Ravi P.",  email: "ravi@…",  stage: "clicked",   reward: null, when: "1 week ago" },
        { name: "Sara M.",  email: "sara@…",  stage: "converted", reward: 20, when: "2 weeks ago" },
    ],
};

const REFERRAL_EFIRM = {
    link: "louis.legal/r/cabinet-stephane",
    slotsUsed: 2,
    slotsTotal: 6,
    freeMonthsEarned: 2,
    invites: [
        { firm: "Cabinet Saliba", contact: "Marie Saliba",  stage: "trial",   when: "3 days ago" },
        { firm: "Haddad & Co.",   contact: "Tarek Haddad",  stage: "signed",  when: "3 weeks ago" },
        { firm: "Beirut Legal",   contact: "Rania Khoury",  stage: "signed",  when: "6 weeks ago" },
        { firm: "Nassif Avocats", contact: "Pierre Nassif", stage: "invited", when: "yesterday" },
    ],
};

const STAGE_COLOR: Record<string, string> = {
    converted: "bg-green-100 text-green-700",
    "signed up": "bg-blue-100 text-blue-700",
    signed: "bg-blue-100 text-blue-700",
    clicked: "bg-yellow-100 text-yellow-800",
    trial: "bg-purple-100 text-purple-700",
    invited: "bg-gray-100 text-gray-600",
};

export default function ReferralPage() {
    const [tab, setTab] = useState<"ai" | "efirm">("ai");
    const [copied, setCopied] = useState(false);

    const link = tab === "ai" ? REFERRAL_AI.link : REFERRAL_EFIRM.link;
    function copyLink() {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div className="max-w-4xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Gift className="w-6 h-6" />
                <h1 className="text-2xl font-semibold">Referral</h1>
            </div>
            <p className="text-sm text-gray-600 mb-6">
                Earn credits (AI side) or free months (e-firm side) by referring lawyers and clients to Louis.
            </p>

            <div className="flex gap-1 mb-6 border-b border-gray-200">
                <TabBtn active={tab === "ai"} onClick={() => setTab("ai")}>Louis AI</TabBtn>
                <TabBtn active={tab === "efirm"} onClick={() => setTab("efirm")}>e-Firm</TabBtn>
            </div>

            {tab === "ai" ? (
                <>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <StatCard label="Credits balance" value={`€${REFERRAL_AI.creditsBalance}`} />
                        <StatCard label="Pending payout" value={`€${REFERRAL_AI.pendingPayout}`} />
                        <StatCard label="Total earned" value={`€${REFERRAL_AI.totalEarned}`} />
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 mb-8">
                        <div className="text-xs text-gray-500 mb-2">Your link</div>
                        <div className="flex gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-50 rounded font-mono text-sm">{REFERRAL_AI.link}</code>
                            <Button variant="outline" onClick={copyLink}>
                                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                                {copied ? "Copied" : "Copy"}
                            </Button>
                            <Button variant="outline"><Mail className="w-4 h-4 mr-1" />Email</Button>
                            <Button variant="outline"><Linkedin className="w-4 h-4 mr-1" />Share</Button>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">Suggested share copy:</div>
                        <div className="mt-1 px-3 py-2 bg-gray-50 rounded text-sm text-gray-700 italic">{REFERRAL_AI.shareCopy}</div>
                    </div>

                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Your invites</h2>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {REFERRAL_AI.invites.map((inv, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <div className="font-medium text-sm">{inv.name}</div>
                                    <div className="text-xs text-gray-500">{inv.email}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className={STAGE_COLOR[inv.stage]}>{inv.stage}</Badge>
                                    {inv.reward != null && <span className="text-sm font-medium">€{inv.reward}</span>}
                                    <span className="text-xs text-gray-500 w-20 text-right">{inv.when}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <StatCard label="Slots used" value={`${REFERRAL_EFIRM.slotsUsed}/${REFERRAL_EFIRM.slotsTotal}`} />
                        <StatCard label="Free months earned" value={`${REFERRAL_EFIRM.freeMonthsEarned}`} />
                        <StatCard label="Tier" value="Cabinet" />
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 mb-8">
                        <div className="text-xs text-gray-500 mb-2">Your e-firm link</div>
                        <div className="flex gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-50 rounded font-mono text-sm">{REFERRAL_EFIRM.link}</code>
                            <Button variant="outline" onClick={copyLink}>
                                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                                {copied ? "Copied" : "Copy"}
                            </Button>
                        </div>
                    </div>

                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Firm invites</h2>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {REFERRAL_EFIRM.invites.map((inv, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <div className="font-medium text-sm">{inv.firm}</div>
                                    <div className="text-xs text-gray-500">{inv.contact}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className={STAGE_COLOR[inv.stage]}>{inv.stage}</Badge>
                                    <span className="text-xs text-gray-500 w-20 text-right">{inv.when}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="mt-12 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
                <strong>Scaffold:</strong> mock data above. Backend ({"`/api/referrals`"}, Stripe payout flow) is next-session work.
            </div>
        </div>
    );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {children}
        </button>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
            <div className="text-2xl font-semibold mt-1">{value}</div>
        </div>
    );
}
