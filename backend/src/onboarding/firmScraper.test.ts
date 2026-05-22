/**
 * Unit tests for `isPrivateIp` — the pure SSRF-guard predicate exported by
 * firmScraper.  No real network or DNS calls are made here; the function is
 * entirely synchronous and deterministic.
 *
 * Coverage:
 *  - All RFC1918 / loopback / link-local / CGNAT / multicast IPv4 ranges
 *  - IPv6 loopback, link-local, ULA (fc/fd), multicast
 *  - Legitimate public IPv4 and IPv6 addresses (must NOT be blocked)
 *  - Boundary values at range edges
 */

import { describe, it, expect } from "vitest";

import { isPrivateIp } from "./firmScraper";

// ── IPv4 private ranges (expect true — blocked) ────────────────────────────

describe("isPrivateIp — IPv4 private ranges", () => {
  it("blocks 10/8 (RFC1918 Class A)", () => {
    expect(isPrivateIp("10.0.0.0")).toBe(true);
    expect(isPrivateIp("10.255.255.255")).toBe(true);
    expect(isPrivateIp("10.1.2.3")).toBe(true);
  });

  it("blocks 172.16/12 (RFC1918 Class B)", () => {
    expect(isPrivateIp("172.16.0.0")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
    expect(isPrivateIp("172.20.50.1")).toBe(true);
  });

  it("does not block 172.15.x or 172.32.x (outside the /12)", () => {
    // 172.15 is below the range; 172.32 is above.
    expect(isPrivateIp("172.15.0.1")).toBe(false);
    expect(isPrivateIp("172.32.0.1")).toBe(false);
  });

  it("blocks 192.168/16 (RFC1918 Class C)", () => {
    expect(isPrivateIp("192.168.0.0")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("192.168.255.255")).toBe(true);
  });

  it("blocks 127/8 (loopback)", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("127.255.255.255")).toBe(true);
  });

  it("blocks 169.254/16 (link-local / APIPA / cloud metadata)", () => {
    expect(isPrivateIp("169.254.0.0")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true); // AWS metadata endpoint
    expect(isPrivateIp("169.254.255.255")).toBe(true);
  });

  it("blocks 0/8 (this-network)", () => {
    expect(isPrivateIp("0.0.0.0")).toBe(true);
    expect(isPrivateIp("0.1.2.3")).toBe(true);
  });

  it("blocks 100.64/10 (CGNAT shared address space)", () => {
    expect(isPrivateIp("100.64.0.0")).toBe(true);
    expect(isPrivateIp("100.127.255.255")).toBe(true);
    expect(isPrivateIp("100.80.10.1")).toBe(true);
  });

  it("blocks 224+ (multicast and reserved)", () => {
    expect(isPrivateIp("224.0.0.1")).toBe(true);   // multicast
    expect(isPrivateIp("240.0.0.1")).toBe(true);   // reserved
    expect(isPrivateIp("255.255.255.255")).toBe(true);
  });
});

// ── IPv4 public addresses (expect false — allowed) ─────────────────────────

describe("isPrivateIp — IPv4 public addresses", () => {
  it("allows well-known public IPs", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);         // Google DNS
    expect(isPrivateIp("1.1.1.1")).toBe(false);         // Cloudflare DNS
    expect(isPrivateIp("93.184.216.34")).toBe(false);   // example.com
    expect(isPrivateIp("151.101.1.69")).toBe(false);    // fastly CDN
    expect(isPrivateIp("104.21.0.1")).toBe(false);      // Cloudflare Workers range
  });

  it("allows the start of a public /8", () => {
    // 11.x is not 10.x — should be public.
    expect(isPrivateIp("11.0.0.1")).toBe(false);
  });
});

// ── IPv6 private ranges (expect true — blocked) ────────────────────────────

describe("isPrivateIp — IPv6 private/reserved ranges", () => {
  it("blocks ::1 (loopback)", () => {
    expect(isPrivateIp("::1")).toBe(true);
  });

  it("blocks :: (unspecified)", () => {
    expect(isPrivateIp("::")).toBe(true);
  });

  it("blocks fe80:: (link-local)", () => {
    expect(isPrivateIp("fe80::1")).toBe(true);
    expect(isPrivateIp("fe80::dead:beef")).toBe(true);
  });

  it("blocks fc00::/7 (ULA — fc and fd prefixes)", () => {
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("fd12:3456:789a::1")).toBe(true);
  });

  it("blocks ff00::/8 (multicast)", () => {
    expect(isPrivateIp("ff02::1")).toBe(true);
    expect(isPrivateIp("ff0e::1")).toBe(true);
  });
});

// ── IPv6 public addresses (expect false — allowed) ─────────────────────────

describe("isPrivateIp — IPv6 public addresses", () => {
  it("allows global unicast addresses", () => {
    // 2001:4860:4860::8888 = Google DNS over IPv6
    expect(isPrivateIp("2001:4860:4860::8888")).toBe(false);
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false); // Cloudflare
  });
});
