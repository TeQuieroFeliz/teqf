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

    // Fetch event + nomina from Firestore (server-side)
    const [eventSnap, nominaSnap] = await Promise.all([
      firestore.collection('plannerEvents').doc(eventId).get(),
      firestore.collection('plannerEvents').doc(eventId)
        .collection('nomina').orderBy('createdAt', 'asc').get(),
    ]);

    if (!eventSnap.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = { id: eventSnap.id, ...eventSnap.data() } as PlannerEvent;
    const entries: NominaEntry[] = nominaSnap.docs.map(d => ({
      id: d.id, ...d.data(),
    } as NominaEntry));

    // ── Build PDF ──────────────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Header bar
    doc.setFillColor(...BORDEAUX);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Te Quiero Feliz', 14, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 195, 175);
    doc.text('REGISTRO DE HORAS — NÓMINA', 14, 19);
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

    // Sub-header: planner + date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('PLANNER', 14, y);
    doc.text('FECHA', pageW / 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(`${event.plannerName ?? '—'} · ${event.plannerEmail ?? ''}`, 14, y + 5);
    doc.text(
      new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
      pageW / 2, y + 5
    );
    y += 16;

    if (entries.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text('Sin entradas de nómina registradas.', 14, y + 4);
    } else {
      // Main table
      autoTable(doc, {
        startY: y,
        head: [['PERSONA', 'ENT AM', 'SAL AM', 'HRS AM', 'ENT PM', 'SAL PM', 'HRS PM', 'TOTAL', 'DESM.']],
        body: entries.map(e => [
          e.personName,
          fmtTime(e.entryTimeAM),
          fmtTime(e.exitTimeAM),
          fmtH(e.hoursAM),
          fmtTime(e.entryTimePM),
          fmtTime(e.exitTimePM),
          fmtH(e.hoursPM),
          fmtH(e.totalHours),
          String(e.desmontajeCount ?? 0),
        ]),
        theme: 'grid',
        styles: {
          font: 'helvetica', fontSize: 8, textColor: DARK,
          cellPadding: 2, lineColor: [220, 210, 200], lineWidth: 0.15,
        },
        headStyles: {
          fillColor: BORDEAUX, textColor: [255, 255, 255],
          fontStyle: 'bold', fontSize: 7,
        },
        alternateRowStyles: { fillColor: [253, 248, 242] },
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 16, halign: 'center' },
          2: { cellWidth: 16, halign: 'center' },
          3: { cellWidth: 14, halign: 'right' },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 14, halign: 'right' },
          7: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
          8: { cellWidth: 12, halign: 'center' },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 6;

      // Totals row
      const totalPeople   = entries.length;
      const totalHours    = entries.reduce((s, e) => s + (e.totalHours ?? 0), 0);
      const totalDesmontaje = entries.reduce((s, e) => s + (e.desmontajeCount ?? 0), 0);

      autoTable(doc, {
        startY: y,
        body: [
          ['Total personas', String(totalPeople)],
          ['Total horas', `${totalHours.toFixed(2)}h`],
          ['Total desmontaje', String(totalDesmontaje)],
        ],
        theme: 'plain',
        styles: {
          font: 'helvetica', fontSize: 9, textColor: DARK,
          cellPadding: { top: 2, bottom: 2, left: 4, right: 4 },
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: MUTED },
          1: { halign: 'right' },
        },
        tableWidth: 70,
        margin: { left: pageW - 84 },
      });

      y = (doc as any).lastAutoTable.finalY + 4;

      // Summary bar
      const barColor = totalHours >= 12 ? RED : totalHours >= 10 ? [180, 83, 9] as [number,number,number] : GREEN;
      doc.setFillColor(...barColor);
      doc.rect(14, y, pageW - 28, 11, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`${totalPeople} personas · ${totalHours.toFixed(2)}h totali · ${totalDesmontaje} desmontaje`, 17, y + 7);
    }

    // Footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Te Quiero Feliz · Nómina', 14, pageH - 8);
    doc.text(
      new Date().toLocaleDateString('es-MX'),
      pageW - 14, pageH - 8, { align: 'right' }
    );

    const buf = Buffer.from(doc.output('arraybuffer'));
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
