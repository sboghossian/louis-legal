"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const CATEGORIES = [
    "custom", "draft", "review", "research", "translate", "calculate",
    "kb", "tool", "voice", "output", "messaging", "academy",
    "connector", "conversation", "casesim", "justice", "justinian",
    "ops", "report", "feed", "site", "unlock",
];

const PRIORITIES = ["P0", "P1", "P2", "P3"];

export default function NewSkillPage() {
    const router = useRouter();
    const [id, setId] = useState("custom.");
    const [name, setName] = useState("");
    const [category, setCategory] = useState("custom");
    const [intent, setIntent] = useState("");
    const [jurisdictions, setJurisdictions] = useState("__multi__");
    const [practiceArea, setPracticeArea] = useState("");
    const [priority, setPriority] = useState("P3");
    const [body, setBody] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        if (!id.trim() || !body.trim()) {
            setError("id and body are required");
            return;
        }
        if (!/^[a-zA-Z][a-zA-Z0-9._-]{1,80}$/.test(id)) {
            setError("invalid id (must match pattern: category.kebab-name)");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const r = await fetch(`${API_BASE}/api/skills`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    name: name || id,
                    category,
                    intent: intent.split(",").map(s => s.trim()).filter(Boolean),
                    jurisdictions: jurisdictions.split(",").map(s => s.trim()).filter(Boolean),
                    practice_area: practiceArea || undefined,
                    priority,
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

    return (
        <div className="max-w-3xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-gray-700" />
                <h1 className="text-lg font-semibold">New skill</h1>
            </div>
            <p className="text-sm text-gray-600 mb-6">
                Author a custom skill. It joins the 982-skill library and becomes routable in chat immediately.
                Use intent keywords + jurisdiction filters to control when this skill fires.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <Label className="text-xs">ID (slug)</Label>
                    <Input
                        value={id}
                        onChange={e => setId(e.target.value)}
                        placeholder="custom.my-skill-name"
                        className="mt-1 font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">format: category.kebab-name</p>
                </div>
                <div>
                    <Label className="text-xs">Display name</Label>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="My Custom Skill"
                        className="mt-1"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <Label className="text-xs">Category</Label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <Label className="text-xs">Priority</Label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm">
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            <div className="mb-3">
                <Label className="text-xs">Intent keywords (comma-separated)</Label>
                <Input
                    value={intent}
                    onChange={e => setIntent(e.target.value)}
                    placeholder="e.g., draft, contract, nda"
                    className="mt-1"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Used by the router to decide when this skill fires</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <Label className="text-xs">Jurisdictions (comma-separated)</Label>
                    <Input
                        value={jurisdictions}
                        onChange={e => setJurisdictions(e.target.value)}
                        placeholder="UAE, KSA, LB or __multi__"
                        className="mt-1 font-mono"
                    />
                </div>
                <div>
                    <Label className="text-xs">Practice area</Label>
                    <Input
                        value={practiceArea}
                        onChange={e => setPracticeArea(e.target.value)}
                        placeholder="corporate / employment / etc"
                        className="mt-1"
                    />
                </div>
            </div>

            <div className="mb-3">
                <Label className="text-xs">Skill body (markdown)</Label>
                <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={16}
                    placeholder={`Skill: short description.

When the router fires this skill, this text is concatenated into the system prompt. Write it like you're telling another lawyer:
- when to apply it
- what to do
- what to watch out for
- relevant statutes / regulations / cases
- cross-references to other skills: [[other-skill-id]]
`}
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                />
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">{error}</div>
            )}

            <div className="flex items-center gap-2">
                <Button onClick={submit} disabled={submitting || !id.trim() || !body.trim()}>
                    {submitting ? "Saving…" : <><Save className="w-3.5 h-3.5 mr-1" /> Save skill</>}
                </Button>
                <Button variant="outline" onClick={() => router.push("/skills")}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
            </div>

            <div className="mt-8 text-xs text-gray-500">
                <p>
                    💡 Tip: skills also support frontmatter linking to other skills via <code>[[skill.id]]</code> syntax in the body.
                    The router will surface them as "related" in the chat sidebar.
                </p>
            </div>
        </div>
    );
}
