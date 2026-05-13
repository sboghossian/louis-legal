/**
 * Export helpers: download the current document as .md, .html, or .docx.
 *
 * - .html: editor HTML wrapped in a minimal printable shell.
 * - .md:   naive HTML->Markdown for the headings/paragraphs/lists/blockquotes
 *          we actually emit. Inline marks (bold/italic/underline) are
 *          preserved; tracked-change marks become asterisks/strikethrough.
 * - .docx: TODO — use the `docx` npm package (already a dep) to build a real
 *          .docx. v1 falls back to a .docx-named .html blob with a console
 *          warning so the user can still drop it into Word, but a proper
 *          paragraph-by-paragraph builder is the planned next step.
 */
import type { Editor } from "@tiptap/react";

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
 * TODO(editor.docx): build a real .docx using the `docx` package. For now,
 * emit a .docx file containing the HTML body — Word will open it, and the
 * user will see a one-time "convert?" prompt. This is a working stub, not
 * the final implementation.
 */
export function exportDocx(editor: Editor, title: string) {
    // eslint-disable-next-line no-console
    console.warn("[editor] .docx export is a stub — emitting HTML-payload .docx. Real builder TODO.");
    const body = editor.getHTML();
    const shell = `<html><head><meta charset="utf-8"/></head><body>${body}</body></html>`;
    downloadBlob(`${safeFilename(title)}.docx`, new Blob([shell], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
}

// ---------- helpers ----------

function safeFilename(s: string): string {
    return s.replace(/[^a-z0-9_\-]+/gi, "_").slice(0, 80) || "louis-document";
}

function escapeAttr(s: string): string {
    return s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

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
