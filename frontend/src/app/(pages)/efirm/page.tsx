"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Briefcase, Users, FileText, Clock, DollarSign, Search,
    AlertCircle, ChevronRight, Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// SCAFFOLD: ported from haqq-prototype `renderEFirm`.
// B2B view: matter list + billing summary + team utilization + deadlines.

interface Matter {
    id: string;
    title: string;
    client: string;
    type: "corporate" | "dispute" | "ip" | "employment" | "regulatory";
    status: "active" | "on-hold" | "closing" | "closed";
    partner: string;
    feeStructure: "hourly" | "fixed" | "contingency" | "hybrid";
    valueEst: number;
    hoursThisMonth: number;
    deadline?: string;
    deadlineRisk?: "high" | "medium" | "low";
}

const MATTERS: Matter[] = [
    { id: "m1", title: "Acme x Globex M&A",             client: "Acme Tech FZ-LLC",  type: "corporate", status: "active",   partner: "Lazar",   feeStructure: "fixed",       valueEst: 250000, hoursThisMonth: 42, deadline: "May 28",   deadlineRisk: "high" },
    { id: "m2", title: "Saudi marketing co — formation", client: "Mani Group",        type: "corporate", status: "active",   partner: "Rawad",   feeStructure: "fixed",       valueEst: 45000,  hoursThisMonth: 18, deadline: "Jun 15",   deadlineRisk: "low" },
    { id: "m3", title: "Khoury v ACME — labor dispute",  client: "Khoury & Sons",     type: "dispute",   status: "active",   partner: "Riva",    feeStructure: "hourly",      valueEst: 80000,  hoursThisMonth: 67, deadline: "May 22",   deadlineRisk: "high" },
    { id: "m4", title: "Tawqi3i — contract renegotiation", client: "Tawqi3i",         type: "corporate", status: "active",   partner: "Lazar",   feeStructure: "hybrid",      valueEst: 30000,  hoursThisMonth: 12, deadline: "Jun 30",   deadlineRisk: "medium" },
    { id: "m5", title: "Beirut Legal — TM portfolio",    client: "Beirut Legal",      type: "ip",        status: "active",   partner: "Antoine", feeStructure: "fixed",       valueEst: 18000,  hoursThisMonth: 6,  deadline: "Jul 10",   deadlineRisk: "low" },
    { id: "m6", title: "Oneic — Oman expansion",         client: "Oneic",             type: "regulatory", status: "on-hold", partner: "Rawad",   feeStructure: "hourly",      valueEst: 60000,  hoursThisMonth: 0 },
    { id: "m7", title: "Highworth — EU GDPR compliance", client: "Highworth",         type: "regulatory", status: "closing", partner: "Riva",    feeStructure: "fixed",       valueEst: 35000,  hoursThisMonth: 9 },
];

const STATUS_COLOR: Record<Matter["status"], string> = {
    active: "bg-green-100 text-green-700",
    "on-hold": "bg-yellow-100 text-yellow-800",
    closing: "bg-blue-100 text-blue-700",
    closed: "bg-gray-100 text-gray-600",
};

const TYPE_COLOR: Record<Matter["type"], string> = {
    corporate: "bg-purple-100 text-purple-700",
    dispute: "bg-rose-100 text-rose-700",
    ip: "bg-amber-100 text-amber-800",
    employment: "bg-blue-100 text-blue-700",
    regulatory: "bg-teal-100 text-teal-700",
};

const RISK_COLOR: Record<NonNullable<Matter["deadlineRisk"]>, string> = {
    high: "text-red-600",
    medium: "text-yellow-600",
    low: "text-gray-500",
};

export default function EFirmPage() {
    const router = useRouter();
    const [q, setQ] = useState("");
    const [tab, setTab] = useState<"matters" | "billing" | "team">("matters");

    const filtered = MATTERS.filter(m =>
        !q.trim() || (m.title + " " + m.client + " " + m.partner).toLowerCase().includes(q.trim().toLowerCase())
    );

    const totalValue = MATTERS.reduce((sum, m) => sum + m.valueEst, 0);
    const totalHours = MATTERS.reduce((sum, m) => sum + m.hoursThisMonth, 0);
    const activeMatters = MATTERS.filter(m => m.status === "active").length;
    const highRisk = MATTERS.filter(m => m.deadlineRisk === "high").length;

    return (
        <div className="max-w-6xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5" />
                <h1 className="text-lg font-semibold">e-Firm</h1>
                <Badge variant="secondary">HAQQ — Beirut</Badge>
                <Button size="sm" className="ml-auto h-7 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> New matter
                </Button>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <Stat icon={Briefcase} label="Active matters" value={`${activeMatters}`} />
                <Stat icon={DollarSign} label="Pipeline value" value={`$${(totalValue / 1000).toFixed(0)}k`} />
                <Stat icon={Clock} label="Hours this month" value={`${totalHours}`} />
                <Stat icon={AlertCircle} label="High-risk deadlines" value={`${highRisk}`} highlight={highRisk > 0} />
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
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {filtered.map(m => (
                            <button key={m.id} onClick={() => router.push(`/projects/${m.id}`)} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm truncate">{m.title}</span>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLOR[m.status]}`}>{m.status}</span>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLOR[m.type]}`}>{m.type}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {m.client} · partner {m.partner} · {m.feeStructure} · ${(m.valueEst / 1000).toFixed(0)}k est
                                    </div>
                                </div>
                                <div className="text-right text-xs flex-shrink-0">
                                    <div className="text-gray-700">{m.hoursThisMonth}h this mo</div>
                                    {m.deadline && (
                                        <div className={`text-[10px] mt-0.5 ${m.deadlineRisk ? RISK_COLOR[m.deadlineRisk] : "text-gray-500"}`}>
                                            ⏱ {m.deadline}
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
                            <Stat icon={DollarSign} label="Invoiced"   value="$48k" />
                            <Stat icon={Clock}      label="WIP"        value="$92k" />
                            <Stat icon={AlertCircle} label="Overdue"    value="$12k" highlight />
                        </div>
                    </div>
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                        <strong>Scaffold:</strong> tie to Stripe + your firm's billing system. See [[efirm.invoice-generator-from-time-entries]] skill.
                    </div>
                </div>
            )}

            {tab === "team" && (
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { name: "Lazar",   role: "Partner",         utilization: 92, matters: 4 },
                        { name: "Rawad",   role: "Senior Associate", utilization: 84, matters: 3 },
                        { name: "Riva",    role: "Associate",        utilization: 76, matters: 2 },
                        { name: "Antoine", role: "Paralegal",        utilization: 65, matters: 5 },
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
