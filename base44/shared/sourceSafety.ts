// Source safety invariant for AUTOLEADS.
// Detects synthetic/non-production source URLs that must never qualify as production Hot Leads.
//
// SAFE PATTERN REGISTRY — only these exact patterns are blocked.
// Legitimate domains containing ordinary words like "test" are NOT blocked.
// Only reserved TLDs (.test, .example, .invalid, .localhost), example.* domains,
// loopback IPs, and explicit synthetic fixture prefixes are blocked.

export interface SourceSafetyResult {
  isSynthetic: boolean;
  pattern: string;
  reason: string;
}

// Exact synthetic patterns — reserved TLDs, example domains, localhost, loopback
const SYNTHETIC_PATTERNS: { pattern: RegExp; reason: string }[] = [
  // .test TLD (RFC 6761 reserved) — e.g., example-betaconcreteinc.test
  { pattern: /\.test(?:\/|$|\?|#)/i, reason: '.test TLD is a reserved non-production domain' },
  // .example TLD (RFC 6761 reserved)
  { pattern: /\.example(?:\/|$|\?|#)/i, reason: '.example TLD is a reserved non-production domain' },
  // .invalid TLD (RFC 6761 reserved)
  { pattern: /\.invalid(?:\/|$|\?|#)/i, reason: '.invalid TLD is a reserved non-production domain' },
  // .localhost TLD
  { pattern: /\.localhost(?:[:\/?]|$)/i, reason: '.localhost is a non-production source' },
  // example.com / example.org / example.net (RFC 2606 reserved) — including subdomains
  { pattern: /(?:^|\.)(?:example\.(?:com|org|net))(?:[:\/?]|$)/i, reason: 'example.* domain is a reserved non-production domain' },
  // localhost (any port)
  { pattern: /^https?:\/\/localhost(?:[:\/?]|$)/i, reason: 'localhost is a non-production source' },
  // loopback IPs
  { pattern: /^https?:\/\/(?:127\.0\.0\.1|0\.0\.0\.0)(?:[:\/?]|$)/i, reason: 'loopback IP is a non-production source' },
  // synthetic fixture patterns — "example-" prefix in hostname (e.g., example-betaconcreteinc.test)
  { pattern: /^https?:\/\/example-/i, reason: 'synthetic example fixture URL' },
];

export function isSyntheticSource(url: string | undefined | null): SourceSafetyResult {
  if (!url || typeof url !== 'string') return { isSynthetic: false, pattern: '', reason: '' };
  const normalized = url.toLowerCase().trim();
  for (const { pattern, reason } of SYNTHETIC_PATTERNS) {
    if (pattern.test(normalized)) {
      return { isSynthetic: true, pattern: pattern.source, reason };
    }
  }
  return { isSynthetic: false, pattern: '', reason: '' };
}

// Batch check — returns the first synthetic result if ANY URL is synthetic
export function hasAnySyntheticSource(urls: (string | undefined | null)[]): SourceSafetyResult {
  for (const url of urls) {
    const result = isSyntheticSource(url);
    if (result.isSynthetic) return result;
  }
  return { isSynthetic: false, pattern: '', reason: '' };
}