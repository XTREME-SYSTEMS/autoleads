// Shared PDF builder: renders a project's translated source document + specs +
// scope of work into a clean, human-readable PDF. Used by the
// generateSourcePdfs batch function so every scraped job carries a readable PDF.
//
// Markdown is rendered with a lightweight layout (headings, bullets, bold
// labels, body paragraphs) — enough structure to read and validate the source.

import { jsPDF } from 'npm:jspdf@4.0.0';

const YELLOW: [number, number, number] = [242, 223, 13];
const INK: [number, number, number] = [24, 24, 24];
const MUTED: [number, number, number] = [90, 90, 90];
const RULE: [number, number, number] = [214, 214, 214];

function fmtDate(value: any): string {
  if (!value) return 'Not stated';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function money(value: any): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 'Not stated';
  return `$${Math.round(n).toLocaleString()}`;
}

// Strip markdown emphasis markers for plain-text rendering, keeping the text.
function stripMd(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1').trim();
}

// Build the PDF bytes for a single project. Returns a Uint8Array.
export function buildProjectSourcePdf(project: any): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin + 8;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, font: string, size: number, color: [number, number, number], gapAfter: number) => {
    doc.setFont('helvetica', font);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    const lineH = size * 1.35;
    for (const line of lines) {
      ensureSpace(lineH);
      doc.text(line, margin, y);
      y += lineH;
    }
    y += gapAfter;
  };

  const writeBullet = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    const indent = 14;
    const lines = doc.splitTextToSize(stripMd(text), maxWidth - indent) as string[];
    const lineH = 13;
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(lineH);
      if (i === 0) doc.text('•', margin, y);
      doc.text(lines[i], margin + indent, y);
      y += lineH;
    }
    y += 2;
  };

  const writeRule = () => {
    ensureSpace(14);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  };

  // Top accent band
  doc.setFillColor(YELLOW[0], YELLOW[1], YELLOW[2]);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Eyebrow
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 140, 0);
  doc.text('AUTOLEADS — SOURCE DOCUMENT', margin, y);
  y += 14;

  // Title
  writeWrapped(project.title || 'Untitled Project', 'bold', 18, INK, 4);

  // Meta line
  const meta = [project.authority, project.jurisdiction, project.trade].filter(Boolean).join('   •   ');
  if (meta) writeWrapped(meta, 'normal', 10, MUTED, 8);

  // Key facts block
  writeRule();
  const facts: [string, string][] = [
    ['Bid Due Date', fmtDate(project.bid_due_date)],
    ['Project Value', money(project.value)],
    ['Client / Owner', project.client_name || project.authority || 'Not stated'],
    ['Site Address', project.address || project.jurisdiction || 'Not stated'],
    ['Square Footage', project.square_footage ? `${Number(project.square_footage).toLocaleString()} SF` : 'Not stated'],
    ['Floor Finish', project.floor_finish || 'Not stated'],
    ['Source URL', project.source_url || 'Not stated'],
  ];
  doc.setFontSize(10);
  for (const [label, val] of facts) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    const valLines = doc.splitTextToSize(val, maxWidth - 130) as string[];
    doc.text(valLines, margin + 125, y);
    y += Math.max(14, valLines.length * 13);
  }
  y += 4;
  writeRule();

  // Main body: the readable source document (markdown), rendered as structured text.
  const docText = String(project.source_readable_document || '').trim();
  if (docText) {
    renderMarkdown(doc, docText, margin, maxWidth, pageHeight, {
      ensureSpace, writeWrapped, writeBullet, writeRule, getY: () => y, setY: (v) => { y = v; },
    });
  } else {
    writeWrapped('No readable source document has been translated yet for this project.', 'italic', 10, MUTED, 6);
  }

  // Specifications & Scope of Work (from the structured specs field) — appended
  // so the takeoff system and reviewers have the scope in a clean section.
  const specs = String(project.specs || '').trim();
  if (specs && !/^not available/i.test(specs)) {
    writeRule();
    writeWrapped('SPECIFICATIONS & SCOPE OF WORK', 'bold', 12, INK, 4);
    writeWrapped(stripMd(specs), 'normal', 10, INK, 6);
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
    if (project.source_url) {
      doc.text('Source: ' + project.source_url.slice(0, 80), margin, pageHeight - 20);
    }
  }

  return new Uint8Array(doc.output('arraybuffer'));
}

