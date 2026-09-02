// Categorizes a project into one of three lead tracks:
//   residential  — cash jobs, close fast, deposit up front + balance on completion (Priority 1)
//   commercial   — net terms, paid when the project funds / owner pays
//   government   — progress draws, long funding cycle
//
// Used by the Lead Feed to separate opportunities by track.

export const LEAD_CATEGORIES = [
  {
    key: 'residential',
    label: 'Residential',
    priority: 1,
    icon: '💵',
    closeSpeed: 'Closes fast',
    payment: 'Cash job · Deposit up front · Balance on completion',
    blurb: 'Fast cash. Close the deal, collect a deposit, finish the work, get paid.',
  },
  {
    key: 'commercial',
    label: 'Commercial',
    priority: 2,
    icon: '🏢',
    closeSpeed: 'Longer cycle',
    payment: 'Net terms · Paid when the project funds / owner pays',
    blurb: 'Bigger jobs, slower money. You get paid when they get paid.',
  },
  {
    key: 'gov',
    label: 'Government',
    priority: 3,
    icon: '🏛️',
    closeSpeed: 'Slowest',
    payment: 'Progress draws · Long funding cycle · Paid on award',
    blurb: 'Public work. Long lead time, paid through the procurement cycle.',
  },
];

const GOV_KEYWORDS = [
  'city of', 'county', 'state of', 'department', 'district', 'authority',
  'agency', 'board', 'commission', 'school', 'university', 'college', 'dot',
  'fdot', 'port of', 'transit', 'water', 'wastewater', 'public works',
  'town of', 'village of', 'borough', 'municipal', 'government', 'federal',
  'usace', 'army corps', 'naval', 'air force', 'base', 'courthouse', 'jail',
  'prison', 'library', 'park district', 'housing authority', 'utility district',
  'reclamation', 'school board', 'board of education',
];

const RES_TITLE_RE = /\b(home|house|residential|condo|apartment|townhome|townhouse|duplex|driveway|patio|pool deck|garage floor|basement|garage|porch|deck|backyard|shed)\b/;

export function categorizeProject(p = {}) {
  const pt = (p.project_type || '').toLowerCase();
  const authority = (p.authority || '').toLowerCase();
  const jurisdiction = (p.jurisdiction || '').toLowerCase();
  const title = (p.title || '').toLowerCase();
  const trade = (p.trade || '').toLowerCase();

  if (pt.includes('municipal') || pt.includes('government') || pt.includes('federal')) return 'gov';
  if (GOV_KEYWORDS.some((k) => authority.includes(k) || jurisdiction.includes(k))) return 'gov';

  if (pt.includes('residential') || pt.includes('home') || trade.includes('residential')) return 'residential';
  if (RES_TITLE_RE.test(title)) return 'residential';

  return 'commercial';
}

export function categoryMeta(key) {
  return LEAD_CATEGORIES.find((c) => c.key === key) || LEAD_CATEGORIES[0];
}