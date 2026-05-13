"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Save, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface SkillFrontmatter {
    id: string;
    name?: string;
    category?: string;
    intent?: string[];
    jurisdictions?: string[];
    practice_area?: string;
    priority?: string;
    status?: string;
    custom?: boolean;
    [key: string]: unknown;
}

interface Skill {
    frontmatter: SkillFrontmatter;
    prompt: string;
    path: string;
}

export default function EditSkillPage({ params }: { params: Promise<{ skillId: string }> }) {
    const { skillId } = use(params);
    const router = useRouter();
    const [skill, setSkill] = useState<Skill | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [forceEdit, setForceEdit] = useState(false);

    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [intent, setIntent] = useState("");
    const [jurisdictions, setJurisdictions] = useState("");
    const [practiceArea, setPracticeArea] = useState("");
    const [priority, setPriority] = useState("P3");
    const [status, setStatus] = useState("drafted");
    const [body, setBody] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API_BASE}/api/skills/${encodeURIComponent(skillId)}`);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const s: Skill = await r.json();
                setSkill(s);
                setName((s.frontmatter.name as string) || s.frontmatter.id);
                setCategory((s.frontmatter.category as string) || "custom");
                setIntent(((s.frontmatter.intent as string[]) || []).join(", "));
                setJurisdictions(((s.frontmatter.jurisdictions as string[]) || []).join(", "));
                setPracticeArea((s.frontmatter.practice_area as string) || "");
                setPriority((s.frontmatter.priority as string) || "P3");
                setStatus((s.frontmatter.status as string) || "drafted");
                setBody(s.prompt);
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setLoading(false);
            }
        })();
    }, [skillId]);

    const isCustom = !!skill?.frontmatter.custom;
    const readOnly = !isCustom && !forceEdit;

    async function save() {
        if (!body.trim()) {
            setError("body required");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const url = `${API_BASE}/api/skills/${encodeURIComponent(skillId)}${forceEdit ? "?force=true" : ""}`;
            const r = await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    category,
                    intent: intent.split(",").map(s => s.trim()).filter(Boolean),
                    jurisdictions: jurisdictions.split(",").map(s => s.trim()).filter(Boolean),
                    practice_area: practiceArea || undefined,
                    priority,
                    status,
                    body,
                }),
            });
            if (!r.ok) {
                const j = await r.json();
                throw new Error(j.error || `HTTP ${r.status}`);
            }
            router.push(`/skills`);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    async function remove() {
        if (!confirm(`Delete skill "${skillId}"? This is permanent.`)) return;
        try {
            const r = await fetch(`${API_BASE}/api/skills/${encodeURIComponent(skillId)}`, { method: "DELETE" });
            if (!r.ok) {
                const j = await r.json();
                throw new Error(j.error || `HTTP ${r.status}`);
            }
            router.push(`/skills`);
        } catch (e) {
            setError((e as Error).message);
        }
    }

    if (loading) return <div className="p-12 text-sm text-muted-foreground">Loading…</div>;
    if (error && !skill) return <div className="p-12 text-sm text-red-600">{error}</div>;
    if (!skill) return null;

    return (
        <div className="max-w-3xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-foreground/80" />
                <h1 className="text-lg font-semibold">Edit skill</h1>
                {isCustom ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">custom</Badge>
                ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">built-in (read-only)</Badge>
                )}
            </div>
            <div className="font-mono text-xs text-muted-foreground mb-6">{skillId}</div>

            {!isCustom && !forceEdit && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 flex items-center justify-between">
                    <div className="text-sm text-amber-900">
                        This is a built-in skill. To preserve upstream merges, built-ins are read-only by default.
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setForceEdit(true)}>
                        Edit anyway
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <Label className="text-xs">Display name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" disabled={readOnly} />
                </div>
                <div>
                    <Label className="text-xs">Category</Label>
                    <Input value={category} onChange={e => setCategory(e.target.value)} className="mt-1" disabled={readOnly} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <Label className="text-xs">Priority</Label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} disabled={readOnly} className="mt-1 w-full border border-border rounded px-3 py-2 text-sm disabled:bg-muted">
                        {["P0", "P1", "P2", "P3"].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <Label className="text-xs">Status</Label>
                    <select value={status} onChange={e => setStatus(e.target.value)} disabled={readOnly} className="mt-1 w-full border border-border rounded px-3 py-2 text-sm disabled:bg-muted">
                        {["stub", "drafted", "reviewed", "shipped"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="mb-3">
                <Label className="text-xs">Intent keywords</Label>
                <Input value={intent} onChange={e => setIntent(e.target.value)} className="mt-1" disabled={readOnly} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <Label className="text-xs">Jurisdictions</Label>
                    <Input value={jurisdictions} onChange={e => setJurisdictions(e.target.value)} className="mt-1 font-mono" disabled={readOnly} />
                </div>
                <div>
                    <Label className="text-xs">Practice area</Label>
                    <Input value={practiceArea} onChange={e => setPracticeArea(e.target.value)} className="mt-1" disabled={readOnly} />
                </div>
            </div>

            <div className="mb-3">
                <Label className="text-xs">Body (markdown)</Label>
                <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={20}
                    disabled={readOnly}
                    className="mt-1 w-full border border-border rounded px-3 py-2 text-sm font-mono disabled:bg-muted"
                />
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">{error}</div>
            )}

            <div className="flex items-center gap-2">
                <Button onClick={save} disabled={submitting || readOnly}>
                    {submitting ? "Saving…" : <><Save className="w-3.5 h-3.5 mr-1" /> Save</>}
                </Button>
                <Button variant="outline" onClick={() => router.push("/skills")}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
                {isCustom && (
                    <Button variant="ghost" className="ml-auto text-red-600" onClick={remove}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                )}
            </div>
        </div>
    );
}