interface RenderCtx {
  ensureSpace: (n: number) => void;
  writeWrapped: (text: string, font: string, size: number, color: [number, number, number], gapAfter: number) => void;
  writeBullet: (text: string) => void;
  writeRule: () => void;
  getY: () => number;
  setY: (v: number) => void;
}

// Lightweight markdown renderer: headings, subheadings, bold-label lines,
// bullets, and body paragraphs. Good enough for the standard templates.
function renderMarkdown(doc: any, text: string, margin: number, maxWidth: number, pageHeight: number, ctx: RenderCtx) {
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (!line.trim()) {
      ctx.setY(ctx.getY() + 4);
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      ctx.writeWrapped(stripMd(line.slice(4)).toUpperCase(), 'bold', 10, INK, 3);
    } else if (line.startsWith('## ')) {
      ctx.writeWrapped(stripMd(line.slice(3)).toUpperCase(), 'bold', 12, INK, 4);
    } else if (line.startsWith('# ')) {
      ctx.writeWrapped(stripMd(line.slice(2)), 'bold', 15, INK, 5);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      ctx.writeBullet(line.slice(2));
    } else {
      // Body paragraph — collapse consecutive body lines into a paragraph
      let para = line;
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (!next || next.startsWith('#') || next.startsWith('- ') || next.startsWith('* ')) break;
        para += ' ' + next;
        i++;
      }
      ctx.writeWrapped(stripMd(para), 'normal', 10, INK, 4);
    }
    i++;
  }
}

