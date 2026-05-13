"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Search, Plus, AlertTriangle, X, ShieldAlert, Users, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/contexts/LocaleContext";
import { getAuthHeader } from "@/app/lib/louisApi";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type MatterStatus = "open" | "on-hold" | "closed" | "withdrawn";
type MatterType = "litigation" | "transactional" | "advisory" | "regulatory" | "ip" | "family" | "other";

interface Party {
    name: string;
    role: string;
    type: "individual" | "entity";
    identification?: string;
    jurisdiction?: string;
}

interface Matter {
    id: string;
    matterNumber: string;
    clientName: string;
    matterType: MatterType;
    practiceArea?: string;
    status: MatterStatus;
    jurisdictions: string[];
    parties: Party[];
    description?: string;
    responsibleAttorney?: string;
    openedAt: string;
    updatedAt: string;
    budgetAmount?: number;
    budgetCurrency?: string;
}

interface MatterEvent {
    id: string;
    eventType: string;
    description: string;
    eventDate?: string;
    createdAt: string;
}

interface ConflictHit {
    matterId: string;
    matterNumber: string;
    clientName: string;
    status: string;
    party: Party;
    conflictReason: string;
}

const STATUS_STYLE: Record<MatterStatus, string> = {
    open: "bg-green-100 text-green-700",
    "on-hold": "bg-amber-100 text-amber-700",
    closed: "bg-muted text-muted-foreground",
    withdrawn: "bg-red-100 text-red-700",
};

const TYPE_STYLE: Record<MatterType, string> = {
    litigation: "bg-red-50 text-red-700",
    transactional: "bg-blue-50 text-blue-700",
    advisory: "bg-purple-50 text-purple-700",
    regulatory: "bg-amber-50 text-amber-700",
    ip: "bg-pink-50 text-pink-700",
    family: "bg-rose-50 text-rose-700",
    other: "bg-muted text-foreground/80",
};

const ROLES = ["client", "counterparty", "co-defendant", "co-plaintiff", "third-party", "witness", "expert", "regulator"] as const;
const TYPES: MatterType[] = ["litigation", "transactional", "advisory", "regulatory", "ip", "family", "other"];
const STATUSES: MatterStatus[] = ["open", "on-hold", "closed", "withdrawn"];

