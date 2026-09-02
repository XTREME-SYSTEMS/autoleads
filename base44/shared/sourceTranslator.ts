// Shared source-document translator: captures the original source HTML from a
// project URL and translates it into a human-readable markdown document using
// standard construction procurement templates.
//
// Used by:
//   - translateSourceDocument (manual, on-demand)
//   - createProject (mandatory at ingestion — every scraped project must carry
//     its original source data plus a readable translation)

// Standard construction procurement document templates.
// The LLM picks the best-fitting template from the raw source and fills it in,
// producing a human-readable markdown document.
export const TEMPLATES: Record<string, string> = {
  bid_invitation: `# ADVERTISEMENT FOR BIDS

**Project Title:** <title>
**Owner / Awarding Authority:** <client_name / authority>
**Project Location:** <jurisdiction / address>

## Scope of Work
<concise description of the work to be performed>

## Bid Submission
- **Bids Due:** <bid_due_date and time>
- **Submission Location / Method:** <where and how to submit>
- **Bid Bond / Bonding Requirements:** <if stated>

## Pre-Bid Meeting / Site Walk
<date, time, and location if scheduled; otherwise "None scheduled">

## Plans & Specifications
<where to obtain plans/specs, planholder deposit, and links>

## Addenda
<addendum process and links if stated>

## Contact Information
<procurement officer name, email, phone, address>`,

  rfp: `# REQUEST FOR PROPOSALS

**Project Title:** <title>
**Issuing Agency:** <authority / client_name>
**Project Location:** <jurisdiction>

## Background
<background and context of the project>

## Scope of Services
<scope of services requested>

## Proposal Submission Requirements
<what must be included in the proposal, format, page limits, due date>

## Evaluation Criteria
<criteria the proposals will be scored against>

## Schedule of Events
<key dates: issue, pre-proposal meeting, questions due, proposals due, award>

## Contact Information
<procurement contact name, email, phone>`,

  rfq: `# REQUEST FOR QUALIFICATIONS

**Project Title:** <title>
**Issuing Agency:** <authority / client_name>

## Project Overview
<brief overview of the project requiring qualified firms>

## Qualifications Sought
<experience, licenses, team composition required>

## Submittal Requirements
<what firms must submit: SOQ format, content, due date>

## Evaluation & Selection Criteria
<how qualifications will be evaluated>

## Schedule
<key dates>

## Contact Information
<procurement contact>`,

  permit_notice: `# PERMIT NOTICE

**Permit Number / Reference:** <permit number>
**Permit Type:** <type of permit>
**Applicant / Owner:** <applicant name>
**Project Location:** <address / jurisdiction>
**Scope of Work:** <description>
**Estimated Valuation:** <value>
**Status / Dates:** <filed, approved, issued dates>
**Contact:** <permitting authority contact>`,

  addendum: `# ADDENDUM

**Addendum Number:** <number>
**Date Issued:** <date>
**Project:** <title>
**Owner / Agency:** <client_name / authority>

## Purpose
<purpose of the addendum>

## Changes / Clarifications
<each change or clarification, numbered>

## Acknowledgement
<bidders must acknowledge receipt of this addendum>`,

  plan_holder: `# PLAN HOLDER LIST

**Project:** <title>
**Issuing Authority:** <authority>
**Bid Due Date:** <bid_due_date>

## Registered Plan Holders
<list of firms that have registered / purchased plans>

## Contact
<procurement contact>`,

  generic: `# <title>

**Source:** <authority / jurisdiction>
**Location:** <jurisdiction / address>

## Summary
<concise project summary>

## Key Details
- **Bid Due Date:** <bid_due_date>
- **Project Value:** <value>
- **Contact:** <contract_info>

## Scope / Specifications
<scope of work and specifications>

## Additional Information
<any other relevant details from the source>`,
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES);

// Fetch the original raw source HTML from a URL. Returns '' on failure.
export async function captureSourceHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await res.text();
    if (!html || html.length < 200) return '';
    return html;
  } catch {
    return '';
  }
}

// Strip scripts/styles but keep structural + text content for the LLM translator.
export function toReadableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

// Translate already-captured raw HTML into a human-readable markdown document.
// Detects the best-fit template and fills it in. Does NOT fetch.
export async function translateRawSource(client: any, rawHtml: string): Promise<{
  readable_document: string;
  template_type: string;
  confidence: number;
}> {
  const pageText = toReadableText(rawHtml);
  if (!pageText) return { readable_document: '', template_type: 'generic', confidence: 0 };

  const templateList = TEMPLATE_KEYS.map(k => `- ${k}: ${TEMPLATES[k].split('\n')[0].replace('# ', '')}`).join('\n');

  try {
    const translated = await client.integrations.Core.InvokeLLM({
      prompt: `You are a construction procurement document translator. You are given the raw extracted text from a construction bid / project posting. Your job:

1. DETECT which standard document template best fits the source. Choose exactly one from:
${templateList}

2. TRANSLATE the raw source into a clean, human-readable markdown document by filling in that template. Use the template's section structure exactly. Replace every placeholder (<...>) with the real value from the source. If a value is not present in the source, write "Not stated on source" for that field — do NOT fabricate. Keep it concise and professional.

3. Return JSON with:
   - template_type: the key you chose (one of: ${TEMPLATE_KEYS.join(', ')})
   - readable_document: the full markdown document you produced
   - confidence: 0-100 confidence that the template fit is correct

Only use information actually present in the source. Be accurate.

RAW SOURCE TEXT:
${pageText}`,
      response_json_schema: {
        type: 'object',
        properties: {
          template_type: { type: 'string', enum: TEMPLATE_KEYS },
          readable_document: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    });

    return {
      readable_document: translated?.readable_document || '',
      template_type: translated?.template_type || 'generic',
      confidence: typeof translated?.confidence === 'number' ? translated.confidence : 0,
    };
  } catch {
    return { readable_document: '', template_type: 'generic', confidence: 0 };
  }
}

// Capture the original source HTML from a URL and translate it into a
// human-readable document. Returns null if the source is unreachable.
export async function captureAndTranslateSource(client: any, url: string): Promise<{
  raw_html: string;
  readable_document: string;
  template_type: string;
  confidence: number;
} | null> {
  if (!url) return null;
  const rawHtml = await captureSourceHtml(url);
  if (!rawHtml) return null;
  const { readable_document, template_type, confidence } = await translateRawSource(client, rawHtml);
  return {
    raw_html: rawHtml.slice(0, 50000),
    readable_document,
    template_type,
    confidence,
  };
}