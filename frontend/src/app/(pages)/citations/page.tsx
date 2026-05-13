"use client";

import { useEffect, useState } from "react";
import { Quote, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type SourceType = "case" | "statute" | "regulation" | "treaty" | "secondary";

interface StyleInfo {
    code: string;
    name: string;
    description: string;
}

interface RenderedCitation {
    style: string;
    rendered: string;
    short?: string;
    warnings?: string[];
}

export default function CitationsPage() {
    const [sourceType, setSourceType] = useState<SourceType>("case");
    const [styles, setStyles] = useState<StyleInfo[]>([]);

    // Case
    const [caseName, setCaseName] = useState("Smith v Jones");
    const [caseYear, setCaseYear] = useState(2024);
    const [court, setCourt] = useState("DIFC CFI");
    const [citation, setCitation] = useState("CFI-001-2024");
    const [paragraph, setParagraph] = useState<number | "">(45);

    // Statute
    const [statuteName, setStatuteName] = useState("UAE Federal Decree-Law");
    const [statuteNumber, setStatuteNumber] = useState("33/2021");
    const [article, setArticle] = useState("42");
    const [yearEnacted, setYearEnacted] = useState<number | "">(2021);

    // Secondary
    const [author, setAuthor] = useState("");
    const [title, setTitle] = useState("");
    const [publisher, setPublisher] = useState("");
    const [year, setYear] = useState<number | "">("");

    const [results, setResults] = useState<RenderedCitation[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API_BASE}/api/citations/styles`);
                const j = await r.json();
                setStyles(j.styles ?? []);
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    async function formatAll() {
        setLoading(true);
        try {
            const input: any = { sourceType };
            if (sourceType === "case") {
                input.caseName = caseName;
                input.caseYear = caseYear || undefined;
                input.court = court || undefined;
                input.citation = citation || undefined;
                input.paragraph = paragraph || undefined;
            } else if (sourceType === "statute") {
                input.statuteName = statuteName;
                input.statuteNumber = statuteNumber || undefined;
                input.article = article || undefined;
                input.yearEnacted = yearEnacted || undefined;
            } else if (sourceType === "secondary") {
                input.author = author;
                input.title = title;
                input.publisher = publisher || undefined;
                input.year = year || undefined;
            }
            const r = await fetch(`${API_BASE}/api/citations/format-all`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input }),
            });
            const j = await r.json();
            setResults(j.results ?? []);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center gap-3 mb-2">
                <Quote className="w-6 h-6 text-foreground/80" />
                <h1 className="text-2xl font-semibold">Citation Engine</h1>
            </div>
            <p className="text-sm text-muted-foreground mb-8">
                Format the same source in every legal citation style. Switching between Bluebook, OSCOLA, DIFC, ADGM, KSA, UAE, Lebanon, French (Dalloz), and EU ECLI conventions.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Source</h2>

                    <div>
                        <Label className="text-xs">Source type</Label>
                        <select value={sourceType} onChange={e => setSourceType(e.target.value as SourceType)} className="mt-1 w-full border border-border rounded px-3 py-2 text-sm">
                            <option value="case">Case / Judgment</option>
                            <option value="statute">Statute / Decree</option>
                            <option value="regulation">Regulation</option>
                            <option value="treaty">Treaty</option>
                            <option value="secondary">Secondary (book / article)</option>
                        </select>
                    </div>

                    {sourceType === "case" && (
                        <>
                            <Field label="Case name (e.g., Smith v Jones)">
                                <Input value={caseName} onChange={e => setCaseName(e.target.value)} />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Year">
                                    <Input type="number" value={caseYear} onChange={e => setCaseYear(parseInt(e.target.value) || 0)} />
                                </Field>
                                <Field label="Court">
                                    <Input value={court} onChange={e => setCourt(e.target.value)} placeholder="DIFC CFI / EWHC / Cass. com." />
                                </Field>
                            </div>
                            <Field label="Citation / docket">
                                <Input value={citation} onChange={e => setCitation(e.target.value)} placeholder="CFI-001-2024 / [2024] 1 WLR 123 / ECLI:..." />
                            </Field>
                            <Field label="Paragraph (pinpoint)">
                                <Input type="number" value={paragraph} onChange={e => setParagraph(parseInt(e.target.value) || "")} />
                            </Field>
                        </>
                    )}

                    {sourceType === "statute" && (
                        <>
                            <Field label="Statute name">
                                <Input value={statuteName} onChange={e => setStatuteName(e.target.value)} />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Number">
                                    <Input value={statuteNumber} onChange={e => setStatuteNumber(e.target.value)} placeholder="33/2021 / M/19 / 36/2012" />
                                </Field>
                                <Field label="Year enacted">
                                    <Input type="number" value={yearEnacted} onChange={e => setYearEnacted(parseInt(e.target.value) || "")} />
                                </Field>
                            </div>
                            <Field label="Article / Section">
                                <Input value={article} onChange={e => setArticle(e.target.value)} />
                            </Field>
                        </>
                    )}

                    {sourceType === "secondary" && (
                        <>
                            <Field label="Author">
                                <Input value={author} onChange={e => setAuthor(e.target.value)} />
                            </Field>
                            <Field label="Title">
                                <Input value={title} onChange={e => setTitle(e.target.value)} />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Publisher">
                                    <Input value={publisher} onChange={e => setPublisher(e.target.value)} />
                                </Field>
                                <Field label="Year">
                                    <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || "")} />
                                </Field>
                            </div>
                        </>
                    )}

                    <Button onClick={formatAll} className="w-full" disabled={loading}>
                        {loading ? "Formatting…" : "Format in all styles"}
                    </Button>
                </div>

                {/* Results */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Renditions</h2>
                    {results.length === 0 && (
                        <div className="text-sm text-muted-foreground italic py-12 text-center">
                            Enter source details and click Format to see citations in every supported style.
                        </div>
                    )}
                    {results.length > 0 && (
                        <div className="space-y-3">
                            {results.map(r => {
                                const meta = styles.find(s => s.code === r.style);
                                return (
                                    <div key={r.style} className="border border-border rounded p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{meta?.name || r.style}</span>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(r.rendered.replace(/\*/g, ""))}
                                                className="ml-auto text-[10px] text-muted-foreground hover:text-muted-foreground flex items-center gap-1"
                                                title="Copy"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="text-sm font-serif" dangerouslySetInnerHTML={{ __html: italicize(r.rendered) }} />
                                        {r.short && (
                                            <div className="text-xs text-muted-foreground mt-1">short: <em>{r.short.replace(/\*/g, "")}</em></div>
                                        )}
                                        {r.warnings && r.warnings.length > 0 && (
                                            <div className="text-xs text-amber-700 mt-1">⚠ {r.warnings.join("; ")}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <Label className="text-xs">{label}</Label>
            <div className="mt-1">{children}</div>
        </div>
    );
}

function italicize(s: string): string {
    return s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