export default function MattersPage() {
    const { t } = useLocale();
    const [matters, setMatters] = useState<Matter[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [activeStatus, setActiveStatus] = useState<MatterStatus | null>("open");
    const [activeType, setActiveType] = useState<MatterType | null>(null);
    const [selected, setSelected] = useState<Matter | null>(null);
    const [selectedEvents, setSelectedEvents] = useState<MatterEvent[]>([]);
    const [showNew, setShowNew] = useState(false);
    const [showConflictCheck, setShowConflictCheck] = useState(false);

    async function refresh() {
        try {
            const auth = await getAuthHeader();
            const [listR, statsR] = await Promise.all([
                fetch(`${API_BASE}/api/matters`, { headers: auth }),
                fetch(`${API_BASE}/api/matters/stats`, { headers: auth }),
            ]);
            const list = await listR.json();
            const s = await statsR.json();
            setMatters(list.matters ?? []);
            setStats(s);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return matters.filter(m => {
            if (activeStatus && m.status !== activeStatus) return false;
            if (activeType && m.matterType !== activeType) return false;
            if (needle) {
                const hay = (m.clientName + " " + m.matterNumber + " " + (m.description || "") + " " + m.parties.map(p => p.name).join(" ")).toLowerCase();
                if (!hay.includes(needle)) return false;
            }
            return true;
        });
    }, [matters, q, activeStatus, activeType]);

    async function openMatter(m: Matter) {
        setSelected(m);
        try {
            const auth = await getAuthHeader();
            const r = await fetch(`${API_BASE}/api/matters/${m.id}/events`, { headers: auth });
            const j = await r.json();
            setSelectedEvents(j.events ?? []);
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left list */}
            <div className="w-[420px] flex-shrink-0 border-r border-border flex flex-col">
                <div className="px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="w-5 h-5 text-foreground/80" />
                        <h1 className="text-lg font-semibold">{t("matters.title")}</h1>
                        {stats && <Badge variant="secondary">{stats.total}</Badge>}
                        <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto h-7 text-xs"
                            onClick={() => setShowConflictCheck(true)}
                        >
                            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                            {t("matters.conflict_check")}
                        </Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => setShowNew(true)}>
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            {t("matters.new")}
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("matters.search_placeholder")} className="pl-9" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        <FilterChip active={activeStatus === null} onClick={() => setActiveStatus(null)}>{t("matters.filter.all")}</FilterChip>
                        {STATUSES.map(s => (
                            <FilterChip key={s} active={activeStatus === s} onClick={() => setActiveStatus(activeStatus === s ? null : s)}>
                                {t(`matters.status.${s.replace(/-/g, "_")}`)} {stats?.byStatus?.[s] ? `· ${stats.byStatus[s]}` : ""}
                            </FilterChip>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {TYPES.map(ty => (
                            <FilterChip key={ty} active={activeType === ty} onClick={() => setActiveType(activeType === ty ? null : ty)}>
                                {t(`matters.type.${ty}`)}
                            </FilterChip>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading && <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>}
                    {filtered.map(m => (
                        <button
                            key={m.id}
                            onClick={() => openMatter(m)}
                            className={`w-full text-left px-5 py-3 border-b border-border hover:bg-muted ${selected?.id === m.id ? "bg-blue-50" : ""}`}
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLE[m.status]}`}>
                                    {t(`matters.status.${m.status.replace(/-/g, "_")}`)}
                                </span>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_STYLE[m.matterType]}`}>
                                    {t(`matters.type.${m.matterType}`)}
                                </span>
                                <span className="text-[10px] text-muted-foreground ml-auto">#{m.matterNumber}</span>
                            </div>
                            <div className="text-sm font-medium text-foreground truncate">{m.clientName}</div>
                            {m.description && <div className="text-xs text-muted-foreground line-clamp-2">{m.description}</div>}
                            <div className="text-[10px] text-muted-foreground mt-1">
                                {t("matters.parties_count", { count: m.parties.length })} · {m.jurisdictions.join(", ") || "—"}
                            </div>
                        </button>
                    ))}
                    {!loading && filtered.length === 0 && (
                        <div className="p-6 text-sm text-muted-foreground">{t("matters.empty.list")}</div>
                    )}
                </div>
            </div>

            {/* Detail */}
            <div className="flex-1 overflow-y-auto">
                {!selected ? (
                    <div className="p-12 text-sm text-muted-foreground">
                        {t("matters.empty.intro")}
                    </div>
                ) : (
                    <MatterDetail
                        matter={selected}
                        events={selectedEvents}
                        onAfterChange={refresh}
                    />
                )}
            </div>

            {showNew && (
                <NewMatterModal
                    onClose={() => setShowNew(false)}
                    onCreated={() => { setShowNew(false); refresh(); }}
                />
            )}
            {showConflictCheck && (
                <ConflictCheckModal onClose={() => setShowConflictCheck(false)} />
            )}
        </div>
    );
}

function MatterDetail({ matter, events, onAfterChange }: { matter: Matter; events: MatterEvent[]; onAfterChange: () => void }) {
    const { t } = useLocale();
    return (
        <div className="p-8 max-w-3xl">
            <div className="flex items-baseline gap-2 mb-1">
                <div className="text-xs text-muted-foreground font-mono">#{matter.matterNumber}</div>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLE[matter.status]}`}>{t(`matters.status.${matter.status.replace(/-/g, "_")}`)}</span>
            </div>
            <h1 className="text-2xl font-semibold mb-2">{matter.clientName}</h1>
            {matter.description && <p className="text-sm text-foreground/80 mb-4">{matter.description}</p>}

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6 text-xs">
                <Field label={t("matters.detail.matter_type")}>{t(`matters.type.${matter.matterType}`)}</Field>
                {matter.practiceArea && <Field label={t("matters.detail.practice_area")}>{matter.practiceArea}</Field>}
                <Field label={t("matters.detail.jurisdictions")}>{matter.jurisdictions.join(", ") || "—"}</Field>
                {matter.responsibleAttorney && <Field label={t("matters.detail.responsible")}>{matter.responsibleAttorney}</Field>}
                {matter.budgetAmount && (
                    <Field label={t("matters.detail.budget")}>{matter.budgetAmount.toLocaleString()} {matter.budgetCurrency}</Field>
                )}
                <Field label={t("matters.detail.opened")}>{new Date(matter.openedAt).toLocaleDateString()}</Field>
            </div>

            <Section icon={<Users className="w-4 h-4" />} title={t("matters.detail.parties")}>
                <div className="space-y-1.5">
                    {matter.parties.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm bg-muted px-3 py-2 rounded border border-border">
                            <span className="text-xs text-muted-foreground w-24 truncate uppercase tracking-wide">{p.role}</span>
                            <span className="font-medium">{p.name}</span>
                            {p.jurisdiction && <span className="text-xs text-muted-foreground">· {p.jurisdiction}</span>}
                            {p.identification && <span className="text-xs text-muted-foreground font-mono">· {p.identification}</span>}
                        </div>
                    ))}
                </div>
            </Section>

            <Section icon={<Calendar className="w-4 h-4" />} title={t("matters.events_count", { count: events.length })}>
                <div className="space-y-1.5">
                    {events.map(e => (
                        <div key={e.id} className="text-sm bg-muted px-3 py-2 rounded border border-border">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground/80 uppercase tracking-wide">{e.eventType}</span>
                                <span className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                            </div>
                            <div>{e.description}</div>
                        </div>
                    ))}
                    {events.length === 0 && <div className="text-xs text-muted-foreground">{t("matters.events.empty")}</div>}
                </div>
            </Section>
        </div>
    );
}

function NewMatterModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [matterNumber, setMatterNumber] = useState(`2026-${String(Math.floor(Math.random() * 900) + 100)}`);
    const [clientName, setClientName] = useState("");
    const [matterType, setMatterType] = useState<MatterType>("transactional");
    const [practiceArea, setPracticeArea] = useState("");
    const [jurisdictionsStr, setJurisdictionsStr] = useState("UAE-DIFC");
    const [description, setDescription] = useState("");
    const [parties, setParties] = useState<Party[]>([{ name: "", role: "client", type: "entity" }]);
    const [conflicts, setConflicts] = useState<ConflictHit[] | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function runConflictCheck() {
        const partiesToCheck = parties.filter(p => p.name.trim());
        if (partiesToCheck.length === 0) return;
        const auth = await getAuthHeader();
        const r = await fetch(`${API_BASE}/api/matters/conflict-check`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...auth },
            body: JSON.stringify({ parties: partiesToCheck.map(p => ({ name: p.name, role: p.role })) }),
        });
        const j = await r.json();
        setConflicts(j.hits ?? []);
    }

    async function submit() {
        setSubmitting(true);
        try {
            const auth = await getAuthHeader();
            const r = await fetch(`${API_BASE}/api/matters`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...auth },
                body: JSON.stringify({
                    matterNumber,
                    clientName,
                    matterType,
                    practiceArea: practiceArea || undefined,
                    jurisdictions: jurisdictionsStr.split(",").map(s => s.trim()).filter(Boolean),
                    description,
                    parties: parties.filter(p => p.name.trim()),
                }),
            });
            if (r.ok) onCreated();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold">New matter</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="overflow-y-auto px-6 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Matter number</Label>
                            <Input value={matterNumber} onChange={e => setMatterNumber(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs">Type</Label>
                            <select value={matterType} onChange={e => setMatterType(e.target.value as MatterType)} className="mt-1 w-full border border-border rounded px-3 py-2 text-sm">
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Client name</Label>
                        <Input value={clientName} onChange={e => setClientName(e.target.value)} className="mt-1" placeholder="Acme Trading LLC" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Practice area</Label>
                            <Input value={practiceArea} onChange={e => setPracticeArea(e.target.value)} className="mt-1" placeholder="corporate / employment / etc" />
                        </div>
                        <div>
                            <Label className="text-xs">Jurisdictions (comma sep)</Label>
                            <Input value={jurisdictionsStr} onChange={e => setJurisdictionsStr(e.target.value)} className="mt-1" placeholder="UAE-DIFC, UAE" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Description</Label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full border border-border rounded px-3 py-2 text-sm" rows={3} />
                    </div>

                    <div>
                        <Label className="text-xs">Parties</Label>
                        <div className="space-y-2 mt-1">
                            {parties.map((p, i) => (
                                <div key={i} className="flex gap-2">
                                    <Input
                                        value={p.name}
                                        onChange={e => {
                                            const updated = [...parties];
                                            updated[i] = { ...updated[i], name: e.target.value };
                                            setParties(updated);
                                        }}
                                        placeholder="Party name"
                                        className="flex-1"
                                    />
                                    <select
                                        value={p.role}
                                        onChange={e => {
                                            const updated = [...parties];
                                            updated[i] = { ...updated[i], role: e.target.value };
                                            setParties(updated);
                                        }}
                                        className="border border-border rounded px-2 text-sm"
                                    >
                                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <Button variant="ghost" size="sm" onClick={() => setParties(parties.filter((_, j) => j !== i))}>
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={() => setParties([...parties, { name: "", role: "counterparty", type: "entity" }])}>
                                + add party
                            </Button>
                        </div>
                    </div>

                    {conflicts && (
                        <div className={`rounded-lg p-3 border ${conflicts.length > 0 ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"}`}>
                            <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
                                {conflicts.length > 0 ? (
                                    <><AlertTriangle className="w-4 h-4 text-amber-700" /> {conflicts.length} potential conflict{conflicts.length === 1 ? "" : "s"}</>
                                ) : (
                                    <span className="text-green-700">No conflicts detected</span>
                                )}
                            </div>
                            {conflicts.map((c, i) => (
                                <div key={i} className="text-xs text-amber-900 py-1 border-t border-amber-200 first:border-t-0">
                                    <span className="font-mono">#{c.matterNumber}</span> — {c.conflictReason}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 border-t flex items-center gap-2">
                    <Button variant="outline" onClick={runConflictCheck}>
                        <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                        Run conflict check
                    </Button>
                    <Button onClick={submit} disabled={submitting || !clientName.trim()}>
                        {submitting ? "Creating…" : "Create matter"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ConflictCheckModal({ onClose }: { onClose: () => void }) {
    const [parties, setParties] = useState<{ name: string; role: string }[]>([{ name: "", role: "counterparty" }]);
    const [results, setResults] = useState<ConflictHit[] | null>(null);
    const [loading, setLoading] = useState(false);

    async function run() {
        setLoading(true);
        try {
            const auth = await getAuthHeader();
            const r = await fetch(`${API_BASE}/api/matters/conflict-check`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...auth },
                body: JSON.stringify({ parties: parties.filter(p => p.name.trim()) }),
            });
            const j = await r.json();
            setResults(j.hits ?? []);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg w-full max-w-xl max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Conflict check</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="overflow-y-auto px-6 py-4 space-y-3">
                    <p className="text-xs text-muted-foreground">Check prospective party names against existing matters. Names match fuzzy across token overlap and substring.</p>
                    {parties.map((p, i) => (
                        <div key={i} className="flex gap-2">
                            <Input
                                value={p.name}
                                onChange={e => {
                                    const u = [...parties];
                                    u[i] = { ...u[i], name: e.target.value };
                                    setParties(u);
                                }}
                                placeholder="Party name"
                                className="flex-1"
                            />
                            <select
                                value={p.role}
                                onChange={e => {
                                    const u = [...parties];
                                    u[i] = { ...u[i], role: e.target.value };
                                    setParties(u);
                                }}
                                className="border border-border rounded px-2 text-sm"
                            >
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <Button variant="ghost" size="sm" onClick={() => setParties(parties.filter((_, j) => j !== i))}>
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setParties([...parties, { name: "", role: "counterparty" }])}>
                        + add party
                    </Button>

                    {results && (
                        <div className={`rounded-lg p-3 border mt-4 ${results.length > 0 ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"}`}>
                            <div className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                                {results.length > 0 ? (
                                    <><AlertTriangle className="w-4 h-4 text-amber-700" /> {results.length} potential conflict{results.length === 1 ? "" : "s"}</>
                                ) : (
                                    <span className="text-green-700">No conflicts detected</span>
                                )}
                            </div>
                            {results.map((c, i) => (
                                <div key={i} className="text-xs text-amber-900 py-1.5 border-t border-amber-200 first:border-t-0">
                                    <div className="font-medium">#{c.matterNumber} · {c.clientName}</div>
                                    <div className="text-amber-700 mt-0.5">{c.conflictReason}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 border-t">
                    <Button onClick={run} disabled={loading || parties.every(p => !p.name.trim())} className="w-full">
                        {loading ? "Checking…" : "Run conflict check"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <section className="mb-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {icon} {title}
            </div>
            {children}
        </section>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="text-foreground">{children}</div>
        </div>
    );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-2 py-0.5 rounded-full text-xs border ${active ? "bg-foreground text-white border-foreground" : "bg-card text-foreground/80 border-border hover:bg-muted"}`}
        >
            {children}
        </button>
    );
}
