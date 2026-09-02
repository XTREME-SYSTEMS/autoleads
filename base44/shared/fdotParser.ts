// FDOT Letting Page Parser — structural (non-LLM) parser for FDOT letting pages.
//
// CRITICAL DATE DISAMBIGUATION:
// FDOT letting pages contain multiple date types that must NEVER be mapped interchangeably:
//   - LETTING DATE (the authoritative bid deadline) → bid_due_date
//   - 60-DAY ADVERTISEMENT DATE → advertisement date (60 days before letting)
//   - 30-DAY ADVERTISEMENT DATE → advertisement date (30 days before letting)
//   - MANDATORY PRE-BID MEETING DATE → prebid_meeting_date (NOT the bid deadline)
//   - ADDENDUM DATE → addendum issue date
//   - AWARD DATE → post-bid award date
//
// Only the LETTING DATE is stored as bid_due_date. All other dates are stored in
// structured provenance (description/raw_data) for audit.
//
// This parser replaces the LLM-based extraction that confused pre-bid meeting dates
// (e.g., August 25) with letting dates (e.g., September 30, 2026), causing all FDOT
// canonicals to receive the wrong bid_due_date.

export interface FdotAddendumLink {
  url: string;
  text: string;
}

export interface FdotProposal {
  proposalId: string;
  county: string;
  majorWorkType: string;
  addendumLinks: FdotAddendumLink[];
  proposalUrl: string;
  lettingDate: string;       // YYYY-MM-DD — the authoritative bid/letting deadline
  lettingDateRaw: string;   // Original date text (e.g., "September 30, 2026")
  prebidMeetingDate: string | null;  // YYYY-MM-DD if a pre-bid meeting date is found
  advertisement60DayUrl: string | null;
  advertisement30DayUrl: string | null;
  sourceUrl: string;        // The FDOT letting page URL
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseDateStr(dateStr: string): string | null {
  const match = dateStr.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/i);
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  if (!month) return null;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (!day || !year) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function resolveUrl(url: string, baseUrl: string): string {
  try { return new URL(url, baseUrl).href; } catch { return url; }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

// Check if a date is a letting date header (not an advertisement/pre-bid date).
// FDOT pages use accordion headers where letting dates appear inside <a> tags.
// A letting date is followed by "Important Letting Documents" and a proposal table
// within a reasonable range. Advertisement/pre-bid dates are not.
function isLettingDateHeader(html: string, datePos: number): boolean {
  const before = html.slice(Math.max(0, datePos - 200), datePos).toLowerCase();
  // Use a larger range after the date to find the proposal table
  const after = html.slice(datePos, datePos + 3000).toLowerCase();

  // Exclude advertisement/pre-bid dates
  if (before.includes('60 day advertisement') || before.includes('30 day advertisement')) return false;
  if (before.includes('pre-bid') || before.includes('prebid')) return false;

  // A letting date is followed by "Important Letting Documents" or a proposal table
  if (after.includes('important letting documents') || after.includes('proposal id')) return true;

  return false;
}

// Extract pre-bid meeting date from the "Important Letting Documents" section
function extractPrebidDate(sectionHtml: string): string | null {
  // Look for "Mandatory Pre-Bid Meeting" followed by a date
  const prebidMatch = sectionHtml.match(/(?:mandatory\s+pre-?bid|pre-?bid\s+meeting)[^<]*?(\w+\s+\d{1,2},\s+\d{4})/i);
  if (prebidMatch) {
    const parsed = parseDateStr(prebidMatch[1]);
    if (parsed) return parsed;
  }
  // Also check for a date link near "Pre-Bid Meeting Attendance"
  const attendanceMatch = sectionHtml.match(/pre-?bid\s+meeting\s+attendance[^<]*?<a[^>]*>([^<]+)<\/a>/i);
  if (attendanceMatch) {
    const parsed = parseDateStr(attendanceMatch[1]);
    if (parsed) return parsed;
  }
  return null;
}

// Extract advertisement URLs from the "Important Letting Documents" section
function extractAdvertisementUrls(sectionHtml: string, baseUrl: string): { adv60: string | null; adv30: string | null } {
  let adv60: string | null = null;
  let adv30: string | null = null;

  const adv60Match = sectionHtml.match(/60\s*day\s*advertisement[^<]*<a[^>]*href=["']([^"']+)["']/i);
  if (adv60Match) adv60 = resolveUrl(adv60Match[1], baseUrl);

  const adv30Match = sectionHtml.match(/30\s*day\s*advertisement[^<]*<a[^>]*href=["']([^"']+)["']/i);
  if (adv30Match) adv30 = resolveUrl(adv30Match[1], baseUrl);

  return { adv60, adv30 };
}

export function parseFdotsLettingPage(html: string, baseUrl: string): FdotProposal[] {
  if (!html || html.length < 500) return [];

  // Strip scripts and styles
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Find all date occurrences with positions
  const dateRegex = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/gi;
  const allDates: { date: string; raw: string; pos: number; isLettingHeader: boolean }[] = [];
  let match;
  while ((match = dateRegex.exec(cleaned)) !== null) {
    const raw = `${match[1]} ${match[2]}, ${match[3]}`;
    const parsed = parseDateStr(raw);
    if (parsed) {
      allDates.push({
        date: parsed,
        raw,
        pos: match.index,
        isLettingHeader: isLettingDateHeader(cleaned, match.index),
      });
    }
  }

  // Filter to letting date headers only
  const lettingDates = allDates.filter(d => d.isLettingHeader);
  if (lettingDates.length === 0) return [];

  // Find all tables and their positions
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const proposals: FdotProposal[] = [];

  while ((match = tableRegex.exec(cleaned)) !== null) {
    const tableContent = match[1];
    const tablePos = match.index;

    // Check if this is a proposal table (has "Proposal ID" header)
    if (!/Proposal\s*ID/i.test(tableContent)) continue;

    // Find the most recent letting date before this table
    let tableDate: { date: string; raw: string; pos: number } | null = null;
    for (const d of lettingDates) {
      if (d.pos < tablePos) {
        tableDate = { date: d.date, raw: d.raw, pos: d.pos };
      } else {
        break;
      }
    }
    if (!tableDate) continue;

    // Extract the section between the letting date and the table (for pre-bid and advertisement info)
    const sectionHtml = cleaned.slice(tableDate.pos, tablePos);
    const prebidDate = extractPrebidDate(sectionHtml);
    const { adv60, adv30 } = extractAdvertisementUrls(sectionHtml, baseUrl);

    // Parse rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const row = rowMatch[1];

      // Skip header rows
      if (/<th/i.test(row) && /Proposal\s*ID/i.test(row)) continue;

      // Extract all cells with their HTML
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cellsHtml: string[] = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        cellsHtml.push(cellMatch[1]);
      }

      if (cellsHtml.length < 3) continue;

      // Extract proposal ID and URL from first cell
      const firstCell = cellsHtml[0];
      const proposalLink = firstCell.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const proposalId = stripTags(proposalLink ? proposalLink[2] : firstCell);

      // Validate proposal ID format (T6398, T2A56, E4Y08, etc.)
      if (!proposalId || !/^[A-Z]\d+[A-Z]*\d*$/i.test(proposalId)) continue;

      const proposalUrl = proposalLink ? resolveUrl(proposalLink[1], baseUrl) : '';

      // Extract county (2nd cell)
      const county = stripTags(cellsHtml[1]);

      // Extract major work type (3rd cell)
      const majorWorkType = stripTags(cellsHtml[2]);

      // Extract addendum links (4th cell if present)
      const addendumLinks: FdotAddendumLink[] = [];
      if (cellsHtml[3]) {
        const addLinkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let addMatch;
        while ((addMatch = addLinkRegex.exec(cellsHtml[3])) !== null) {
          addendumLinks.push({
            url: resolveUrl(addMatch[1], baseUrl),
            text: stripTags(addMatch[2]),
          });
        }
      }

      proposals.push({
        proposalId,
        county,
        majorWorkType,
        addendumLinks,
        proposalUrl,
        lettingDate: tableDate.date,
        lettingDateRaw: tableDate.raw,
        prebidMeetingDate: prebidDate,
        advertisement60DayUrl: adv60,
        advertisement30DayUrl: adv30,
        sourceUrl: baseUrl,
      });
    }
  }

  return proposals;
}