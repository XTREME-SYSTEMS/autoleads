// Trade relevance engine for AUTOLEADS.
// Evaluates whether an opportunity matches the organization's trade/scope.
//
// An opportunity must pass: LOCATION + TRADE + STATUS + FRESHNESS
// before entering the high-priority feed.

export type TradeMatchResult =
  | 'PRIMARY_MATCH'
  | 'SECONDARY_MATCH'
  | 'WEAK_MATCH'
  | 'NO_MATCH'
  | 'EXCLUDED_SCOPE';

export interface TradeMatchInput {
  title: string;
  description?: string;
  specs?: string;
  trade?: string;
  project_type?: string;
}

export interface OrgTradeConfig {
  primary_trades: string[];
  secondary_trades: string[];
  excluded_scopes: string[];
  keywords: string[];
  aliases: Record<string, string[]>; // scope -> aliases
}

export interface TradeMatchOutput {
  result: TradeMatchResult;
  matched_keywords: string[];
  matched_scope?: string;
  confidence: number;
  explanation: string;
}

// Normalize text for matching
function normalize(text: string): string {
  return (text || '').toLowerCase().trim();
}

// Simple stemming for trade keyword matching
function stem(word: string): string {
  return word
    .replace(/(ing|ings)$/g, '')
    .replace(/(s|es)$/g, '')
    .replace(/(ation|ations)$/g, 'at')
    .replace(/(tion|tions)$/g, 't');
}

// Check if any keyword appears in the haystack (with stemming for robustness)
function matchKeywords(haystack: string, keywords: string[]): string[] {
  const matched: string[] = [];
  const hayWords = haystack.split(' ').filter(Boolean).map(stem);
  const haySet = new Set(hayWords);
  for (const kw of keywords) {
    const k = normalize(kw);
    if (!k) continue;
    // Direct substring match first (handles multi-word keywords like "epoxy flooring")
    if (haystack.includes(k)) { matched.push(kw); continue; }
    // Stemmed word-level match (handles "roofing" matching "roof")
    const kwStemmed = stem(k);
    if (haySet.has(kwStemmed)) { matched.push(kw); continue; }
    // Check if any stemmed keyword word matches any stemmed haystack word
    const kwWords = k.split(' ').filter(Boolean).map(stem);
    if (kwWords.length > 0 && kwWords.every(w => haySet.has(w))) { matched.push(kw); continue; }
  }
  return matched;
}

export function evaluateTradeMatch(
  input: TradeMatchInput,
  config: OrgTradeConfig
): TradeMatchOutput {
  const haystack = normalize(`${input.title} ${input.description || ''} ${input.specs || ''} ${input.trade || ''} ${input.project_type || ''}`);

  // Check excluded scopes first — exclusion overrides everything
  const excluded = matchKeywords(haystack, config.excluded_scopes || []);
  if (excluded.length > 0) {
    return {
      result: 'EXCLUDED_SCOPE',
      matched_keywords: excluded,
      confidence: 0.95,
      explanation: `Opportunity matches excluded scope: ${excluded.join(', ')}`,
    };
  }

  // Check primary trades
  const primaryMatched = matchKeywords(haystack, config.primary_trades || []);
  if (primaryMatched.length > 0) {
    return {
      result: 'PRIMARY_MATCH',
      matched_keywords: primaryMatched,
      matched_scope: primaryMatched[0],
      confidence: 0.9,
      explanation: `Primary trade match: ${primaryMatched.join(', ')}`,
    };
  }

  // Check aliases for primary trades
  for (const [scope, aliases] of Object.entries(config.aliases || {})) {
    if ((config.primary_trades || []).some(t => normalize(t) === normalize(scope))) {
      const aliasMatched = matchKeywords(haystack, aliases || []);
      if (aliasMatched.length > 0) {
        return {
          result: 'PRIMARY_MATCH',
          matched_keywords: aliasMatched,
          matched_scope: scope,
          confidence: 0.85,
          explanation: `Primary trade match via alias: ${aliasMatched.join(', ')} → ${scope}`,
        };
      }
    }
  }

  // Check secondary trades
  const secondaryMatched = matchKeywords(haystack, config.secondary_trades || []);
  if (secondaryMatched.length > 0) {
    return {
      result: 'SECONDARY_MATCH',
      matched_keywords: secondaryMatched,
      matched_scope: secondaryMatched[0],
      confidence: 0.7,
      explanation: `Secondary trade match: ${secondaryMatched.join(', ')}`,
    };
  }

  // Check general keywords
  const keywordMatched = matchKeywords(haystack, config.keywords || []);
  if (keywordMatched.length > 0) {
    return {
      result: 'WEAK_MATCH',
      matched_keywords: keywordMatched,
      confidence: 0.5,
      explanation: `Weak keyword match: ${keywordMatched.join(', ')}`,
    };
  }

  return {
    result: 'NO_MATCH',
    matched_keywords: [],
    confidence: 0.2,
    explanation: 'No trade keywords matched the opportunity text.',
  };
}

