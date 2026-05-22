/**
 * Firm Scraper — Fetch and clean HTML from a public law-firm website.
 *
 * Security model (ported from Lavern, Apache-2.0,
 * `src/api/agent-builder/firm-scraper.ts`):
 *  - HTTPS-only entry URLs; non-https redirects are rejected.
 *  - All resolved IP addresses checked against private/link-local/reserved
 *    ranges before every fetch hop (SSRF protection).
 *  - Redirects followed manually (up to 3 hops) so each hop is re-validated.
 *  - 5 MB response cap; stream cancelled immediately on breach.
 *  - 12 s per-fetch AbortController timeout.
 *  - Maximum 3 pages per call: root + up to 2 sniffed same-origin links.
 *  - nav/script/style/header/footer/form/svg elements stripped to clean text.
 *  - Identifying User-Agent.
 *
 * Node stdlib only — `node:dns/promises` for DNS resolution, `node:net` for
 * IP family detection. No third-party HTTP client.
 *
 * Adapted from Lavern (Apache-2.0).  Provider coupling, cross-provider imports,
 * and non-essential logging removed; pure-function `isPrivateIp` extracted and
 * exported for unit testing without network access.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { ScrapeError } from "./types";
import type { ScrapeResult, ScrapedPage } from "./types";

// ── Constants ──────────────────────────────────────────────────────────────

const USER_AGENT = "LouisBot/1.0 (+https://louis.legal/bot)";

/** Hard cap on response body size per fetch (bytes). */
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Per-fetch network timeout. */
const FETCH_TIMEOUT_MS = 12_000;

/**
 * Maximum pages scraped per call: root page + at most 2 sniffed follow links.
 * Follows Lavern's SSRF-limiting convention.
 */
const MAX_PAGES = 3;

/** Minimum total characters across all pages before a `too_thin` error fires. */
const MIN_USEFUL_CONTENT_CHARS = 400;

/**
 * Substrings we match against <a href> pathnames to identify team/about/practice
 * pages worth following.  Same list as Lavern to maintain parity.
 */
const FOLLOW_KEYWORDS: readonly string[] = [
  "/about",
  "/team",
  "/people",
  "/partners",
  "/attorneys",
  "/lawyers",
  "/practice",
  "/expertise",
  "/services",
  "/firm",
];

// ── SSRF IP guard ──────────────────────────────────────────────────────────

/**
 * Returns `true` when `ip` falls inside a private, link-local, loopback,
 * or otherwise reserved address range that MUST NOT be reached from a
 * server-side fetch (SSRF risk).
 *
 * IPv4 ranges blocked:
 *  - 10.0.0.0/8      (RFC1918 Class A private)
 *  - 172.16.0.0/12   (RFC1918 Class B private)
 *  - 192.168.0.0/16  (RFC1918 Class C private)
 *  - 127.0.0.0/8     (loopback)
 *  - 169.254.0.0/16  (link-local / APIPA / cloud metadata endpoints)
 *  - 0.0.0.0/8       (this-network)
 *  - 100.64.0.0/10   (CGNAT shared address space)
 *  - 224.0.0.0/4+    (multicast and reserved)
 *
 * IPv6 ranges blocked:
 *  - ::1              (loopback)
 *  - ::               (unspecified)
 *  - fe80::/10        (link-local)
 *  - fc00::/7         (Unique Local — fc and fd prefixes)
 *  - ff00::/8         (multicast)
 *
 * Source: Lavern `isPublicIp` (Apache-2.0), inverted to `isPrivateIp` for
 * clearer semantics when used as a guard predicate.
 *
 * @param ip - A string produced by `node:net`'s `isIP` check (already
 *   known to be a valid IP) or returned by `node:dns/promises`.
 * @returns `true` if the IP is private/reserved (i.e. should be blocked).
 */
export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);

  if (family === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;                          // 10/8
    if (a === 127) return true;                         // 127/8 loopback
    if (a === 0) return true;                           // 0/8 this-network
    if (a === 169 && b === 254) return true;            // 169.254/16 link-local
    if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16/12 private
    if (a === 192 && b === 168) return true;            // 192.168/16 private
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
    if (a >= 224) return true;                          // 224+ multicast/reserved
    return false;
  }

  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;    // loopback / unspecified
    if (lower.startsWith("fe80:")) return true;            // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
    if (lower.startsWith("ff")) return true;               // multicast ff00::/8
    return false;
  }

  // Not a valid IP string — treat as unsafe.
  return true;
}

// ── URL validation ─────────────────────────────────────────────────────────

/**
 * Parse and validate the caller-supplied URL.
 * Only `https:` URLs pass; anything else raises `ScrapeError('invalid_url')`.
 */
