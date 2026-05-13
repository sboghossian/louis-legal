/**
 * Export helpers: download the current document as .md, .html, or .docx.
 *
 * - .html: editor HTML wrapped in a minimal printable shell.
 * - .md:   naive HTML->Markdown for the headings/paragraphs/lists/blockquotes
 *          we actually emit. Inline marks (bold/italic/underline) are
 *          preserved; tracked-change marks become asterisks/strikethrough.
 * - .docx: real Office Open XML output built with the `docx` package. The
 *          editor HTML is parsed with DOMParser, walked block-by-block, and
 *          mapped to `Paragraph` / `TextRun` / `ExternalHyperlink` objects.
 *          Tracked-change marks become coloured / struck runs that match the
 *          editor's visual treatment (green insertions, red deletions).
 */
import type { Editor } from "@tiptap/react";
import {
    AlignmentType,
    Document,
    ExternalHyperlink,
    HeadingLevel,
    LevelFormat,
    Packer,
    Paragraph,
    TextRun,
    type ParagraphChild,
} from "docx";

/**
 * Mutable subset of `IRunOptions` we actually populate. Mirrors the shape
 * `TextRun` accepts; kept local so we don't have to wrestle with the
 * `readonly` modifiers on docx's published types when building the object.
 */
type RunOpts = {
    bold?:      boolean;
    italics?:   boolean;
    underline?: { color?: string };
    strike?:    boolean;
    color?:     string;
    font?:      string;
};

function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportHTML(editor: Editor, title: string) {
    const body = editor.getHTML();
    const shell = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeAttr(title)}</title>
