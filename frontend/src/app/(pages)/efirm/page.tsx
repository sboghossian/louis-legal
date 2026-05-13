"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Briefcase, Users, FileText, Clock, DollarSign, Search,
    AlertCircle, ChevronRight, Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// e-Firm: B2B view onto matters + billing + team. Pulls live data from
// /api/matters (with stats). Falls back to demo state if no matters open.

interface ApiParty {
    name: string;
    role: string;
    type: "individual" | "entity";
    identification?: string;
    jurisdiction?: string;
}

interface ApiMatter {
    id: string;
    matterNumber: string;
    clientName: string;
    matterType: string;
    practiceArea?: string;
    status: "open" | "on-hold" | "closed" | "withdrawn";
    jurisdictions: string[];
    parties: ApiParty[];
    description?: string;
    responsibleAttorney?: string;
    openedAt: string;
    updatedAt: string;
    budgetAmount?: number;
    budgetCurrency?: string;
}

interface MatterStats {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byJurisdiction: Record<string, number>;
}

const STATUS_COLOR: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    "on-hold": "bg-yellow-100 text-yellow-800",
    closed: "bg-muted text-muted-foreground",
    withdrawn: "bg-red-100 text-red-700",
};

const TYPE_COLOR: Record<string, string> = {
    transactional: "bg-blue-100 text-blue-700",
    litigation: "bg-rose-100 text-rose-700",
    advisory: "bg-purple-100 text-purple-700",
    ip: "bg-amber-100 text-amber-800",
    family: "bg-pink-100 text-pink-700",
    regulatory: "bg-teal-100 text-teal-700",
    other: "bg-muted text-foreground/80",
};

export default function EFirmPage() {
    const router = useRouter();
    const [matters, setMatters] = useState<ApiMatter[]>([]);
    const [stats, setStats] = useState<MatterStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [tab, setTab] = useState<"matters" | "billing" | "team">("matters");

    useEffect(() => {
        (async () => {
            try {
                const [mr, sr] = await Promise.all([
                    fetch(`${API_BASE}/api/matters`, { headers: { "x-user-id": "demo" } }),
                    fetch(`${API_BASE}/api/matters/stats`, { headers: { "x-user-id": "demo" } }),
                ]);
                const mj = await mr.json();
                const sj = await sr.json();
                setMatters(mj.matters ?? []);
                setStats(sj);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = matters.filter(m =>
        !q.trim() ||
        (m.clientName + " " + m.matterNumber + " " + (m.description || "") + " " + m.parties.map(p => p.name).join(" "))
            .toLowerCase()
            .includes(q.trim().toLowerCase())
    );

    const totalValue = matters.reduce((sum, m) => sum + (m.budgetAmount || 0), 0);
    const activeMatters = stats?.byStatus?.open || matters.filter(m => m.status === "open").length;
    const onHold = stats?.byStatus?.["on-hold"] || matters.filter(m => m.status === "on-hold").length;

    return (
        <div className="max-w-6xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5" />
                <h1 className="text-lg font-semibold">e-Firm</h1>
                <Badge variant="secondary">HAQQ — Beirut</Badge>
                <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => router.push("/matters")}>
                    Open Matters
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => router.push("/matters")}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> New matter
                </Button>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <Stat icon={Briefcase} label="Active matters" value={`${activeMatters}`} />
                <Stat icon={DollarSign} label="Budget pipeline" value={totalValue > 0 ? `${(totalValue / 1000).toFixed(0)}k` : "—"} />
                <Stat icon={Clock} label="On hold" value={`${onHold}`} />
                <Stat icon={AlertCircle} label="Total matters" value={`${stats?.total ?? matters.length}`} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-border">
                <TabBtn active={tab === "matters"} onClick={() => setTab("matters")}>Matters</TabBtn>
                <TabBtn active={tab === "billing"} onClick={() => setTab("billing")}>Billing</TabBtn>
                <TabBtn active={tab === "team"} onClick={() => setTab("team")}>Team</TabBtn>
            </div>

            {tab === "matters" && (
                <>
                    <div className="relative mb-4">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search matters…" className="pl-9" />
                    </div>
                    {loading && <div className="text-sm text-muted-foreground py-6 text-center">loading…</div>}
                    {!loading && filtered.length === 0 && (
                        <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                            No matters yet. <button onClick={() => router.push("/matters")} className="text-blue-600 underline">Open Matters</button> to create one.
                        </div>
                    )}
                    <div className="border border-border rounded-lg divide-y divide-border">
                        {filtered.map(m => (
                            <button
                                key={m.id}
                                onClick={() => router.push("/matters")}
                                className="w-full text-left px-4 py-3 hover:bg-muted flex items-center gap-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm truncate">{m.clientName}</span>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLOR[m.status] || "bg-muted text-muted-foreground"}`}>{m.status}</span>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLOR[m.matterType] || "bg-muted text-foreground/80"}`}>{m.matterType}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        #{m.matterNumber}
                                        {m.responsibleAttorney && ` · ${m.responsibleAttorney}`}
                                        {m.practiceArea && ` · ${m.practiceArea}`}
                                        {m.jurisdictions.length > 0 && ` · ${m.jurisdictions.join(", ")}`}
                                    </div>
                                </div>
                                <div className="text-right text-xs flex-shrink-0">
                                    <div className="text-foreground/80">{m.parties.length} parties</div>
                                    {m.budgetAmount && (
                                        <div className="text-[10px] mt-0.5 text-muted-foreground">
                                            {m.budgetAmount.toLocaleString()} {m.budgetCurrency}
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                </>
            )}

            {tab === "billing" && (
                <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm">
                    <div className="text-foreground/80 font-medium mb-1">Billing dashboard requires Stripe + accounting integration.</div>
                    <div className="text-muted-foreground mb-4">Once connected, this view shows invoiced / WIP / overdue with drill-down by matter, partner, and client.</div>
                    <a href="/integrations" className="text-blue-700 underline text-sm">Connect a billing integration</a>
                    <div className="text-[10px] text-muted-foreground mt-4">
                        Related skills:
                        <code className="ml-1">efirm-finance.invoice-generator-from-time-entries</code>,
                        <code className="ml-1">efirm-finance.WIP-aging-report</code>,
                        <code className="ml-1">efirm-finance.collection-rate-tracker</code>
                    </div>
                </div>
            )}

            {tab === "team" && (
                <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm">
                    <div className="text-foreground/80 font-medium mb-1">Team & utilization tracking requires team setup.</div>
                    <div className="text-muted-foreground mb-4">Invite teammates to share matters and surface live utilization rates (hours / target × role).</div>
                    <a href="/settings" className="text-blue-700 underline text-sm">Set up team in Settings → Team</a>
                </div>
            )}
        </div>
    );
}

function Stat({ icon: Icon, label, value, highlight }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`border rounded-lg p-3 ${highlight ? "border-amber-300 bg-amber-50" : "border-border"}`}>
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${highlight ? "text-amber-700" : "text-muted-foreground"}`} />
                <span className={`text-[10px] uppercase tracking-wide ${highlight ? "text-amber-700" : "text-muted-foreground"}`}>{label}</span>
            </div>
            <div className={`text-xl font-semibold ${highlight ? "text-amber-900" : ""}`}>{value}</div>
        </div>
    );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground/80"}`}>
            {children}
        </button>
    );
}