// Build a professional compiled PDF for an approved project: the readable
// source document + specifications & scope of work + a takeoff measurements
// table. This is the downloadable document estimators and owners review.
export function buildProjectTakeoffPdf(project: any, takeoffs: any[]): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin + 8;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) { doc.addPage(); y = margin; }
  };
  const writeWrapped = (text: string, font: string, size: number, color: [number, number, number], gapAfter: number) => {
    doc.setFont('helvetica', font); doc.setFontSize(size); doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    const lineH = size * 1.35;
    for (const line of lines) { ensureSpace(lineH); doc.text(line, margin, y); y += lineH; }
    y += gapAfter;
  };
  const writeRule = () => {
    ensureSpace(14); doc.setDrawColor(RULE[0], RULE[1], RULE[2]); doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y); y += 10;
  };

  doc.setFillColor(YELLOW[0], YELLOW[1], YELLOW[2]); doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(180, 140, 0);
  doc.text('AUTOLEADS — PROJECT SCOPE & TAKEOFF', margin, y); y += 14;

  writeWrapped(project.title || 'Untitled Project', 'bold', 18, INK, 4);
  const meta = [project.authority, project.jurisdiction, project.trade].filter(Boolean).join('   •   ');
  if (meta) writeWrapped(meta, 'normal', 10, MUTED, 8);

  writeRule();
  const facts: [string, string][] = [
    ['Bid Due Date', fmtDate(project.bid_due_date)],
    ['Project Value', money(project.value)],
    ['Client / Owner', project.client_name || project.authority || 'Not stated'],
    ['Square Footage', project.square_footage ? `${Number(project.square_footage).toLocaleString()} SF` : 'Not stated'],
    ['Floor Finish', project.floor_finish || 'Not stated'],
  ];
  doc.setFontSize(10);
  for (const [label, val] of facts) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(INK[0], INK[1], INK[2]); doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(String(val), margin + 125, y); y += 14;
  }
  y += 4; writeRule();

  const docText = String(project.source_readable_document || '').trim();
  if (docText) {
    writeWrapped('SOURCE DOCUMENT', 'bold', 12, INK, 4);
    const lines = docText.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trimEnd();
      if (!line.trim()) { y += 4; i++; continue; }
      if (line.startsWith('### ')) { writeWrapped(stripMd(line.slice(4)).toUpperCase(), 'bold', 10, INK, 3); }
      else if (line.startsWith('## ')) { writeWrapped(stripMd(line.slice(3)).toUpperCase(), 'bold', 11, INK, 4); }
      else if (line.startsWith('# ')) { writeWrapped(stripMd(line.slice(2)), 'bold', 14, INK, 5); }
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(INK[0], INK[1], INK[2]);
        const indent = 14;
        const blines = doc.splitTextToSize(stripMd(line.slice(2)), maxWidth - indent) as string[];
        for (let j = 0; j < blines.length; j++) { ensureSpace(13); if (j === 0) doc.text('•', margin, y); doc.text(blines[j], margin + indent, y); y += 13; }
        y += 2;
      } else {
        let para = line;
        while (i + 1 < lines.length) {
          const next = lines[i + 1].trim();
          if (!next || next.startsWith('#') || next.startsWith('- ') || next.startsWith('* ')) break;
          para += ' ' + next; i++;
        }
        writeWrapped(stripMd(para), 'normal', 10, INK, 4);
      }
      i++;
    }
  }

  const specs = String(project.specs || '').trim();
  if (specs && !/^not available/i.test(specs)) {
    writeRule(); writeWrapped('SPECIFICATIONS & SCOPE OF WORK', 'bold', 12, INK, 4);
    writeWrapped(stripMd(specs), 'normal', 10, INK, 6);
  }

  writeRule();
  writeWrapped('TAKEOFF MEASUREMENTS', 'bold', 12, INK, 6);
  const cols = [
    { key: 'scope', header: 'Scope', width: 150 },
    { key: 'system_code', header: 'Code', width: 55 },
    { key: 'final_quantity', header: 'Qty', width: 55, align: 'right' },
    { key: 'unit', header: 'Unit', width: 38 },
    { key: 'waste_factor', header: 'Waste', width: 45, align: 'right' },
    { key: 'spec_evidence', header: 'Spec Evidence', width: maxWidth - 343 },
  ];
  const rowH = 16;
  ensureSpace(rowH + 4);
  doc.setFillColor(245, 245, 245); doc.rect(margin, y - 11, maxWidth, rowH, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(INK[0], INK[1], INK[2]);
  let xx = margin;
  for (const c of cols) {
    doc.text(c.header, xx + (c.align === 'right' ? c.width - 4 : 4), y, { align: c.align === 'right' ? 'right' : 'left' });
    xx += c.width;
  }
  y += rowH + 4;

  for (const t of (takeoffs || [])) {
    const cells: Record<string, string> = {
      scope: String(t.scope || t.system_code || '—'),
      system_code: String(t.system_code || '—'),
      final_quantity: Number(t.final_quantity || 0).toLocaleString(),
      unit: String(t.unit || ''),
      waste_factor: `${Math.round(Number(t.waste_factor || 0) * 100)}%`,
      spec_evidence: String(t.spec_evidence || ''),
    };
    let maxLines = 1;
    for (const c of cols) {
      const lines = doc.splitTextToSize(cells[c.key], c.width - 8) as string[];
      if (lines.length > maxLines) maxLines = lines.length;
    }
    const h = maxLines * 11 + 6;
    ensureSpace(h + 2);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]); doc.setLineWidth(0.5);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(INK[0], INK[1], INK[2]);
    let x2 = margin;
    for (const c of cols) {
      const lines = doc.splitTextToSize(cells[c.key], c.width - 8) as string[];
      doc.text(lines, x2 + (c.align === 'right' ? c.width - 4 : 4), y + 8, { align: c.align === 'right' ? 'right' : 'left' });
      x2 += c.width;
    }
    y += h;
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
    if (project.source_url) doc.text('Source: ' + project.source_url.slice(0, 80), margin, pageHeight - 20);
  }
  return new Uint8Array(doc.output('arraybuffer'));
}