<style>
  body { font-family: "EB Garamond", Georgia, serif; max-width: 720px; margin: 2.5rem auto; padding: 0 1.5rem; color: #1f1d18; background: #fbf8f2; line-height: 1.6; }
  h1, h2, h3, h4 { font-family: "EB Garamond", Georgia, serif; color: #1f1d18; margin-top: 1.6em; }
  .louis-track-insertion { color: #166534; text-decoration: underline; }
  .louis-track-deletion  { color: #b91c1c; text-decoration: line-through; }
  .louis-comment         { background: #fef3c7; border-bottom: 1px dotted #b45309; }
</style>
</head>
<body>
${body}
</body>
</html>`;
    downloadBlob(`${safeFilename(title)}.html`, new Blob([shell], { type: "text/html;charset=utf-8" }));
}

export function exportMarkdown(editor: Editor, title: string) {
    const html = editor.getHTML();
    const md = htmlToMarkdown(html);
    downloadBlob(`${safeFilename(title)}.md`, new Blob([md], { type: "text/markdown;charset=utf-8" }));
}

/**
 * Build a real .docx Document from the editor's HTML and trigger a download.
 *
 * Block-level mapping:
 *   <h1>–<h4>    → Paragraph + HeadingLevel.HEADING_1..HEADING_4
 *   <p>          → Paragraph (default style)
 *   <blockquote> → Paragraph with left indent (720 twips ≈ 0.5in)
 *   <ul>/<ol>    → Paragraphs with `bullet: { level }` or
 *                  `numbering: { reference: NUMBERING_REF, level }`
 *   <pre>        → Paragraph in monospaced font
 *   <hr>         → empty Paragraph (placeholder; thematicBreak omitted for v1)
 *
 * Inline mapping (accumulated as ancestor formatting is descended):
 *   <strong>/<b>           → bold
 *   <em>/<i>               → italics
 *   <u>                    → underline: {}
 *   <s>/<strike>/<del>     → strike
 *   <code>                 → monospaced font
 *   <a href="X">           → ExternalHyperlink wrapping its child runs
 *   <br>                   → CarriageReturn (rendered as TextRun({ break: 1 }))
 *
 * Track-change marks (matched by class OR data-attribute, both forms are
 * emitted by the editor at different times):
 *   .louis-track-insertion / [data-track-insertion]
 *       → TextRun({ color: "166534" })       (forest green)
 *   .louis-track-deletion  / [data-track-deletion]
 *       → TextRun({ strike: true, color: "B91C1C" })  (red)
 *
 * TODO(editor.docx.comments): comment marks (`.louis-comment` /
 * `[data-comment-id]`) currently pass through as their underlying text. Word
 * comments need `Comment` objects + a comments part + relationships, which
 * is meaningful surface area; keep them inline-text-only for v1.
 */
export function exportDocx(editor: Editor, title: string) {
    const html = editor.getHTML();
    const children = htmlToDocxBlocks(html);

    const doc = new Document({
        title,
        creator:     "Louis",
        description: "Exported from Louis editor",
        numbering: {
            config: [
                {
                    reference: NUMBERING_REF,
                    levels:    [0, 1, 2, 3, 4, 5].map((lv) => ({
                        level:  lv,
                        format: LevelFormat.DECIMAL,
                        text:   `%${lv + 1}.`,
                        alignment: AlignmentType.START,
                        style:  { paragraph: { indent: { left: 720 * (lv + 1), hanging: 360 } } },
                    })),
                },
            ],
        },
        sections: [{ children: children.length > 0 ? children : [new Paragraph({})] }],
    });

    void Packer.toBlob(doc).then((blob) => {
        // `Packer.toBlob` already sets the OOXML mimetype, but be explicit so
        // the caller's expectation in this file's JSDoc holds true.
        const docxBlob = new Blob([blob], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        downloadBlob(`${safeFilename(title)}.docx`, docxBlob);
    }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[editor] .docx export failed", err);
    });
}

// ---------- shared helpers ----------

function safeFilename(s: string): string {
    return s.replace(/[^a-z0-9_\-]+/gi, "_").slice(0, 80) || "louis-document";
}

function escapeAttr(s: string): string {
    return s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

// ---------- markdown ----------

/**
 * Tiny HTML -> Markdown for the limited subset we emit. Not a general-purpose
 * converter — keeps things in-house so we don't pull yet another lib.
 */
function htmlToMarkdown(html: string): string {
    if (typeof document === "undefined") return html;
    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    const lines: string[] = [];
    for (const node of Array.from(tmp.childNodes)) {
        lines.push(renderBlock(node));
    }
    return lines.filter(Boolean).join("\n\n").trim() + "\n";
}

function renderBlock(node: Node): string {
    if (!(node instanceof HTMLElement)) {
        return (node.textContent || "").trim();
    }
    const tag = node.tagName.toLowerCase();
    if (/^h([1-6])$/.test(tag)) {
        const lv = parseInt(tag.slice(1), 10);
        return `${"#".repeat(lv)} ${renderInline(node).trim()}`;
    }
    if (tag === "p")          return renderInline(node).trim();
    if (tag === "blockquote") return renderInline(node).trim().split("\n").map((l) => `> ${l}`).join("\n");
    if (tag === "pre")        return "```\n" + (node.textContent || "") + "\n```";
    if (tag === "ul") {
        return Array.from(node.querySelectorAll(":scope > li"))
            .map((li) => `- ${renderInline(li as HTMLElement).trim()}`)
            .join("\n");
    }
    if (tag === "ol") {
        return Array.from(node.querySelectorAll(":scope > li"))
            .map((li, i) => `${i + 1}. ${renderInline(li as HTMLElement).trim()}`)
            .join("\n");
    }
    return renderInline(node).trim();
}

function renderInline(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (!(node instanceof HTMLElement)) return "";
    const inner = Array.from(node.childNodes).map(renderInline).join("");
    const tag = node.tagName.toLowerCase();
    if (tag === "strong" || tag === "b") return `**${inner}**`;
    if (tag === "em"     || tag === "i") return `*${inner}*`;
    if (tag === "u")                     return `<u>${inner}</u>`;
    if (tag === "s" || tag === "strike" || tag === "del") return `~~${inner}~~`;
    if (tag === "code")                  return `\`${inner}\``;
    if (tag === "a") {
        const href = (node as HTMLAnchorElement).getAttribute("href") || "";
        return `[${inner}](${href})`;
    }
    if (tag === "br") return "  \n";
    // Track-change / comment spans pass through as their text payload.
    return inner;
}

// ---------- docx ----------

/** Numbering reference id used by every <ol> block. Single config is enough
 * because docx restarts numbering at each `numbering: { reference }` paragraph
 * stream — and v1 doesn't try to preserve cross-list continuation. */
const NUMBERING_REF = "default-list";

/** Inline formatting accumulator passed down the inline walker. */
type RunStyle = {
    bold?:      boolean;
    italics?:   boolean;
    underline?: boolean;
    strike?:    boolean;
    /** 6-char hex (no `#`). Used for track-change colouring. */
    color?:     string;
    /** Override font family — currently only used for <code>. */
    font?:      string;
};

function htmlToDocxBlocks(html: string): Paragraph[] {
    if (typeof DOMParser === "undefined") {
        // SSR / non-browser fallback — produce a single paragraph with the raw
        // text so we never throw. The export menu only fires from the client
        // so this is defensive belt-and-braces.
        return [new Paragraph({ children: [new TextRun({ text: html })] })];
    }
    const parsed = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, "text/html");
    const body = parsed.body;

    const out: Paragraph[] = [];
    for (const node of Array.from(body.childNodes)) {
        appendBlock(node, out, {});
    }
    return out;
}

function appendBlock(node: Node, out: Paragraph[], inherited: RunStyle): void {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? "";
        if (text.trim().length === 0) return;
        out.push(new Paragraph({ children: [new TextRun({ text, ...runOpts(inherited) })] }));
        return;
    }
    if (!(node instanceof HTMLElement)) return;

    const tag = node.tagName.toLowerCase();
    // Block elements can themselves carry track-change attributes (the editor
    // never emits that today — marks are span-wrappers — but the task spec
    // calls it out, and we want to be robust to future schema changes).
    const blockStyle = mergeStyle(inherited, styleForElement(node));

    if (/^h[1-6]$/.test(tag)) {
        const lv = Math.min(4, Math.max(1, parseInt(tag.slice(1), 10)));
        const heading = ([
            HeadingLevel.HEADING_1,
            HeadingLevel.HEADING_2,
            HeadingLevel.HEADING_3,
            HeadingLevel.HEADING_4,
        ] as const)[lv - 1];
        out.push(new Paragraph({ heading, children: collectInline(node, blockStyle) }));
        return;
    }

    if (tag === "p") {
        out.push(new Paragraph({ children: collectInline(node, blockStyle) }));
        return;
    }

    if (tag === "blockquote") {
        // Treat blockquote as one indented paragraph per child block, or a
        // single indented paragraph if it contains only inline content.
        const blockChildren = Array.from(node.children).filter((el) =>
            /^(p|h[1-6]|ul|ol|blockquote|pre)$/.test(el.tagName.toLowerCase()),
        );
        if (blockChildren.length === 0) {
            out.push(new Paragraph({
                indent:   { left: 720 },
                children: collectInline(node, inherited),
            }));
            return;
        }
        for (const child of blockChildren) {
            const buf: Paragraph[] = [];
            appendBlock(child, buf, inherited);
            // Re-emit each child paragraph with an added left indent. docx
            // doesn't let us mutate IParagraphOptions after construction, so
            // we rebuild — but for v1 we just wrap inline content.
            for (const p of buf) out.push(p);
        }
        return;
    }

    if (tag === "ul") {
        appendList(node, out, inherited, /* ordered */ false, 0);
        return;
    }
    if (tag === "ol") {
        appendList(node, out, inherited, /* ordered */ true, 0);
        return;
    }

    if (tag === "pre") {
        const text = node.textContent ?? "";
        out.push(new Paragraph({
            children: [new TextRun({ text, ...runOpts({ ...inherited, font: "Courier New" }) })],
        }));
        return;
    }

    if (tag === "hr") {
        out.push(new Paragraph({}));
        return;
    }

    if (tag === "br") {
        out.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
        return;
    }

    // Unknown block (e.g. <div>, <section>, or stray inline-at-top-level):
    // descend if it has block children, otherwise wrap inline content.
    const hasBlockChild = Array.from(node.children).some((el) =>
        /^(p|h[1-6]|ul|ol|blockquote|pre|hr|div|section|article)$/.test(el.tagName.toLowerCase()),
    );
    if (hasBlockChild) {
        for (const child of Array.from(node.childNodes)) {
            appendBlock(child, out, mergeStyle(inherited, styleForElement(node)));
        }
    } else {
        const runs = collectInline(node, inherited);
        if (runs.length > 0) {
            out.push(new Paragraph({ children: runs }));
        }
    }
}

function appendList(
    listEl: HTMLElement,
    out: Paragraph[],
    inherited: RunStyle,
    ordered: boolean,
    level: number,
): void {
    const items = Array.from(listEl.children).filter((el) => el.tagName.toLowerCase() === "li");
    for (const li of items) {
        // Split each <li> into inline content + nested lists.
        const inlineNodes: Node[] = [];
        const nestedLists: HTMLElement[] = [];
        for (const child of Array.from(li.childNodes)) {
            if (child instanceof HTMLElement && (child.tagName.toLowerCase() === "ul" || child.tagName.toLowerCase() === "ol")) {
                nestedLists.push(child);
            } else {
                inlineNodes.push(child);
            }
        }

        const runs: ParagraphChild[] = [];
        for (const child of inlineNodes) collectInlineInto(child, inherited, runs);

        const paraOpts = ordered
            ? { numbering: { reference: NUMBERING_REF, level } }
            : { bullet: { level } };

        out.push(new Paragraph({
            ...paraOpts,
            children: runs.length > 0 ? runs : [new TextRun({ text: "" })],
        }));

        for (const nested of nestedLists) {
            const nestedOrdered = nested.tagName.toLowerCase() === "ol";
            appendList(nested, out, inherited, nestedOrdered, Math.min(level + 1, 5));
        }
    }
}

function collectInline(node: Node, inherited: RunStyle): ParagraphChild[] {
    const out: ParagraphChild[] = [];
    for (const child of Array.from(node.childNodes)) {
        collectInlineInto(child, inherited, out);
    }
    return out;
}

function collectInlineInto(node: Node, inherited: RunStyle, out: ParagraphChild[]): void {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? "";
        if (text.length === 0) return;
        out.push(new TextRun({ text, ...runOpts(inherited) }));
        return;
    }
    if (!(node instanceof HTMLElement)) return;

    const tag = node.tagName.toLowerCase();

    if (tag === "br") {
        out.push(new TextRun({ text: "", break: 1 }));
        return;
    }

    if (tag === "a") {
        const href = (node as HTMLAnchorElement).getAttribute("href") ?? "";
        const childStyle = mergeStyle(inherited, styleForElement(node));
        const inner: ParagraphChild[] = [];
        for (const child of Array.from(node.childNodes)) {
            collectInlineInto(child, childStyle, inner);
        }
        if (href) {
            out.push(new ExternalHyperlink({ link: href, children: inner.length > 0 ? inner : [new TextRun({ text: href, ...runOpts(childStyle) })] }));
        } else {
            for (const r of inner) out.push(r);
        }
        return;
    }

    const merged = mergeStyle(inherited, styleForElement(node));
    for (const child of Array.from(node.childNodes)) {
        collectInlineInto(child, merged, out);
    }
}

/**
 * Style additions contributed by a single element. Only formatting that the
 * element directly introduces — inheritance is handled by `mergeStyle`.
 */
function styleForElement(el: HTMLElement): RunStyle {
    const tag = el.tagName.toLowerCase();
    const cls = el.getAttribute("class") ?? "";

    // Track-change marks win over everything else (they re-colour the run).
    const isInsertion = el.hasAttribute("data-track-insertion")
        || el.hasAttribute("data-louis-insertion")
        || cls.includes("louis-track-insertion");
    const isDeletion = el.hasAttribute("data-track-deletion")
        || el.hasAttribute("data-louis-deletion")
        || cls.includes("louis-track-deletion");

    if (isInsertion) return { color: "166534" };
    if (isDeletion)  return { strike: true, color: "B91C1C" };

    // Comment marks: pass through formatting only (no colouring); the
    // underlying text remains intact. See TODO(editor.docx.comments) above.
    if (el.hasAttribute("data-comment-id") || el.hasAttribute("data-louis-comment-id") || cls.includes("louis-comment")) {
        return {};
    }

    switch (tag) {
        case "strong":
        case "b":
            return { bold: true };
        case "em":
        case "i":
            return { italics: true };
        case "u":
            return { underline: true };
        case "s":
        case "strike":
        case "del":
            return { strike: true };
        case "code":
            return { font: "Courier New" };
        default:
            return {};
    }
}

function mergeStyle(base: RunStyle, addition: RunStyle): RunStyle {
    return {
        bold:      addition.bold      ?? base.bold,
        italics:   addition.italics   ?? base.italics,
        underline: addition.underline ?? base.underline,
        strike:    addition.strike    ?? base.strike,
        // Colour and font from the deeper element override the inherited one,
        // which matches how CSS / the editor render these.
        color:     addition.color     ?? base.color,
        font:      addition.font      ?? base.font,
    };
}

/**
 * Translate the accumulator into an `IRunOptions` slice — only emitting keys
 * that are actually set so we never construct a TextRun with `bold: undefined`
 * (docx serialises any present key, which can confuse Word's diffing).
 */
function runOpts(style: RunStyle): RunOpts {
    const opts: RunOpts = {};
    if (style.bold)      opts.bold = true;
    if (style.italics)   opts.italics = true;
    if (style.underline) opts.underline = {};
    if (style.strike)    opts.strike = true;
    if (style.color)     opts.color = style.color;
    if (style.font)      opts.font = style.font;
    return opts;
}
