import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

// syncCostsToSheets — autonomous cost tracking → Google Sheets sync.
// Writes all CostMetric records + a financial summary to a Google Sheet,
// and emails the sheet URL to jeremy@xtremepolishingsystems.com.
// If body.spreadsheet_id is provided, appends a dated tab; else creates a new sheet.

const REPORT_EMAIL = 'jeremy@xtremepolishingsystems.com';

async function sheetsPut(accessToken: string, url: string, values: any[][]): Promise<any> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  return res.ok ? res.json() : { error: await res.text() };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = user ? await resolveUserOrgs(client, user.id) : { orgIds: [''] };

    // Google Sheets connection (platform SHARED — builder's account)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    // Fetch cost + financial data
    const [metrics, invoices, payments] = await Promise.all([
      client.entities.CostMetric.list('-created_date', 500).catch(() => []),
      client.entities.Invoice.list('-created_date', 200).catch(() => []),
      client.entities.Payment.list('-created_date', 200).catch(() => []),
    ]);

    // Compute summary
    const categoryTotals: Record<string, number> = {};
    for (const m of (metrics || [])) {
      if (m.is_predicted) continue;
      categoryTotals[m.category] = (categoryTotals[m.category] || 0) + Number(m.amount || 0);
    }
    const totalRevenue = (payments || []).filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const totalCost = Object.values(categoryTotals).reduce((s: number, v: number) => s + v, 0);
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Build rows
    const metricRows: any[][] = [['Date', 'Category', 'Subcategory', 'Description', 'Amount', 'Period', 'Recurring', 'Predicted', 'Confidence']];
    for (const m of (metrics || [])) {
      metricRows.push([
        m.date || '', m.category || '', m.subcategory || '', (m.description || '').slice(0, 100),
        String(Number(m.amount || 0)), m.period || '',
        m.is_recurring ? 'Yes' : 'No', m.is_predicted ? 'Yes' : 'No', String(m.confidence_score || ''),
      ]);
    }

    const summaryRows: any[][] = [
      ['AUTOLEADS COST SUMMARY', new Date().toISOString()],
      [''],
      ['Category', 'Total ($)'],
      ...Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([c, v]) => [c, String(Math.round(v))]),
      [''],
      ['Total Revenue', String(Math.round(totalRevenue))],
      ['Total Costs', String(Math.round(totalCost))],
      ['Net Profit', String(Math.round(profit))],
      ['Profit Margin (%)', margin.toFixed(1)],
    ];

    const spreadsheetId = body?.spreadsheet_id;
    let sheetUrl: string;

    if (spreadsheetId) {
      const tabName = new Date().toISOString().slice(0, 10);
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] }),
      }).catch(() => null);
      await sheetsPut(accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1')}?valueInputOption=RAW`, metricRows);
      await sheetsPut(accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!K1')}?valueInputOption=RAW`, summaryRows);
      sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    } else {
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: { title: `AUTOLEADS Cost Tracking — ${new Date().toISOString().slice(0, 10)}` } }),
      });
      const created = await createRes.json();
      const newId = created.spreadsheetId;
      await sheetsPut(accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${newId}/values/A1?valueInputOption=RAW`, metricRows);
      await sheetsPut(accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${newId}/values/K1?valueInputOption=RAW`, summaryRows);
      sheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${newId}/edit`;
    }

    // Email the report
    await client.integrations.Core.SendEmail({
      to: REPORT_EMAIL,
      subject: `AUTOLEADS Cost Tracking Sync — ${new Date().toISOString().slice(0, 10)}`,
      body: `Cost data synced to Google Sheets.

Revenue: $${Math.round(totalRevenue).toLocaleString()}
Costs: $${Math.round(totalCost).toLocaleString()}
Net Profit: $${Math.round(profit).toLocaleString()}
Margin: ${margin.toFixed(1)}%
Metrics synced: ${(metrics || []).length}

Spreadsheet: ${sheetUrl}`,
    }).catch(() => null);

    return Response.json({
      success: true,
      spreadsheet_url: sheetUrl,
      metrics_synced: (metrics || []).length,
      total_cost: Math.round(totalCost),
      total_revenue: Math.round(totalRevenue),
      profit: Math.round(profit),
      margin: margin.toFixed(1),
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Sheets sync failed' }, { status: 500 });
  }
}