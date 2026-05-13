"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, X, Trash2, Shield, ShieldCheck, Eye, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getAuthHeader as authHeaders } from "@/app/lib/louisApi";
import { useConfirm } from "@/app/contexts/ConfirmDialog";
import { useLocale } from "@/contexts/LocaleContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type Role = "owner" | "admin" | "member" | "viewer";

interface TeamMember {
    id: string;
    teamId: string;
    userId?: string;
    email: string;
    name?: string;
    role: Role;
    status: "invited" | "active" | "suspended";
    invitedAt: string;
    joinedAt?: string;
    lastActiveAt?: string;
}

interface Team {
    id: string;
    name: string;
    ownerUserId: string;
}

interface RoleDescription {
    name: string;
    description: string;
    permissions: string[];
}

const ROLE_ICONS: Record<Role, typeof Shield> = {
    owner: ShieldCheck,
    admin: Shield,
    member: UserIcon,
    viewer: Eye,
};

const ROLE_COLORS: Record<Role, string> = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    member: "bg-muted text-foreground/80",
    viewer: "bg-amber-50 text-amber-700",
};

const STATUS_COLORS: Record<TeamMember["status"], string> = {
    active: "bg-green-100 text-green-700",
    invited: "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
};

function formatTime(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TeamPage() {
    const confirm = useConfirm();
    const { t } = useLocale();
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [roles, setRoles] = useState<Record<Role, RoleDescription> | null>(null);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);

    async function refresh() {
        setLoading(true);
        try {
            const headers = await authHeaders();
            const r = await fetch(`${API_BASE}/api/team/me`, { headers });
            const j = await r.json();
            setTeam(j.team);
            setMembers(j.members ?? []);
            setRoles(j.roles);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, []);

    async function changeRole(memberId: string, role: Role) {
        const headers = await authHeaders();
        await fetch(`${API_BASE}/api/team/members/${memberId}`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
        });
        refresh();
    }

    async function remove(member: TeamMember) {
        const ok = await confirm({
            title: t("team.remove.title", { name: member.name || member.email }),
            message: t("team.remove.message"),
            confirmLabel: t("team.remove.confirm"),
            destructive: true,
        });
        if (!ok) return;
        const headers = await authHeaders();
        await fetch(`${API_BASE}/api/team/members/${member.id}`, {
            method: "DELETE",
            headers,
        });
        refresh();
    }

    async function changeStatus(memberId: string, status: TeamMember["status"]) {
        const headers = await authHeaders();
        await fetch(`${API_BASE}/api/team/members/${memberId}`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        refresh();
    }

    const ROLES_ORDER: Role[] = ["owner", "admin", "member", "viewer"];

    return (
        <div className="max-w-5xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-foreground/80" />
                <h1 className="text-2xl font-serif">{t("team.title")}</h1>
                {team && <Badge variant="secondary">{team.name}</Badge>}
                <Badge variant="secondary" className="bg-muted text-foreground/80">{members.length === 1 ? t("team.member_count.one", { count: members.length }) : t("team.member_count", { count: members.length })}</Badge>
                <Button size="sm" className="ml-auto h-7 text-xs" onClick={() => setShowInvite(true)}>
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> {t("team.invite")}
                </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
                {t("team.intro")}
            </p>

            {loading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}

            {/* Members */}
            <div className="mb-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t("team.members")}</h2>
                {!loading && members.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-12 text-center">
                        <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <div className="text-sm font-medium text-foreground mb-1">{t("team.empty.title")}</div>
                        <div className="text-xs text-muted-foreground mb-4">{t("team.empty.intro")}</div>
                        <Button size="sm" onClick={() => setShowInvite(true)}>
                            <UserPlus className="w-3.5 h-3.5 mr-1" /> {t("team.empty.cta")}
                        </Button>
                    </div>
                ) : (
                <div className="border border-border rounded-lg divide-y divide-border">
                    {members.map(m => {
                        const RoleIcon = ROLE_ICONS[m.role];
                        const initial = (m.name || m.email).slice(0, 1).toUpperCase();
                        return (
                            <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground/80">
                                    {initial}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-medium text-sm">{m.name || m.email}</span>
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[m.role]}`}>
                                            <RoleIcon className="w-3 h-3" /> {t(`team.role.${m.role}`)}
                                        </span>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[m.status]}`}>
                                            {t(`team.status.${m.status}`)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {m.email}
                                        {m.lastActiveAt && ` · ${t("team.last_seen", { time: formatTime(m.lastActiveAt) })}`}
                                        {m.status === "invited" && ` · ${t("team.invited_at", { time: formatTime(m.invitedAt) })}`}
                                    </div>
                                </div>
                                {m.role !== "owner" && (
                                    <>
                                        <select
                                            value={m.role}
                                            onChange={e => changeRole(m.id, e.target.value as Role)}
                                            className="text-xs border border-border rounded px-2 py-1"
                                        >
                                            {ROLES_ORDER.filter(r => r !== "owner").map(r => <option key={r} value={r}>{t(`team.role.${r}`)}</option>)}
                                        </select>
                                        {m.status === "active" && (
                                            <button onClick={() => changeStatus(m.id, "suspended")} className="text-xs text-muted-foreground hover:text-amber-700" title={t("team.suspend")}>
                                                {t("team.suspend")}
                                            </button>
                                        )}
                                        {m.status === "suspended" && (
                                            <button onClick={() => changeStatus(m.id, "active")} className="text-xs text-blue-600 hover:underline">
                                                {t("team.reactivate")}
                                            </button>
                                        )}
                                        <button onClick={() => remove(m)} className="text-muted-foreground hover:text-red-600">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
                )}
            </div>

            {/* Roles legend */}
            {roles && (
                <div className="mb-8">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t("team.roles")}</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {ROLES_ORDER.map(r => {
                            const desc = roles[r];
                            const Icon = ROLE_ICONS[r];
                            return (
                                <div key={r} className="border border-border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[r]}`}>
                                            <Icon className="w-3 h-3" /> {desc.name}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-2">{desc.description}</div>
                                    <ul className="text-[11px] text-foreground/80 space-y-0.5 list-disc list-inside">
                                        {desc.permissions.map((p, i) => <li key={i}>{p}</li>)}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showInvite && (
                <InviteModal onClose={() => setShowInvite(false)} onSent={() => { setShowInvite(false); refresh(); }} />
            )}
        </div>
    );
}

function InviteModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
    const { t } = useLocale();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<Role>("member");
    const [submitting, setSubmitting] = useState(false);

    async function submit() {
        if (!email.trim()) return;
        setSubmitting(true);
        try {
            const headers = await authHeaders();
            const r = await fetch(`${API_BASE}/api/team/invite`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ email, name, role }),
            });
            if (r.ok) onSent();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg w-full max-w-md">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold">{t("team.invite.title")}</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="px-6 py-4 space-y-3">
                    <div>
                        <Label className="text-xs">{t("team.invite.email")}</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@firm.com" className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t("team.invite.name")}</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t("team.invite.role")}</Label>
                        <select value={role} onChange={e => setRole(e.target.value as Role)} className="mt-1 w-full border border-border rounded px-3 py-2 text-sm">
                            <option value="admin">{t("team.invite.role.admin")}</option>
                            <option value="member">{t("team.invite.role.member")}</option>
                            <option value="viewer">{t("team.invite.role.viewer")}</option>
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>{t("action.cancel")}</Button>
                    <Button onClick={submit} disabled={submitting || !email.trim()}>
                        {submitting ? t("team.invite.sending") : t("team.invite.send")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