function parseHttpsUrl(input: string): URL {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    throw new ScrapeError("invalid_url", `Not a valid URL: ${input}`);
  }
  if (u.protocol !== "https:") {
    throw new ScrapeError("invalid_url", "Only https:// URLs are allowed.");
  }
  return u;
}

/**
 * Resolve all DNS addresses for `u.hostname` and reject the request if any
 * resolved address is private.  If the hostname is already a raw IP, validate
 * it directly without a DNS round-trip.
 *
 * Throws `ScrapeError('blocked_target')` on any failure.
 */
async function assertPublicHost(u: URL): Promise<void> {
  const host = u.hostname;

  if (isIP(host)) {
    // Literal IP in the URL — no DNS needed.
    if (isPrivateIp(host)) {
      throw new ScrapeError("blocked_target", `URL points to a private IP address: ${host}`);
    }
    return;
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new ScrapeError("blocked_target", `Cannot resolve host: ${host}`);
  }

  if (addresses.length === 0) {
    throw new ScrapeError("blocked_target", `No addresses found for host: ${host}`);
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new ScrapeError(
        "blocked_target",
        `Host ${host} resolves to a private IP address: ${address}`,
      );
    }
  }
}

// ── Fetch with size cap and redirect re-validation ─────────────────────────

/**
 * Fetch `u` as HTML, enforcing:
 *  - 12 s abort timeout
 *  - 5 MB body cap (stream cancelled on breach)
 *  - Up to 3 redirect hops, each hop re-validated via `assertPublicHost`
 *    (prevents open-redirect SSRF where a public host 302s to 169.254.x.x)
 *  - Only `text/html`, `text/xml`, `application/xhtml+xml`, `text/*` accepted
 *
 * Returns the decoded body string.
 */
async function fetchWithLimit(u: URL): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const MAX_HOPS = 3;
    let current = u;
    let res: Response | null = null;

    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const r = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual", // We follow redirects ourselves to re-validate each hop.
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          "accept": "text/html,application/xhtml+xml,text/*",
          "accept-language": "en-US,en;q=0.8",
        },
      });

      // 3xx — manually follow and re-validate the redirect target.
      if (r.status >= 300 && r.status < 400) {
        const location = r.headers.get("location");
        if (!location) {
          throw new ScrapeError("fetch_failed", "Redirect response missing Location header.");
        }
        if (hop >= MAX_HOPS) {
          throw new ScrapeError("fetch_failed", `Too many redirects (>${MAX_HOPS}).`);
        }
        let next: URL;
        try {
          next = new URL(location, current);
        } catch {
          throw new ScrapeError("fetch_failed", "Malformed redirect Location header.");
        }
        // Only http/https redirect schemes are acceptable.
        if (next.protocol !== "http:" && next.protocol !== "https:") {
          throw new ScrapeError(
            "blocked_target",
            `Redirect to non-HTTP scheme: ${next.protocol}`,
          );
        }
        // Re-validate the redirect target before following.
        await assertPublicHost(next);
        current = next;
        continue;
      }

      res = r;
      break;
    }

    if (!res) {
      throw new ScrapeError("fetch_failed", "Redirect loop exited without a final response.");
    }
    if (!res.ok) {
      throw new ScrapeError(
        "fetch_failed",
        `${current.hostname} returned HTTP ${res.status}.`,
      );
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("xml") && !ct.includes("text/")) {
      throw new ScrapeError("fetch_failed", `Unexpected Content-Type: ${ct}`);
    }

    if (!res.body) {
      throw new ScrapeError("fetch_failed", "Empty response body.");
    }

    // Stream body, enforcing the 5 MB cap.
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let total = 0;
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        try { reader.cancel(); } catch { /* ignore cancellation errors */ }
        throw new ScrapeError("fetch_failed", `Response exceeded ${MAX_BYTES} byte cap.`);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode(); // flush final bytes

    return text;
  } catch (err) {
    if (err instanceof ScrapeError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new ScrapeError("fetch_failed", `Fetch timed out after ${FETCH_TIMEOUT_MS} ms.`);
    }
    throw new ScrapeError("fetch_failed", (err as Error).message || "Fetch failed.");
  } finally {
    clearTimeout(timer);
  }
}

// ── HTML cleaning ──────────────────────────────────────────────────────────

/** Decode the most common HTML entities so LLM input is readable text. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ");
}

/** Extract the page title from raw HTML, decoded and trimmed to 200 chars. */
function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return "";
  return decodeEntities(m[1]).replace(/\s+/g, " ").trim().slice(0, 200);
}

