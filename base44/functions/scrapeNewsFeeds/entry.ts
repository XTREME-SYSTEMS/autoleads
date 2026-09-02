import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createProject, updateSourceStatus, findSourceByName } from '../../shared/scrapeUtils.ts';
import { authenticate } from '../../shared/internalAuth.ts';

// scrapeNewsFeeds — aggregates construction industry RSS feeds for early-stage
// project leads. Construction publications report on planned projects, groundbreakings,
// and contract awards before they hit public bid portals.

interface NewsFeed {
  name: string;
  url: string;
  jurisdiction: string;
}

const NEWS_FEEDS: NewsFeed[] = [
  {
    name: 'ENR Construction News',
    url: 'https://www.enr.com/rss.xml',
    jurisdiction: 'National',
  },
  {
    name: 'Construction Dive',
    url: 'https://www.constructiondive.com/feeds/news/',
    jurisdiction: 'National',
  },
  {
    name: 'BD+C Building Design Construction',
    url: 'https://www.bdcnetwork.com/rss.xml',
    jurisdiction: 'National',
  },
  {
    name: 'AGC of America News',
    url: 'https://www.agc.org/newsroom/rss',
    jurisdiction: 'National',
  },
  {
    name: 'Engineering News-Record Texas',
    url: 'https://www.enr.com/rss/texas.xml',
    jurisdiction: 'Texas',
  },
  {
    name: 'Engineering News-Record California',
    url: 'https://www.enr.com/rss/california.xml',
    jurisdiction: 'California',
  },
];

// Parse RSS XML with regex (no XML parser available in runtime)
function parseRSS(xml: string): { title: string; link: string; description: string; pubDate: string }[] {
  const items: { title: string; link: string; description: string; pubDate: string }[] = [];

  // Match <item> blocks (RSS 2.0) or <entry> blocks (Atom)
  const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi;
  const matches = xml.match(itemRegex) || [];

  for (const block of matches) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractAttr(block, 'link', 'href');
    const description = extractTag(block, 'description') || extractTag(block, 'summary');
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    if (title) items.push({ title, link, description, pubDate });
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return decodeEntities(match[1].trim());
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '') // strip nested HTML
    .trim();
}

// Use LLM to determine if a news article describes a construction project opportunity
async function classifyNewsArticle(client: any, item: { title: string; description: string }, trade: string): Promise<{
  isProject: boolean;
  title?: string;
  authority?: string;
  jurisdiction?: string;
  value?: number | null;
  projectType?: string;
  description?: string;
  confidence?: number;
}> {
  try {
    const res = await client.integrations.Core.InvokeLLM({
      prompt: `You are a construction lead intelligence analyst. Analyze this news article and determine if it describes a REAL construction project opportunity (planned, bidding, or recently awarded). If it does, extract structured data. If it's just general industry news (e.g. labor trends, material prices, company earnings), return isProject=false.

ARTICLE TITLE: ${item.title}
ARTICLE SUMMARY: ${item.description}

Return JSON with: isProject (boolean), title (clean project name if applicable), authority (owner/agency), jurisdiction (city/state), value (numeric if mentioned), projectType (commercial/residential/municipal/industrial/renovation), description (2-3 sentence summary), confidence (0-1).`,
      response_json_schema: {
        type: 'object',
        properties: {
          isProject: { type: 'boolean' },
          title: { type: 'string' },
          authority: { type: 'string' },
          jurisdiction: { type: 'string' },
          value: { type: 'number' },
          projectType: { type: 'string' },
          description: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    });
    return res || { isProject: false };
  } catch {
    return { isProject: false };
  }
}

async function fetchFeed(feed: NewsFeed): Promise<string> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AUTOLEADS/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = body?.organization_id || '';
    const state = (body?.state || '').toUpperCase();

    const companies = await client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []);
    const company = (companies || [])[0];
    const trade = company?.trade || 'general construction';

    let totalCreated = 0;
    let totalDuplicates = 0;
    let totalArticles = 0;
    let totalClassified = 0;
    const feedResults: any[] = [];

    // Only fetch national feeds + feeds matching the org's service-area state
    const stateNameMap: Record<string, string> = {
      'FL': 'Florida', 'TX': 'Texas', 'CA': 'California', 'NY': 'New York',
      'IL': 'Illinois', 'GA': 'Georgia', 'OH': 'Ohio', 'NC': 'North Carolina',
    };
    const stateName = stateNameMap[state] || '';
    const feedsToFetch = NEWS_FEEDS.filter(feed => {
      if (feed.jurisdiction === 'National') return true;
      if (state && stateName && feed.jurisdiction.includes(stateName)) return true;
      return false;
    });

    for (const feed of feedsToFetch) {
      const xml = await fetchFeed(feed);
      if (!xml || xml.length < 100) {
        feedResults.push({ name: feed.name, fetched: false, created: 0 });
        continue;
      }

      const items = parseRSS(xml);
      totalArticles += items.length;

      // Find or create a ScrapeSource record
      let sourceRecord = await findSourceByName(client, feed.name);
      if (!sourceRecord) {
        try {
          sourceRecord = await client.entities.ScrapeSource.create({
            organization_id: orgId,
            name: feed.name,
            url: feed.url,
            source_type: 'aggregator',
            jurisdiction: feed.jurisdiction,
            status: 'active',
            data_class: 'production',
          });
        } catch {
          sourceRecord = null;
        }
      }

      let created = 0;
      let duplicates = 0;
      let classified = 0;

      // Process up to 15 articles per feed (to stay within timeout + LLM limits)
      const toProcess = items.slice(0, 15);
      for (const item of toProcess) {
        const classification = await classifyNewsArticle(client, item, trade);
        totalClassified++;
        if (!classification.isProject) continue;
        classified++;

        const projectTitle = classification.title || item.title;
        if (!projectTitle) continue;

        const result = await createProject(client, { organization_id: body?.organization_id,
          title: projectTitle,
          description: classification.description || item.description || '',
          authority: classification.authority || feed.name,
          jurisdiction: classification.jurisdiction || feed.jurisdiction,
          value: classification.value || null,
          bid_due_date: null,
          source_url: item.link || feed.url,
          source_id: sourceRecord?.id || '',
          project_type: classification.projectType || 'commercial',
          trade,
          confidence: classification.confidence || 0.6,
          verification_status: 'unverified',
          service_area_states: state ? [state] : [],
        });

        if (result.created) created++;
        else duplicates++;
      }

      totalCreated += created;
      totalDuplicates += duplicates;

      if (sourceRecord) {
        await updateSourceStatus(client, sourceRecord.id, {
          success: created > 0 || duplicates > 0 || items.length > 0,
          recordsRetrieved: created,
          error: items.length === 0 ? 'No articles fetched' : undefined,
        });
      }

      feedResults.push({
        name: feed.name,
        fetched: true,
        articles: items.length,
        classified,
        created,
        duplicates,
      });
    }

    if (totalCreated > 0) {
      try {
        await client.entities.Notification.create({
          organization_id: orgId,
          type: 'opportunity',
          title: `${totalCreated} news-sourced leads found`,
          body: `RSS news aggregator found ${totalCreated} construction project leads from ${feedResults.length} industry publications.`,
          priority: 'medium',
          linked_route: '/projects',
        });
      } catch {}
    }

    return Response.json({
      success: true,
      totalCreated,
      totalDuplicates,
      totalArticles,
      totalClassified,
      feeds: feedResults,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}