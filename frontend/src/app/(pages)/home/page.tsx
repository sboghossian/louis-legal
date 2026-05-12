"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Home, Send, Paperclip, Wrench, Sparkles,
    FileText, Network, MessageSquare, FolderOpen, Repeat, Gift,
    ChevronDown, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listChats } from "@/app/lib/louisApi";
import type { LouisChat } from "@/app/components/shared/types";
import { useLocale } from "@/contexts/LocaleContext";
import { useUserProfile } from "@/contexts/UserProfileContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface PromptPackSkill {
    id: string;
    name: string;
    category: string;
    intent?: string[];
}

// Landing surface: composer (free-text + slash commands + prompt library),
// workspace switcher, category filters, and live recents from real chats API.

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

function inferCategory(title: string): string {
    const t = title.toLowerCase();
    if (/draft|nda|contract|agreement/.test(t)) return "draft";
    if (/review|redline|compare|risk/.test(t)) return "review";
    if (/research|precedent|enforceability|jurisdiction/.test(t)) return "research";
    if (/translate|arabic|french/.test(t)) return "translate";
    if (/calc|eos|deadline|stamp duty/.test(t)) return "calculate";
    return "all";
}

function relativeTime(iso: string): string {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
}

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
    const { t } = useLocale();
    const { profile } = useUserProfile();
    const displayName = profile?.displayName || null;
    const [composer, setComposer] = useState("");
    const [category, setCategory] = useState("all");
    const [workspace, setWorkspace] = useState(WORKSPACES[1].id);
    const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
    const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
    const [promptLibrary, setPromptLibrary] = useState<PromptPackSkill[]>([]);
    const [promptQuery, setPromptQuery] = useState("");
    const [slashCommandsOpen, setSlashCommandsOpen] = useState(false);
    const [recentChats, setRecentChats] = useState<LouisChat[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load prompt library + recent chats once
    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API_BASE}/api/skills?category=prompt-pack`);
                if (r.ok) {
                    const json = await r.json();
                    setPromptLibrary(json.entries ?? []);
                }
            } catch (e) {
                console.error(e);
            }
            try {
                const chats = await listChats();
                setRecentChats((chats ?? []).slice(0, 12));
            } catch (e) {
                // Auth required — leave empty
                console.error(e);
            }
        })();
    }, []);

    // Slash-command detector: when user types "/" at start, show menu
    function onComposerChange(value: string) {
        setComposer(value);
        const showSlash = value.startsWith("/") && !value.includes(" ");
        setSlashCommandsOpen(showSlash);
    }

    function insertPrompt(text: string) {
        setComposer(text);
        setPromptLibraryOpen(false);
        setSlashCommandsOpen(false);
        textareaRef.current?.focus();
    }

    function submit() {
        if (!composer.trim()) return;
        if (typeof window !== "undefined") {
            sessionStorage.setItem("louis.initialPrompt", composer);
            sessionStorage.setItem("louis.category", category);
        }
        router.push("/assistant");
    }

    const SLASH_COMMANDS = [
        { cmd: "/draft",     desc: "Draft a contract or clause",            example: "/draft NDA mutual UAE" },
        { cmd: "/review",    desc: "Review a contract for issues",          example: "/review this MSA from the client side" },
        { cmd: "/research",  desc: "Research statutes / case law",          example: "/research non-compete UAE recent rulings" },
        { cmd: "/compare",   desc: "Compare across jurisdictions",          example: "/compare employment notice LB vs KSA" },
        { cmd: "/translate", desc: "Translate text or clause",              example: "/translate to Arabic" },
        { cmd: "/calc",      desc: "Calculate EOSG / interest / deadline",  example: "/calc EOSG for 6yr UAE employee" },
        { cmd: "/summarize", desc: "Summarize a document or clause",        example: "/summarize this MSA in 5 bullets" },
        { cmd: "/demo",      desc: "Open the Acme MSA demo workspace",      example: "/demo" },
        { cmd: "/help",      desc: "List available commands + features",    example: "/help" },
    ];

    const filteredPrompts = promptLibrary
        .filter(p => !promptQuery.trim() || (p.id + p.name).toLowerCase().includes(promptQuery.trim().toLowerCase()))
        .slice(0, 30);

    const annotatedChats = recentChats.map(c => ({
        id: c.id,
        title: c.title || "Untitled chat",
        when: relativeTime(c.created_at),
        category: inferCategory(c.title || ""),
    }));
    const visibleChats = category === "all" ? annotatedChats : annotatedChats.filter(c => c.category === category);
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
                {displayName
                    ? t("home.welcome.named", { name: displayName })
                    : t("home.welcome.anon")}
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
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={composer}
                        onChange={e => onComposerChange(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Escape") { setSlashCommandsOpen(false); setPromptLibraryOpen(false); }
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                        }}
                        rows={3}
                        placeholder={t("home.composer.placeholder")}
                        className="w-full px-4 py-3 text-sm resize-none outline-none"
                    />
                    {slashCommandsOpen && (
                        <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-y-auto z-20">
                            <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-100">{t("home.slash_commands")}</div>
                            {SLASH_COMMANDS.filter(s => s.cmd.startsWith(composer)).map(s => (
                                <button
                                    key={s.cmd}
                                    onClick={() => insertPrompt(s.example)}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-semibold">{s.cmd}</span>
                                        <span className="text-xs text-gray-500">{s.desc}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{s.example}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs"><Paperclip className="w-3.5 h-3.5 mr-1" /> Attach</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs"><Wrench className="w-3.5 h-3.5 mr-1" /> Tools</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPromptLibraryOpen(true)}>
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> {t("home.prompt_library_header")} ({promptLibrary.length})
                        </Button>
                    </div>
                    <Button size="sm" onClick={submit} disabled={!composer.trim()} className="h-7 text-xs">
                        <Send className="w-3.5 h-3.5 mr-1" /> Send
                    </Button>
                </div>
            </div>

            {/* Prompt library modal */}
            {promptLibraryOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setPromptLibraryOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl w-[640px] max-w-[90vw] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            <h2 className="font-semibold text-sm">{t("home.prompt_library_header")}</h2>
                            <Badge variant="secondary">{promptLibrary.length} expert prompts</Badge>
                            <button onClick={() => setPromptLibraryOpen(false)} className="ml-auto text-gray-500 hover:text-gray-900">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="px-5 py-3 border-b border-gray-100">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={promptQuery}
                                    onChange={e => setPromptQuery(e.target.value)}
                                    placeholder="Search prompts… (e.g., NDA, employment, distribution)"
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded outline-none focus:border-gray-500"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {filteredPrompts.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => insertPrompt(p.name)}
                                    className="w-full text-left px-5 py-3 border-b border-gray-100 hover:bg-gray-50"
                                >
                                    <div className="font-medium text-sm">{p.name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">{p.id}</div>
                                </button>
                            ))}
                            {!filteredPrompts.length && (
                                <div className="px-5 py-12 text-center text-sm text-gray-500">{t("home.no_prompts")}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{t("home.recent")} {category !== "all" && `· ${CATEGORIES.find(c => c.id === category)?.label}`}</h2>
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
                {!visibleChats.length && <div className="px-4 py-8 text-sm text-gray-500 text-center">{t("home.no_chats", { category })}</div>}
            </div>
        </div>
    );
}