/**
 * Strip navigation chrome and return clean prose text suitable for LLM input.
 *
 * Elements removed entirely: script, style, noscript, svg, nav, footer,
 * header, form — these are reliably noise in a legal-site scrape.
 * Remaining tags collapsed to whitespace; entities decoded; runs of
 * whitespace compressed to single spaces.
 *
 * This is a best-effort regex pass, not a full HTML parser — adequate for
 * LLM consumption and matches Lavern's approach.
 */
function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  s = s.replace(/<header[\s\S]*?<\/header>/gi, " ");
  s = s.replace(/<form[\s\S]*?<\/form>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ── Link discovery ─────────────────────────────────────────────────────────

/**
 * Extract same-origin https links from `html` whose pathname matches one of
 * the `FOLLOW_KEYWORDS` (about, team, attorneys, practice, etc.).  Shorter
 * paths ranked first (root-level section pages preferred over deep attorney
 * detail pages).  Anchors, mailto:, and tel: hrefs are skipped.
 */
function sniffFollowLinks(html: string, base: URL): URL[] {
  const seen = new Set<string>();
  const re = /<a\s[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null) {
    const raw = m[1] ?? m[2];
    if (!raw) continue;
    if (raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;

    let resolved: URL;
    try {
      resolved = new URL(raw, base);
    } catch {
      continue;
    }

    if (resolved.protocol !== "https:") continue;
    if (resolved.hostname !== base.hostname) continue;

    const path = resolved.pathname.toLowerCase();
    if (path === "/" || path === "") continue;

    if (FOLLOW_KEYWORDS.some((kw) => path.includes(kw))) {
      seen.add(resolved.toString());
    }
  }

  return Array.from(seen)
    .map((h) => new URL(h))
    .sort((a, b) => a.pathname.length - b.pathname.length);
}

// ── Public entry point ─────────────────────────────────────────────────────

/**
 * Scrape a public law-firm website and return clean text across up to 3 pages.
 *
 * The call fetches the root URL, extracts links to team/about/practice pages
 * (same-origin, https-only), and follows up to 2 of them.  All DNS lookups and
 * redirect hops are validated against the SSRF IP blocklist before any network
 * connection is made.
 *
 * @param url   - The firm's root website URL.  Must be https.
 * @param onLog - Optional progress callback; receives human-readable status
 *   strings as each page is fetched.  Safe to ignore in production.
 * @returns A `ScrapeResult` with all fetched pages and their combined text.
 * @throws `ScrapeError` with `.code`:
 *   - `"invalid_url"`     — URL is malformed or not https.
 *   - `"blocked_target"` — URL resolves to a private/reserved IP.
 *   - `"fetch_failed"`   — Network error, timeout, HTTP error, or size cap hit.
 *   - `"too_thin"`       — Total text below `MIN_USEFUL_CONTENT_CHARS`
 *     (JS-rendered or bot-blocked site).
 */
export async function scrapeFirmSite(
  url: string,
  onLog?: (msg: string) => void,
): Promise<ScrapeResult> {
  const root = parseHttpsUrl(url);
  await assertPublicHost(root);

  onLog?.(`Fetching root: ${root.hostname}…`);
  const rootHtml = await fetchWithLimit(root);
  const rootTitle = extractTitle(rootHtml);
  const rootText = htmlToText(rootHtml);

  const pages: ScrapedPage[] = [
    { url: root.toString(), title: rootTitle, text: rootText },
  ];

  // Discover follow links from root HTML, then take up to MAX_PAGES - 1 of them.
  const candidates = sniffFollowLinks(rootHtml, root).slice(0, MAX_PAGES - 1);

  for (const link of candidates) {
    // Re-validate each follow-link target — the root may have linked to a CDN
    // or partner domain that slipped through hostname matching, and DNS-rebinding
    // could occur between the root fetch and here.
    try {
      await assertPublicHost(link);
      onLog?.(`Following: ${link.pathname}…`);
      const html = await fetchWithLimit(link);
      pages.push({
        url: link.toString(),
        title: extractTitle(html),
        text: htmlToText(html),
      });
    } catch {
      // Non-fatal — skip this follow link and continue.
    }
  }

  const combinedChars = pages.reduce((n, p) => n + p.text.length, 0);
  if (combinedChars < MIN_USEFUL_CONTENT_CHARS) {
    throw new ScrapeError(
      "too_thin",
      `Scraped content is too thin (${combinedChars} chars). The site may be JS-rendered or bot-blocked.`,
    );
  }

  return {
    rootUrl: root.toString(),
    siteTitle: rootTitle,
    pages,
    combinedChars,
  };
}

// Re-export the error class so consumers can import from this file directly
// without needing to reach into types.
export { ScrapeError } from "./types";
export type { ScrapeResult, ScrapedPage } from "./types";
