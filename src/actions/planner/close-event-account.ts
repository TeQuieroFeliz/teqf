'use server';

import { Resend } from 'resend';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getExpenses } from './get-expenses';

const BORDEAUX: [number, number, number] = [92, 26, 40];
const DARK: [number, number, number] = [30, 20, 15];
const MUTED: [number, number, number] = [140, 120, 110];

export async function closeEventAccount(params: {
  eventId: string;
  eventCode: string;
  clientName?: string;
  plannerName: string;
  plannerEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { eventId, eventCode, clientName, plannerName, plannerEmail } = params;

    const expenses = await getExpenses(eventId);
    const anticipos = expenses.filter(e => e.type === 'anticipo');
    const items = expenses.filter(e => e.type === 'expense');

    const anticitoAmount = anticipos.reduce((s, e) => s + e.amount, 0);
    const totalExpenses = items.reduce((s, e) => s + e.amount, 0);
    const balance = anticitoAmount - totalExpenses;

    // ── Generate PDF ──────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(...BORDEAUX);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Te Quiero Feliz', 14, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 195, 175);
    doc.text('CIERRE DE CUENTA DE GASTOS', 14, 19);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(eventCode, 14, 29);
    if (clientName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(220, 195, 175);
      doc.text(clientName, pageW - 14, 29, { align: 'right' });
    }

    let y = 44;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('PLANNER', 14, y);
    doc.text('FECHA DE CIERRE', pageW / 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(`${plannerName} <${plannerEmail}>`, 14, y + 5);
    doc.text(new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }), pageW / 2, y + 5);
    y += 14;

    doc.setFillColor(...BORDEAUX);
    doc.rect(14, y, pageW - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('GASTOS', 17, y + 4.8);
    y += 10;

    if (items.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['CATEGORÍA', 'NOTA', 'FECHA', 'MONTO']],
        body: items.map(e => [
          e.category,
          e.note || '—',
          new Date(e.timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' }),
          `$${e.amount.toLocaleString('es-MX')}`,
        ]),
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8, textColor: DARK, cellPadding: 2, lineColor: [220, 210, 200], lineWidth: 0.15 },
        headStyles: { fillColor: BORDEAUX, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [253, 248, 242] },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 28, halign: 'right' },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text('Sin gastos registrados.', 14, y + 4);
      y += 12;
    }

    autoTable(doc, {
      startY: y,
      body: [
        ...anticipos.map(a => [`Anticipo (${a.method === 'efectivo' ? 'Efectivo' : a.method === 'transferencia' ? 'Transferencia' : '—'})`, `$${a.amount.toLocaleString('es-MX')}`]),
        ['Total anticipos', `$${anticitoAmount.toLocaleString('es-MX')}`],
        ['Total gastos', `$${totalExpenses.toLocaleString('es-MX')}`],
      ],
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, textColor: DARK, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 } },
      columnStyles: { 0: { fontStyle: 'bold', textColor: MUTED }, 1: { halign: 'right' } },
      tableWidth: pageW - 28,
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 2;

    if (balance >= 0) {
      doc.setFillColor(22, 101, 52);
    } else {
      doc.setFillColor(...BORDEAUX);
    }
    doc.rect(14, y, pageW - 28, 11, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text('SALDO RESTANTE', 17, y + 7);
    doc.text(`$${balance.toLocaleString('es-MX')}`, pageW - 14, y + 7, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Te Quiero Feliz · Área Planner', 14, doc.internal.pageSize.getHeight() - 8);
    doc.text(new Date().toLocaleDateString('es-MX'), pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // ── Send email ────────────────────────────────────────────────────────
    const resend = new Resend(process.env.RESEND_API_KEY);
    const isPositive = balance >= 0;
    const balanceColor = isPositive ? '#166534' : '#991b1b';
    const balanceBg = isPositive ? '#f0fdf4' : '#fef2f2';
    const balanceBorder = isPositive ? '#bbf7d0' : '#fecaca';

    const expenseRowsHtml = items.map(e => `
      <tr>
        <td style="padding:5px 8px;font-size:13px;color:#3d1a1a;">${e.category}</td>
        <td style="padding:5px 8px;font-size:13px;color:#6b5c58;">${e.note || '—'}</td>
        <td style="padding:5px 8px;font-size:13px;text-align:right;color:#3d1a1a;">$${e.amount.toLocaleString('es-MX')}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9f3ef;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f3ef;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;border:1px solid #e8ddd4;">
        <tr><td style="background:#5c1a28;padding:24px 28px;">
          <h1 style="margin:0;color:#f9f3ef;font-size:20px;font-weight:400;">Cierre de Cuenta de Gastos</h1>
          <p style="margin:6px 0 0;color:#c8a9a9;font-size:13px;font-family:Arial,sans-serif;">Te Quiero Feliz — Área Planner</p>
        </td></tr>
        <tr><td style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f3ef;border-radius:8px;padding:14px;margin-bottom:20px;">
            <tr>
              <td style="padding:3px 0;font-size:12px;color:#888;font-family:Arial,sans-serif;width:140px;">Evento</td>
              <td style="padding:3px 0;font-size:14px;font-weight:600;color:#3d1a1a;letter-spacing:0.05em;">${eventCode}${clientName ? ` — ${clientName}` : ''}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;font-size:12px;color:#888;font-family:Arial,sans-serif;">Planner</td>
              <td style="padding:3px 0;font-size:13px;color:#3d1a1a;">${plannerName} &lt;${plannerEmail}&gt;</td>
            </tr>
            <tr>
              <td style="padding:3px 0;font-size:12px;color:#888;font-family:Arial,sans-serif;">Fecha cierre</td>
              <td style="padding:3px 0;font-size:13px;color:#3d1a1a;">${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
          </table>

          <h2 style="font-size:13px;color:#3d1a1a;margin:0 0 10px;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.08em;">Gastos (${items.length})</h2>
          ${items.length > 0 ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8ddd4;border-radius:8px;overflow:hidden;margin-bottom:16px;">
            <tr style="background:#f9f3ef;">
              <th style="padding:6px 8px;font-size:11px;text-align:left;color:#888;font-family:Arial,sans-serif;font-weight:400;">Categoría</th>
              <th style="padding:6px 8px;font-size:11px;text-align:left;color:#888;font-family:Arial,sans-serif;font-weight:400;">Nota</th>
              <th style="padding:6px 8px;font-size:11px;text-align:right;color:#888;font-family:Arial,sans-serif;font-weight:400;">Monto</th>
            </tr>
            ${expenseRowsHtml}
          </table>` : '<p style="color:#888;font-size:13px;font-family:Arial,sans-serif;margin-bottom:16px;">Sin gastos registrados.</p>'}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${anticipos.map(a => `<tr>
              <td style="padding:4px 0;font-size:13px;color:#888;font-family:Arial,sans-serif;">Anticipo — ${a.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}</td>
              <td style="padding:4px 0;font-size:13px;text-align:right;color:#3d1a1a;font-family:Arial,sans-serif;">$${a.amount.toLocaleString('es-MX')}</td>
            </tr>`).join('')}
            ${anticipos.length > 1 ? `<tr>
              <td style="padding:4px 0;font-size:13px;font-weight:600;color:#888;font-family:Arial,sans-serif;border-top:1px solid #e8ddd4;">Total anticipos</td>
              <td style="padding:4px 0;font-size:13px;font-weight:600;text-align:right;color:#3d1a1a;font-family:Arial,sans-serif;border-top:1px solid #e8ddd4;">$${anticitoAmount.toLocaleString('es-MX')}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#888;font-family:Arial,sans-serif;">Total gastos</td>
              <td style="padding:4px 0;font-size:13px;text-align:right;color:#3d1a1a;font-family:Arial,sans-serif;">$${totalExpenses.toLocaleString('es-MX')}</td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${balanceBg};border:1px solid ${balanceBorder};border-radius:8px;">
            <tr>
              <td style="padding:12px 14px;font-size:13px;color:${balanceColor};font-family:Arial,sans-serif;font-weight:600;">Saldo restante</td>
              <td style="padding:12px 14px;font-size:16px;text-align:right;color:${balanceColor};font-family:Arial,sans-serif;font-weight:700;">$${balance.toLocaleString('es-MX')}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#f9f3ef;padding:14px 28px;border-top:1px solid #e8ddd4;text-align:center;">
          <p style="margin:0;font-size:11px;color:#aaa;font-family:Arial,sans-serif;">Te Quiero Feliz · Área Planner</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    await resend.emails.send({
      from: 'Te Quiero Feliz <onboarding@resend.dev>',
      to: 'admin@tequierofeliz.mx',
      subject: `Cierre de cuenta: ${eventCode}${clientName ? ` — ${clientName}` : ''}`,
      html,
      attachments: [
        {
          filename: `TQF_Gastos_${eventCode.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return { success: true };
  } catch (e: any) {
    console.error('close-event-account error:', e);
    return { success: false, error: e.message };
  }
}
