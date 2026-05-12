"use client";

import { useEffect, useState } from "react";
import { Gift, Copy, Check, Mail, Linkedin, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type Product = "ai" | "efirm";

interface ReferralCode {
    id: string;
    userId: string;
    code: string;
    product: Product;
    creditsBalance: number;
    pendingPayout: number;
    totalEarned: number;
    createdAt: string;
}

interface Invite {
    id: string;
    referralCodeId: string;
    inviteeEmail: string;
    inviteeName?: string;
    stage: "clicked" | "signed-up" | "converted" | "churned";
    reward?: number;
    stageAt: string;
}

const STAGE_COLOR: Record<Invite["stage"], string> = {
    converted: "bg-green-100 text-green-700",
    "signed-up": "bg-blue-100 text-blue-700",
    clicked: "bg-yellow-100 text-yellow-800",
    churned: "bg-gray-100 text-gray-600",
};

const SHARE_COPY: Record<Product, (link: string) => string> = {
    ai: (link) => `I've been using Louis for legal drafting and it's the first tool that actually feels built for lawyers. Use my link and you'll get +50% credits on your first paid month: ${link}`,
    efirm: (link) => `My firm uses Louis e-Firm. Highly recommend it for matter management, billing, and AI workflows. Use my link for 2 free months: ${link}`,
};

function buildLink(code: ReferralCode): string {
    const path = code.product === "ai" ? "r" : "r/firm";
    return `louis.legal/${path}/${code.code}`;
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function ReferralPage() {
    const [tab, setTab] = useState<Product>("ai");
    const [aiCode, setAiCode] = useState<ReferralCode | null>(null);
    const [efirmCode, setEfirmCode] = useState<ReferralCode | null>(null);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [copied, setCopied] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [loading, setLoading] = useState(true);

    const code = tab === "ai" ? aiCode : efirmCode;
    const link = code ? buildLink(code) : "";

    async function refresh() {
        setLoading(true);
        try {
            const r = await fetch(`${API_BASE}/api/referral/codes`, { headers: { "x-user-id": "demo" } });
            const j = await r.json();
            let codes: ReferralCode[] = j.codes ?? [];

            // Auto-create codes if missing
            const ensureCode = async (product: Product) => {
                let c = codes.find(cc => cc.product === product);
                if (!c) {
                    const cr = await fetch(`${API_BASE}/api/referral/codes`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "x-user-id": "demo" },
                        body: JSON.stringify({ product, displayName: "stephane" }),
                    });
                    c = await cr.json();
                }
                return c!;
            };
            const ai = await ensureCode("ai");
            const efirm = await ensureCode("efirm");
            setAiCode(ai);
            setEfirmCode(efirm);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, []);

    useEffect(() => {
        if (!code) return;
        (async () => {
            const r = await fetch(`${API_BASE}/api/referral/codes/${code.id}/invites`);
            const j = await r.json();
            setInvites(j.invites ?? []);
        })();
    }, [code?.id]);

    function copyLink() {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    async function refreshInvites() {
        if (!code) return;
        const r = await fetch(`${API_BASE}/api/referral/codes/${code.id}/invites`);
        const j = await r.json();
        setInvites(j.invites ?? []);
    }

    return (
        <div className="max-w-4xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-gray-700" />
                <h1 className="text-lg font-semibold">Referrals</h1>
                <Badge variant="secondary">{invites.length} invites</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-6">
                Refer Louis to peers and earn credits + cash payouts. Two programs: consumer AI (per-signup credits) and e-Firm (free months for the firm).
            </p>

            <div className="flex gap-1.5 mb-6">
                <button
                    onClick={() => setTab("ai")}
                    className={`px-3 py-1.5 text-sm rounded ${tab === "ai" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-700"}`}
                >
                    Consumer AI
                </button>
                <button
                    onClick={() => setTab("efirm")}
                    className={`px-3 py-1.5 text-sm rounded ${tab === "efirm" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-700"}`}
                >
                    e-Firm
                </button>
            </div>

            {loading && <div className="text-sm text-gray-500">Loading…</div>}

            {code && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Credits balance</div>
                            <div className="text-2xl font-semibold text-gray-900 mt-1">{code.creditsBalance}</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Pending payout</div>
                            <div className="text-2xl font-semibold text-gray-900 mt-1">${code.pendingPayout}</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Total earned</div>
                            <div className="text-2xl font-semibold text-gray-900 mt-1">${code.totalEarned}</div>
                        </div>
                    </div>

                    {/* Link + share */}
                    <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border border-emerald-200 rounded-lg p-5 mb-6">
                        <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Your referral link</div>
                        <div className="flex items-center gap-2 mb-3">
                            <code className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono truncate">{link}</code>
                            <Button size="sm" variant="outline" onClick={copyLink}>
                                {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                                {copied ? "Copied" : "Copy"}
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
                                <Send className="w-3.5 h-3.5 mr-1" /> Send invite
                            </Button>
                            <a
                                href={`mailto:?subject=${encodeURIComponent("Try Louis legal AI")}&body=${encodeURIComponent(SHARE_COPY[tab](link))}`}
                                className="inline-flex items-center px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-white"
                            >
                                <Mail className="w-3.5 h-3.5 mr-1" /> Email
                            </a>
                            <a
                                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://" + link)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-white"
                            >
                                <Linkedin className="w-3.5 h-3.5 mr-1" /> LinkedIn
                            </a>
                        </div>
                    </div>

                    {/* Invites table */}
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Invites ({invites.length})</h2>
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                            {invites.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm text-gray-500">
                                    No invites yet. Click "Send invite" to add one.
                                </div>
                            )}
                            {invites.map(inv => (
                                <div key={inv.id} className="px-4 py-3 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium">{inv.inviteeName || inv.inviteeEmail}</div>
                                        {inv.inviteeName && <div className="text-xs text-gray-500">{inv.inviteeEmail}</div>}
                                    </div>
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STAGE_COLOR[inv.stage]}`}>
                                        {inv.stage}
                                    </span>
                                    {inv.reward != null && inv.reward > 0 && (
                                        <span className="text-xs text-green-700">+{inv.reward}</span>
                                    )}
                                    <span className="text-[10px] text-gray-400 w-20 text-right">{formatTime(inv.stageAt)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {showInvite && code && (
                <InviteModal
                    codeId={code.id}
                    onClose={() => setShowInvite(false)}
                    onSent={() => { setShowInvite(false); refreshInvites(); }}
                />
            )}
        </div>
    );
}

function InviteModal({ codeId, onClose, onSent }: { codeId: string; onClose: () => void; onSent: () => void }) {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function submit() {
        if (!email.trim()) return;
        setSubmitting(true);
        try {
            const r = await fetch(`${API_BASE}/api/referral/codes/${codeId}/invites`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": "demo" },
                body: JSON.stringify({ email, name }),
            });
            if (r.ok) onSent();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold">Send invite</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="px-6 py-4 space-y-3">
                    <div>
                        <Label className="text-xs">Email</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" placeholder="friend@example.com" />
                    </div>
                    <div>
                        <Label className="text-xs">Name (optional)</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
                    </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting || !email.trim()}>
                        {submitting ? "Sending…" : "Send invite"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
