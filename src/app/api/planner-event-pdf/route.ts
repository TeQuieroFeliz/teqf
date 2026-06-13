import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EventDay, PlannerEvent } from '@/lib/planner-types';
import { Lang, DT, LOCALE_MAP } from '@/lib/planner-i18n';

const BORDEAUX = [92, 26, 40] as [number, number, number];
const DARK = [30, 20, 15] as [number, number, number];
const MUTED = [140, 120, 110] as [number, number, number];
const BEIGE = [250, 244, 236] as [number, number, number];

function sectionHeader(doc: jsPDF, label: string, y: number, pageW: number): number {
  doc.setFillColor(...BORDEAUX);
  doc.rect(14, y, pageW - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(label.toUpperCase(), 17, y + 4.8);
  return y + 10;
}

function row(doc: jsPDF, label: string, value: string, y: number, col: number, pageW: number): number {
  const half = (pageW - 28) / 2;
  const x = col === 0 ? 14 : 14 + half + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(value || '—', x, y + 4.5);
  return y + 9;
}

function formatDate(iso: string, locale: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatTime(t: string) {
  if (!t) return '—';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${period}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event: PlannerEvent = body.event;
    const lang: Lang = body.lang ?? 'en';
    if (!event) return NextResponse.json({ error: 'Missing event data' }, { status: 400 });

    const dt = DT[lang];
    const locale = LOCALE_MAP[lang];

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 0;

    const eventTitle = event.eventCode || event.eventName || 'Evento';

    // ── Cover header ─────────────────────────────────────────────────────
    doc.setFillColor(...BORDEAUX);
    doc.rect(0, 0, pageW, 38, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Te Quiero Feliz', 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(220, 195, 175);
    doc.text('LUXURY FLORAL & EVENT DESIGN', 14, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(eventTitle, 14, 31);

    if (event.status === 'submitted') {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 195, 175);
      doc.text(dt.submitted, pageW - 14, 31, { align: 'right' });
    }

    y = 45;

    // ── Dettagli evento ───────────────────────────────────────────────────
    y = sectionHeader(doc, dt.eventDetails, y, pageW);

    let leftY = y;
    let rightY = y;
    leftY = row(doc, dt.eventCode, eventTitle, leftY, 0, pageW);
    rightY = row(doc, dt.client, event.clientName ?? '', rightY, 1, pageW);
    leftY = row(doc, dt.city, event.city ?? '', leftY, 0, pageW);
    if (event.days?.length) {
      rightY = row(doc, 'N.', dt.numDays(event.days.length), rightY, 1, pageW);
    }
    y = Math.max(leftY, rightY) + 4;

    // ── Giorni & Venue ────────────────────────────────────────────────────
    if (event.days && event.days.length > 0) {
      event.days.forEach((day: EventDay, idx: number) => {
        if (y > 220) { doc.addPage(); y = 15; }
        y = sectionHeader(doc, dt.daySection(idx + 1, formatDate(day.date, locale)), y, pageW);

        leftY = y; rightY = y;
        leftY = row(doc, dt.description, day.eventName ?? '', leftY, 0, pageW);
        rightY = row(doc, dt.venue, day.venue ?? '', rightY, 1, pageW);
        y = Math.max(leftY, rightY);

        if (day.venueAddress) {
          const lines = doc.splitTextToSize(day.venueAddress, (pageW - 28) / 2 - 2);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(...MUTED);
          doc.text(dt.address, 14, y);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...DARK);
          doc.text(lines, 14, y + 4.5);
          y += 4.5 + lines.length * 4.5 + 3;
        }

        if (day.notes) {
          const lines = doc.splitTextToSize(day.notes, pageW - 28);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(...MUTED);
          doc.text('NOTE', 14, y);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...DARK);
          doc.text(lines, 14, y + 4.5);
          y += 4.5 + lines.length * 4.5 + 3;
        }

        if (day.setupTime || day.eventStartTime || day.breakdownTime || day.supplierAccessTime) {
          leftY = y; rightY = y;
          if (day.setupTime) leftY = row(doc, dt.setup, formatTime(day.setupTime), leftY, 0, pageW);
          if (day.eventStartTime) rightY = row(doc, dt.eventStart, formatTime(day.eventStartTime), rightY, 1, pageW);
          y = Math.max(leftY, rightY);
          leftY = y; rightY = y;
          if (day.breakdownTime) leftY = row(doc, dt.breakdown, formatTime(day.breakdownTime), leftY, 0, pageW);
          if (day.supplierAccessTime) rightY = row(doc, dt.supplierAccess, formatTime(day.supplierAccessTime), rightY, 1, pageW);
          y = Math.max(leftY, rightY);
        }

        if (day.supplierRegulationUrl || day.layoutUrls?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(...MUTED);
          doc.text(dt.documents, 14, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(...DARK);
          if (day.supplierRegulationUrl) {
            doc.text(dt.regulationAttached, 16, y);
            y += 5.5;
          }
          day.layoutUrls?.forEach((_url: string, i: number) => {
            doc.text(dt.layoutAttached((day.layoutUrls?.length ?? 0) > 1 ? i + 1 : 0), 16, y);
            y += 5.5;
          });
        }

        if (day.customItems && day.customItems.length > 0) {
          if (y > 230) { doc.addPage(); y = 15; }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(...MUTED);
          doc.text(dt.customItemsSection, 14, y);
          y += 5;
          day.customItems.forEach((item, ci) => {
            if (y > 260) { doc.addPage(); y = 15; }
            const hasImages = (item.imageUrls ?? []).length > 0;
            const prefix = `${ci + 1}.`;
            if (hasImages) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              doc.setTextColor(...DARK);
              doc.text(`${prefix} ${dt.customImageAttached} (${item.imageUrls.length})`, 16, y);
              y += 5;
            }
            if (item.note) {
              const noteLines = doc.splitTextToSize(item.note, pageW - 34);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8.5);
              doc.setTextColor(...DARK);
              if (!hasImages) doc.text(prefix, 16, y);
              doc.text(noteLines, hasImages ? 16 : 21, y);
              y += noteLines.length * 4.5 + 2;
            }
            if (!hasImages && !item.note) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(...MUTED);
              doc.text(`${ci + 1}. ${dt.customNoDescription}`, 16, y);
              y += 5;
            }
          });
          y += 2;
        }

        y += 4;
      });
    }

    // ── Planner ───────────────────────────────────────────────────────────
    if (y > 220) { doc.addPage(); y = 15; }
    y = sectionHeader(doc, dt.plannerSection, y, pageW);
    leftY = y; rightY = y;
    leftY = row(doc, dt.name, event.plannerName ?? '', leftY, 0, pageW);
    rightY = row(doc, dt.email, event.plannerEmail ?? '', rightY, 1, pageW);
    y = Math.max(leftY, rightY) + 4;

    // ── Mobiliario ────────────────────────────────────────────────────────
    const allFurniture = event.days?.flatMap((d: EventDay) => d.selectedFurniture ?? []) ?? [];
    const allFlowers   = event.days?.flatMap((d: EventDay) => d.selectedFlowers ?? []) ?? [];

    if (allFurniture.length > 0) {
      if (y > 220) { doc.addPage(); y = 15; }
      y = sectionHeader(doc, dt.furnitureSection, y, pageW);

      const furnitureRows = allFurniture.map((item) => [
        item.itemName, item.category, item.quantity.toString(),
        `$${item.price.toLocaleString('es-MX')}`,
        `$${(item.price * item.quantity).toLocaleString('es-MX')}`,
      ]);
      const furnitureTotal = allFurniture.reduce((s, i) => s + i.price * i.quantity, 0);

      autoTable(doc, {
        startY: y,
        head: [[dt.item, dt.category, dt.qty, dt.unitPrice, dt.total]],
        body: furnitureRows,
        foot: [[{ content: dt.furnitureSubtotal, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } }, { content: `$${furnitureTotal.toLocaleString('es-MX')} MXN`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } }]],
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8, textColor: DARK, cellPadding: 2, lineColor: [220, 210, 200], lineWidth: 0.15 },
        headStyles: { fillColor: BORDEAUX, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 8 },
        footStyles: { fillColor: BEIGE, textColor: DARK },
        alternateRowStyles: { fillColor: [253, 248, 242] },
        columnStyles: {
          0: { cellWidth: 60 }, 1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 30, halign: 'right' }, 4: { cellWidth: 30, halign: 'right' },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ── Fiori ─────────────────────────────────────────────────────────────
    if (allFlowers.length > 0) {
      if (y > 220) { doc.addPage(); y = 15; }
      y = sectionHeader(doc, dt.flowersSection, y, pageW);

      const flowerRows = allFlowers.map((item) => [
        item.itemName, item.category, `${item.quantity} ${item.unit}`,
        `$${item.price.toLocaleString('es-MX')}`,
        `$${(item.price * item.quantity).toLocaleString('es-MX')}`,
      ]);
      const flowersTotal = allFlowers.reduce((s, i) => s + i.price * i.quantity, 0);

      autoTable(doc, {
        startY: y,
        head: [[dt.flower, dt.category, dt.quantity, dt.unitPrice, dt.total]],
        body: flowerRows,
        foot: [[{ content: dt.flowersSubtotal, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } }, { content: `$${flowersTotal.toLocaleString('es-MX')} MXN`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } }]],
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8, textColor: DARK, cellPadding: 2, lineColor: [220, 210, 200], lineWidth: 0.15 },
        headStyles: { fillColor: BORDEAUX, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 8 },
        footStyles: { fillColor: BEIGE, textColor: DARK },
        alternateRowStyles: { fillColor: [253, 248, 242] },
        columnStyles: {
          0: { cellWidth: 60 }, 1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' }, 3: { cellWidth: 30, halign: 'right' }, 4: { cellWidth: 28, halign: 'right' },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ── Totale ────────────────────────────────────────────────────────────
    const grandTotal =
      allFurniture.reduce((s, i) => s + i.price * i.quantity, 0) +
      allFlowers.reduce((s, i) => s + i.price * i.quantity, 0);

    if (grandTotal > 0) {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFillColor(...BORDEAUX);
      doc.rect(14, y, pageW - 28, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(dt.totalSection, 17, y + 6.8);
      doc.text(`$${grandTotal.toLocaleString('es-MX')} MXN`, pageW - 14, y + 6.8, { align: 'right' });
      y += 15;
    }

    // ── Note ──────────────────────────────────────────────────────────────
    if (event.notes) {
      if (y > 220) { doc.addPage(); y = 15; }
      y = sectionHeader(doc, dt.notesSection, y, pageW);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      const lines = doc.splitTextToSize(event.notes, pageW - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 4;
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    const footerDate = new Date().toLocaleDateString(locale);
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(dt.footerText(footerDate), 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(`${i} / ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const filename = `TQF_${eventTitle.replace(/\s+/g, '_')}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Planner PDF error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
