"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Home, Send, Paperclip, Wrench, Sparkles,
    FileText, Network, MessageSquare, FolderOpen, Repeat, Gift,
    ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// SCAFFOLD: ported from haqq-prototype `renderHome`.
// Landing surface with composer (free-text + filter chips + tools / files menus),
// workspace switcher, category filters, and a "recents" grid pointing at chats / projects / docs.

const CATEGORIES = [
    { id: "all",        label: "All" },
    { id: "draft",      label: "Draft" },
    { id: "review",     label: "Review" },
    { id: "research",   label: "Research" },
    { id: "translate",  label: "Translate" },
    { id: "calculate",  label: "Calculate" },
];

const WORKSPACES = [
    { id: "louis-personal", label: "Personal" },
    { id: "haqq-beirut",    label: "HAQQ — Beirut", role: "Partner" },
    { id: "haqq-riyadh",    label: "HAQQ — Riyadh" },
];

const RECENT_CHATS = [
    { id: "c1", title: "Acme x Globex MSA — redline",        when: "2h ago", category: "review" },
    { id: "c2", title: "Saudi labor contract for marketing",  when: "yesterday", category: "draft" },
    { id: "c3", title: "Non-compete enforceability MENA",     when: "2d ago", category: "research" },
    { id: "c4", title: "End-of-service for 6yr UAE employee", when: "3d ago", category: "calculate" },
];

const QUICK_LINKS = [
    { label: "Doc Workspace",   href: "/doc-workspace?docId=demo", icon: FileText,    sub: "Open the Acme MSA demo" },
    { label: "Drafting Board",  href: "/drafting-board",            icon: Network,     sub: "Visualize agentic workflows" },
    { label: "Skills (973)",    href: "/skills",                    icon: Sparkles,    sub: "Explore the prompt library" },
    { label: "Customize",       href: "/customize",                 icon: Wrench,      sub: "Tailor Louis to your workflow" },
    { label: "Referral",        href: "/referral",                  icon: Gift,        sub: "Earn credits / free months" },
    { label: "Assistant chat",  href: "/assistant",                 icon: MessageSquare, sub: "Free-form conversation" },
    { label: "Projects",        href: "/projects",                  icon: FolderOpen,  sub: "Matter-scoped folders" },
    { label: "Routines",        href: "/routines",                  icon: Repeat,      sub: "Recurring AI tasks" },
];

export default function HomePage() {
    const router = useRouter();
    const [composer, setComposer] = useState("");
    const [category, setCategory] = useState("all");
    const [workspace, setWorkspace] = useState(WORKSPACES[1].id);
    const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

    function submit() {
        if (!composer.trim()) return;
        // Route to /assistant with the message as initial input via sessionStorage
        if (typeof window !== "undefined") {
            sessionStorage.setItem("louis.initialPrompt", composer);
            sessionStorage.setItem("louis.category", category);
        }
        router.push("/assistant");
    }

    const visibleChats = category === "all" ? RECENT_CHATS : RECENT_CHATS.filter(c => c.category === category);
    const currentWorkspace = WORKSPACES.find(w => w.id === workspace);

    return (
        <div className="max-w-5xl mx-auto px-8 py-10">
            <div className="flex items-center gap-2 mb-2">
                <Home className="w-5 h-5" />
                <h1 className="text-lg font-semibold">Home</h1>
                <div className="relative ml-auto">
                    <button onClick={() => setWorkspaceMenuOpen(o => !o)} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-gray-200 bg-white hover:bg-gray-50">
                        <span className="font-medium">{currentWorkspace?.label}</span>
                        {currentWorkspace?.role && <Badge variant="secondary" className="text-[10px]">{currentWorkspace.role}</Badge>}
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    {workspaceMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                            {WORKSPACES.map(w => (
                                <button key={w.id} onClick={() => { setWorkspace(w.id); setWorkspaceMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${w.id === workspace ? "bg-blue-50" : ""}`}>
                                    <div className="font-medium">{w.label}</div>
                                    {w.role && <div className="text-[10px] text-gray-500">{w.role}</div>}
                                </button>
                            ))}
                            <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 cursor-pointer">+ New workspace</div>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-sm text-gray-600 mb-8">
                Welcome back, Stephane. What are we working on today?
            </p>

            {/* Composer */}
            <div className="border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
                <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                    {CATEGORIES.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setCategory(c.id)}
                            className={`px-2.5 py-1 text-xs rounded-full border ${category === c.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
                <textarea
                    value={composer}
                    onChange={e => setComposer(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                    rows={3}
                    placeholder="Draft a mutual NDA between [parties] for [purpose], governed by [law]…  (⌘↩ to send)"
                    className="w-full px-4 py-3 text-sm resize-none outline-none"
                />
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs"><Paperclip className="w-3.5 h-3.5 mr-1" /> Attach</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs"><Wrench className="w-3.5 h-3.5 mr-1" /> Tools</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push("/skills")}><Sparkles className="w-3.5 h-3.5 mr-1" /> Prompts</Button>
                    </div>
                    <Button size="sm" onClick={submit} disabled={!composer.trim()} className="h-7 text-xs">
                        <Send className="w-3.5 h-3.5 mr-1" /> Send
                    </Button>
                </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-4 gap-3 mb-10">
                {QUICK_LINKS.map(q => (
                    <button key={q.href} onClick={() => router.push(q.href)} className="border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 hover:border-gray-300 transition-colors">
                        <q.icon className="w-4 h-4 text-gray-600 mb-2" />
                        <div className="font-medium text-sm">{q.label}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{q.sub}</div>
                    </button>
                ))}
            </div>

            {/* Recent chats */}
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Recent {category !== "all" && `· ${CATEGORIES.find(c => c.id === category)?.label}`}</h2>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {visibleChats.map(chat => (
                    <button key={chat.id} onClick={() => router.push(`/assistant/chat/${chat.id}`)} className="w-full text-left px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">{chat.title}</span>
                            <span className="text-[10px] text-gray-500">{chat.when}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">{chat.category}</div>
                    </button>
                ))}
                {!visibleChats.length && <div className="px-4 py-8 text-sm text-gray-500 text-center">No {category} chats yet</div>}
            </div>
        </div>
    );
}
