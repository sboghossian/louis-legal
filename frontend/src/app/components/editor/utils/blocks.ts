/**
 * Block <-> HTML conversions for the rich-text editor.
 *
 * The backend speaks `ServerBlock { id, heading?, text?, changed? }`. The
 * editor speaks HTML. These helpers bridge the two.
 */

export interface ServerBlock {
    id: string;
    heading?: string;
    text?: string;
    changed?: boolean;
}

function escapeHTML(s: string): string {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/**
 * Best-effort heading-level detection. Numbered legal headings (`1.`, `2.1`,
 * `Article 5`) default to H2; everything else to H3.
 */
function headingLevel(h: string): 2 | 3 {
    if (/^\s*\d+\.\s/.test(h) || /^Article\s+\d+/i.test(h) || /^Section\s+\d+/i.test(h)) {
        return 2;
    }
    return 3;
}

/**
 * Render ServerBlock[] to a single HTML string suitable for TipTap's
 * `content` prop.
 */
export function blocksToHTML(blocks: ServerBlock[]): string {
    if (!blocks.length) {
        return '<p class="is-empty"></p>';
    }
    const parts: string[] = [];
    for (const b of blocks) {
        if (b.heading) {
            const lv = headingLevel(b.heading);
            parts.push(`<h${lv}>${escapeHTML(b.heading)}</h${lv}>`);
        }
        if (b.text) {
            // Preserve paragraph breaks within a block.
            const paragraphs = b.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
            if (paragraphs.length === 0) {
                parts.push(`<p>${escapeHTML(b.text)}</p>`);
            } else {
                for (const p of paragraphs) {
                    parts.push(`<p>${escapeHTML(p)}</p>`);
                }
            }
        }
    }
    return parts.join("\n");
}

/**
 * Walk an HTMLElement subtree and emit ServerBlock[]. Headings start a new
 * block; following paragraphs/lists/blockquotes append to the current block's
 * text. We do NOT try to round-trip inline formatting back into the block
 * shape — the editor persists the canonical HTML via the PUT
 * /api/doc-workspace/:docId/content endpoint (see docs/EDITOR.md) and only
 * emits blocks so the legacy read paths (review/read/compare views, exports,
 * AI chat context) keep working.
 */
export function htmlToBlocks(html: string): ServerBlock[] {
    if (typeof document === "undefined") return [];
    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    const blocks: ServerBlock[] = [];
    let counter = 0;
    let current: ServerBlock | null = null;

    const flush = () => {
        if (current) {
            blocks.push(current);
            current = null;
        }
    };

    const pushPara = (text: string) => {
        const t = text.trim();
        if (!t) return;
        if (!current) current = { id: `b${++counter}`, text: "" };
        current.text = current.text ? `${current.text}\n\n${t}` : t;
    };

    for (const node of Array.from(tmp.childNodes)) {
        if (!(node instanceof HTMLElement)) {
            // Stray text node at the top level.
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                pushPara(node.textContent);
            }
            continue;
        }
        const tag = node.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag)) {
            flush();
            current = { id: `b${++counter}`, heading: node.textContent?.trim() || "", text: "" };
        } else if (tag === "p" || tag === "blockquote" || tag === "pre") {
            pushPara(node.textContent || "");
        } else if (tag === "ul" || tag === "ol") {
            const items = Array.from(node.querySelectorAll(":scope > li"))
                .map((li, i) => {
                    const bullet = tag === "ol" ? `${i + 1}. ` : "• ";
                    return `${bullet}${(li.textContent || "").trim()}`;
                })
                .join("\n");
            pushPara(items);
        } else {
            pushPara(node.textContent || "");
        }
    }
    flush();
    return blocks;
}
