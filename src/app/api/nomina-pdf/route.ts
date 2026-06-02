import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { firestore } from '@/firebase/server';
import { NominaEntry, PlannerEvent } from '@/lib/planner-types';

const BORDEAUX: [number, number, number] = [92, 26, 40];
const DARK: [number, number, number]     = [30, 20, 15];
const MUTED: [number, number, number]    = [140, 120, 110];
const GREEN: [number, number, number]    = [22, 101, 52];
const RED: [number, number, number]      = [153, 27, 27];

function fmtTime(t: string) { return t || '—'; }
function fmtH(h: number)    { return h > 0 ? `${h.toFixed(2)}h` : '—'; }

export async function POST(req: NextRequest) {
  try {
    const { eventId } = await req.json();
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

    const [eventSnap, nominaSnap] = await Promise.all([
      firestore.collection('plannerEvents').doc(eventId).get(),
      firestore.collection('plannerEvents').doc(eventId)
        .collection('nomina').orderBy('createdAt', 'asc').get(),
    ]);

    if (!eventSnap.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event   = { id: eventSnap.id, ...eventSnap.data() } as PlannerEvent;
    const entries = nominaSnap.docs.map(d => ({ id: d.id, ...d.data() } as NominaEntry));

    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(...BORDEAUX);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Te Quiero Feliz', 14, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 195, 175);
    doc.text('REGISTRO DI PRESENZE — NÓMINA', 14, 19);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(event.eventCode || event.clientName || 'Evento', 14, 29);
    if (event.clientName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(220, 195, 175);
      doc.text(event.clientName, pageW - 14, 29, { align: 'right' });
    }

    let y = 44;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('PLANNER', 14, y);
    doc.text('DATA STAMPA', pageW / 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(`${event.plannerName ?? '—'}`, 14, y + 5);
    doc.text(
      new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
      pageW / 2, y + 5
    );
    y += 16;

    if (entries.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text('Nessuna persona nella nómina.', 14, y + 4);
    } else {
      autoTable(doc, {
        startY: y,
        head: [['NOME', 'RUOLO', 'ENT AM', 'USC AM', 'H AM', 'ENT PM', 'USC PM', 'H PM', 'TOT', 'DESM.']],
        body: entries.map(e => [
          e.name,
          e.role,
          fmtTime(e.turnoAM?.entrata),
          fmtTime(e.turnoAM?.uscita),
          fmtH(e.turnoAM?.ore ?? 0),
          fmtTime(e.turnoPM?.entrata),
          fmtTime(e.turnoPM?.uscita),
          fmtH(e.turnoPM?.ore ?? 0),
          fmtH(e.totaleOre ?? 0),
          String(e.desmontaje ?? 0),
        ]),
        theme: 'grid',
        styles: {
          font: 'helvetica', fontSize: 7.5, textColor: DARK,
          cellPadding: 2, lineColor: [220, 210, 200], lineWidth: 0.15,
        },
        headStyles: {
          fillColor: BORDEAUX, textColor: [255, 255, 255],
          fontStyle: 'bold', fontSize: 7,
        },
        alternateRowStyles: { fillColor: [253, 248, 242] },
        columnStyles: {
          0: { cellWidth: 34 },
          1: { cellWidth: 20 },
          2: { cellWidth: 14, halign: 'center' },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 12, halign: 'right' },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 14, halign: 'center' },
          7: { cellWidth: 12, halign: 'right' },
          8: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },
          9: { cellWidth: 10, halign: 'center' },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 6;

      const totalOre  = entries.reduce((s, e) => s + (e.totaleOre ?? 0), 0);
      const totalDesm = entries.reduce((s, e) => s + (e.desmontaje ?? 0), 0);

      autoTable(doc, {
        startY: y,
        body: [
          ['Totale persone', String(entries.length)],
          ['Totale ore',     fmtH(totalOre)],
          ['Totale desmontaje', String(totalDesm)],
        ],
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, textColor: DARK, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 } },
        columnStyles: { 0: { fontStyle: 'bold', textColor: MUTED }, 1: { halign: 'right' } },
        tableWidth: 70,
        margin: { left: pageW - 84 },
      });

      y = (doc as any).lastAutoTable.finalY + 4;
      const barColor = totalOre >= 12 ? RED : totalOre >= 10 ? [180, 83, 9] as [number,number,number] : GREEN;
      doc.setFillColor(...barColor);
      doc.rect(14, y, pageW - 28, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(
        `${entries.length} persone · ${fmtH(totalOre)} totali · ${totalDesm} desmontaje`,
        17, y + 6.5
      );
    }

    const pageH = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Te Quiero Feliz · Nómina', 14, pageH - 8);
    doc.text(new Date().toLocaleDateString('it-IT'), pageW - 14, pageH - 8, { align: 'right' });

    const buf      = Buffer.from(doc.output('arraybuffer'));
    const filename = `TQF_Nomina_${(event.eventCode || 'evento').replace(/\s+/g, '_')}.pdf`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    console.error('[nomina-pdf]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