// Deterministic CompanyProfile selection — never use (companies || [])[0].
// Selection rule: organization_id + production data class + canonical contractor
// identity (not a source/permit/portal record) + explicit contractor role.
// Source/permit records like "Orlando Building Permits" must never become the
// organization's trade identity.
export function selectCanonicalCompanyProfile(companies: any[]): any | null {
  if (!companies || companies.length === 0) return null;

  // 1. Filter to production data class
  const production = companies.filter(c => c.data_class !== 'NON_PRODUCTION_EXAMPLE');
  if (production.length === 0) return null;

  // 2. Exclude source/permit/portal records (not contractor profiles)
  const sourcePatterns = ['permit', 'portal', 'source', 'city of', 'county of', 'department', 'agency', 'feed'];
  const contractorProfiles = production.filter(c => {
    const name = (c.name || '').toLowerCase();
    return !sourcePatterns.some(p => name.includes(p));
  });

  if (contractorProfiles.length === 0) return null;
  if (contractorProfiles.length === 1) return contractorProfiles[0];

  // 3. Score by contractor trade specificity and business indicators
  const contractorTradeKeywords = [
    'epoxy', 'concrete', 'coating', 'polishing', 'flooring', 'resinous',
    'polyurea', 'polyaspartic', 'polished', 'floor', 'construction',
    'contractor', 'builder', 'remodeling', 'renovation',
  ];
  const scored = contractorProfiles.map(c => {
    const trade = (c.trade || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    let score = 0;
    for (const kw of contractorTradeKeywords) {
      if (trade.includes(kw)) score += 2;
      if (name.includes(kw)) score += 1;
    }
    if (c.website) score += 1;
    if (c.phone) score += 1;
    if (c.license_number) score += 1;
    return { company: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].company;
}

// Load org trade config from CompanyProfile + ScopeSystems.
// This is org-scoped to prevent cross-tenant keyword leakage.
export async function loadOrgTradeConfig(client: any, orgId: string): Promise<OrgTradeConfig> {
  const config: OrgTradeConfig = {
    primary_trades: [],
    secondary_trades: [],
    excluded_scopes: [],
    keywords: [],
    aliases: {},
  };

  try {
    const companies = await client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []);
    const company = selectCanonicalCompanyProfile(companies);
    if (company?.trade) {
      const trades = company.trade.split(',').map((t: string) => t.trim()).filter(Boolean);
      config.primary_trades = trades;
      config.keywords = trades.map((t: string) => t.toLowerCase());
    }
  } catch {}

  try {
    const systems = await client.entities.ScopeSystem.list().catch(() => []);
    for (const s of systems || []) {
      if (s.scope) {
        const scopeLower = String(s.scope).toLowerCase();
        if (!config.keywords.includes(scopeLower)) config.keywords.push(scopeLower);
        if (Array.isArray(s.aliases)) {
          config.aliases[s.scope] = s.aliases.map((a: string) => String(a).toLowerCase());
          config.keywords.push(...s.aliases.map((a: string) => String(a).toLowerCase()));
        }
      }
    }
  } catch {}

  return config;
}

// Returns true if the trade match qualifies the opportunity for the high-priority feed.
export function isTradeEligible(match: TradeMatchOutput): boolean {
  return match.result === 'PRIMARY_MATCH' || match.result === 'SECONDARY_MATCH';
}