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
    closed: "bg-gray-100 text-gray-600",
    withdrawn: "bg-red-100 text-red-700",
};

const TYPE_COLOR: Record<string, string> = {
    transactional: "bg-blue-100 text-blue-700",
    litigation: "bg-rose-100 text-rose-700",
    advisory: "bg-purple-100 text-purple-700",
    ip: "bg-amber-100 text-amber-800",
    family: "bg-pink-100 text-pink-700",
    regulatory: "bg-teal-100 text-teal-700",
    other: "bg-gray-100 text-gray-700",
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
            <div className="flex gap-1 mb-6 border-b border-gray-200">
                <TabBtn active={tab === "matters"} onClick={() => setTab("matters")}>Matters</TabBtn>
                <TabBtn active={tab === "billing"} onClick={() => setTab("billing")}>Billing</TabBtn>
                <TabBtn active={tab === "team"} onClick={() => setTab("team")}>Team</TabBtn>
            </div>

            {tab === "matters" && (
                <>
                    <div className="relative mb-4">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search matters…" className="pl-9" />
                    </div>
                    {loading && <div className="text-sm text-gray-500 py-6 text-center">loading…</div>}
                    {!loading && filtered.length === 0 && (
                        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-sm text-gray-500">
                            No matters yet. <button onClick={() => router.push("/matters")} className="text-blue-600 underline">Open Matters</button> to create one.
                        </div>
                    )}
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {filtered.map(m => (
                            <button
                                key={m.id}
                                onClick={() => router.push("/matters")}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm truncate">{m.clientName}</span>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLOR[m.status] || "bg-gray-100 text-gray-600"}`}>{m.status}</span>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLOR[m.matterType] || "bg-gray-100 text-gray-700"}`}>{m.matterType}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        #{m.matterNumber}
                                        {m.responsibleAttorney && ` · ${m.responsibleAttorney}`}
                                        {m.practiceArea && ` · ${m.practiceArea}`}
                                        {m.jurisdictions.length > 0 && ` · ${m.jurisdictions.join(", ")}`}
                                    </div>
                                </div>
                                <div className="text-right text-xs flex-shrink-0">
                                    <div className="text-gray-700">{m.parties.length} parties</div>
                                    {m.budgetAmount && (
                                        <div className="text-[10px] mt-0.5 text-gray-500">
                                            {m.budgetAmount.toLocaleString()} {m.budgetCurrency}
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                </>
            )}

            {tab === "billing" && (
                <div className="text-sm text-gray-600">
                    <div className="border border-gray-200 rounded-lg p-6 mb-6">
                        <h2 className="text-base font-semibold mb-3">This month</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <Stat icon={DollarSign} label="Invoiced" value="$48k" />
                            <Stat icon={Clock} label="WIP" value="$92k" />
                            <Stat icon={AlertCircle} label="Overdue" value="$12k" highlight />
                        </div>
                    </div>
                    <div className="text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded p-3">
                        Detailed billing dashboards available with Stripe + accounting integration (Settings → Integrations). Skills available: <code>efirm-finance.invoice-generator-from-time-entries</code>, <code>efirm-finance.WIP-aging-report</code>, <code>efirm-finance.collection-rate-tracker</code>.
                    </div>
                </div>
            )}

            {tab === "team" && (
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { name: "Lazar", role: "Partner", utilization: 92, matters: 4 },
                        { name: "Rawad", role: "Senior Associate", utilization: 84, matters: 3 },
                        { name: "Riva", role: "Associate", utilization: 76, matters: 2 },
                        { name: "Antoine", role: "Paralegal", utilization: 65, matters: 5 },
                    ].map(p => (
                        <div key={p.name} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                                    {p.name[0]}
                                </div>
                                <div>
                                    <div className="font-medium text-sm">{p.name}</div>
                                    <div className="text-xs text-gray-500">{p.role}</div>
                                </div>
                                <div className="ml-auto text-right">
                                    <div className="text-sm font-semibold">{p.utilization}%</div>
                                    <div className="text-[10px] text-gray-500">utilization</div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-2">{p.matters} active matters</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Stat({ icon: Icon, label, value, highlight }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`border rounded-lg p-3 ${highlight ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}>
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${highlight ? "text-amber-700" : "text-gray-500"}`} />
                <span className={`text-[10px] uppercase tracking-wide ${highlight ? "text-amber-700" : "text-gray-500"}`}>{label}</span>
            </div>
            <div className={`text-xl font-semibold ${highlight ? "text-amber-900" : ""}`}>{value}</div>
        </div>
    );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {children}
        </button>
    );
}
