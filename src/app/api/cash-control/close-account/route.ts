import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';
import { checkCashControlAdminAuth } from '@/lib/server/checkAdminAuth';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
const SITE   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tequierofeliz.com';

function formatCurrency(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const body = await req.json();
    const {
      eventId,
      userId,
      closedBy,
      totalReceived,
      totalSpent,
      finalBalance,
      totalWithoutSupport,
    } = body as {
      eventId: string;
      userId: string;
      closedBy: string;
      totalReceived: number;
      totalSpent: number;
      finalBalance: number;
      totalWithoutSupport: number;
    };

    if (!eventId || !userId || !closedBy) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // Verify caller is the user themselves or an admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Token requerido.' }, { status: 401 });
    }

    const caller = await checkCashControlAdminAuth(token);
    const isOwner = caller.uid === userId;

    if (!isOwner && !caller.isAuthorized) {
      return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
    }

    // Check if a closure already exists
    const existingSnap = await firestore
      .collection('cashControlClosures')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data();
      if (!existing.isReopened) {
        return NextResponse.json({ error: 'La cuenta ya está cerrada.' }, { status: 409 });
      }
      // Reclose a reopened account
      await existingSnap.docs[0].ref.update({
        closedBy,
        totalReceived,
        totalSpent,
        finalBalance,
        totalWithoutSupport,
        isReopened: false,
        closedAt: FieldValue.serverTimestamp(),
        reopenedAt: null,
        reopenedBy: null,
      });
    } else {
      await firestore.collection('cashControlClosures').add({
        eventId,
        userId,
        closedBy,
        totalReceived,
        totalSpent,
        finalBalance,
        totalWithoutSupport,
        emailSent: false,
        isReopened: false,
        closedAt: FieldValue.serverTimestamp(),
        reopenedAt: null,
        reopenedBy: null,
      });
    }

    // Audit log
    await firestore.collection('cashControlAudit').add({
      eventId,
      userId,
      action: 'close_account',
      metadata: { totalReceived, totalSpent, finalBalance, totalWithoutSupport, closedBy },
      createdAt: FieldValue.serverTimestamp(),
    });

    // Fetch event, user details, and all transactions for the email
    try {
      const [eventSnap, userRecord, receivedSnap, expensesSnap] = await Promise.all([
        firestore.collection('cashControlEvents').doc(eventId).get(),
        adminAuth.getUser(userId),
        firestore.collection('cashControlMoneyReceived')
          .where('eventId', '==', eventId)
          .where('userId', '==', userId)
          .get(),
        firestore.collection('cashControlExpenses')
          .where('eventId', '==', eventId)
          .where('userId', '==', userId)
          .get(),
      ]);

      const eventData  = eventSnap.data() ?? {};
      const eventLabel = eventData.eventCode || eventData.eventName || eventId;
      const userName   = userRecord.displayName || userRecord.email || userId;
      const balanceColor = finalBalance >= 0 ? '#166534' : '#991b1b';

      type ReceivedDoc = { amount: number; method: string; note?: string | null; date?: string; proofImageUrl?: string | null };
      type ExpenseDoc  = { amount: number; method: string; note?: string | null; date?: string; receiptImageUrl?: string | null; isWithoutSupport?: boolean; tags?: string[] };

      const receivedDocs: ReceivedDoc[] = receivedSnap.docs.map(d => d.data() as ReceivedDoc);
      const expenseDocs: ExpenseDoc[]   = expensesSnap.docs.map(d => d.data() as ExpenseDoc);

      const methodLabel = (m: string) =>
        m === 'efectivo' ? 'Efectivo' : m === 'transferencia' ? 'Transferencia' : 'Tarjeta';

      const formatDate = (d?: string) =>
        d ? new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

      const sortByDate = (a: { date?: string }, b: { date?: string }) => {
        const ad = a.date ? new Date(a.date).getTime() : 0;
        const bd = b.date ? new Date(b.date).getTime() : 0;
        return ad - bd;
      };

      receivedDocs.sort(sortByDate);
      expenseDocs.sort(sortByDate);

      const receivedRows = receivedDocs.map(r => `
        <tr style="border-bottom:1px solid #f0e8e2;">
          <td style="padding:8px 0;color:#555;font-size:13px;">${formatDate(r.date)}</td>
          <td style="padding:8px 0;color:#555;font-size:13px;">${methodLabel(r.method)}</td>
          <td style="padding:8px 0;color:#555;font-size:13px;">${r.note ?? ''}</td>
          <td style="padding:8px 0;text-align:right;color:#166534;font-weight:500;font-size:13px;">
            +$${formatCurrency(r.amount)}
            ${r.proofImageUrl ? `<br><a href="${r.proofImageUrl}" style="color:#6b1a2a;font-size:11px;">Ver comprobante</a>` : ''}
          </td>
        </tr>`).join('');

      const expenseRows = expenseDocs.map(e => `
        <tr style="border-bottom:1px solid #f0e8e2;${e.isWithoutSupport ? 'background:#fffbeb;' : ''}">
          <td style="padding:8px 0;color:#555;font-size:13px;">${formatDate(e.date)}</td>
          <td style="padding:8px 0;color:#555;font-size:13px;">${methodLabel(e.method)}${e.isWithoutSupport ? ' ⚠️' : ''}</td>
          <td style="padding:8px 0;color:#555;font-size:13px;">${[...(e.tags ?? []), e.note].filter(Boolean).join(' · ')}</td>
          <td style="padding:8px 0;text-align:right;color:#991b1b;font-weight:500;font-size:13px;">
            -$${formatCurrency(e.amount)}
            ${e.receiptImageUrl ? `<br><a href="${e.receiptImageUrl}" style="color:#6b1a2a;font-size:11px;">Ver recibo</a>` : ''}
          </td>
        </tr>`).join('');

      await resend.emails.send({
        from: FROM,
        to: ['admin@tequierofeliz.mx'],
        subject: `Cierre de cuenta: ${eventLabel} — ${userName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a0f0a;">
            <div style="background:#6b1a2a;padding:24px 32px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#fff;font-size:20px;font-weight:400;letter-spacing:0.05em;">Te Quiero Feliz</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Cash Control · Cierre de cuenta</p>
            </div>
            <div style="background:#fff;padding:28px 32px;border:1px solid #e5d9d0;border-top:none;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 6px;font-size:14px;color:#555;"><strong style="color:#1a0f0a;">Evento:</strong> ${eventLabel}</p>
              <p style="margin:0 0 20px;font-size:14px;color:#555;"><strong style="color:#1a0f0a;">Planner:</strong> ${userName}</p>

              <!-- Summary -->
              <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
                <tr style="border-bottom:1px solid #e5d9d0;">
                  <td style="padding:10px 0;color:#555;">Total recibido</td>
                  <td style="padding:10px 0;text-align:right;color:#166534;font-weight:500;">$${formatCurrency(totalReceived)}</td>
                </tr>
                <tr style="border-bottom:1px solid #e5d9d0;">
                  <td style="padding:10px 0;color:#555;">Total gastado</td>
                  <td style="padding:10px 0;text-align:right;color:#991b1b;font-weight:500;">$${formatCurrency(totalSpent)}</td>
                </tr>
                ${totalWithoutSupport > 0 ? `
                <tr style="border-bottom:1px solid #e5d9d0;">
                  <td style="padding:10px 0;color:#92400e;">Sin justificativo</td>
                  <td style="padding:10px 0;text-align:right;color:#92400e;font-weight:500;">$${formatCurrency(totalWithoutSupport)}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding:12px 0 0;font-weight:600;color:#1a0f0a;">Saldo final</td>
                  <td style="padding:12px 0 0;text-align:right;font-weight:700;color:${balanceColor};font-size:16px;">$${formatCurrency(finalBalance)}</td>
                </tr>
              </table>

              ${receivedDocs.length > 0 ? `
              <!-- Money received detail -->
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#1a0f0a;letter-spacing:0.08em;text-transform:uppercase;">Ingresos</p>
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <thead>
                  <tr style="border-bottom:2px solid #e5d9d0;">
                    <th style="padding:6px 0;text-align:left;font-size:11px;color:#999;font-weight:500;">Fecha</th>
                    <th style="padding:6px 0;text-align:left;font-size:11px;color:#999;font-weight:500;">Método</th>
                    <th style="padding:6px 0;text-align:left;font-size:11px;color:#999;font-weight:500;">Nota</th>
                    <th style="padding:6px 0;text-align:right;font-size:11px;color:#999;font-weight:500;">Monto</th>
                  </tr>
                </thead>
                <tbody>${receivedRows}</tbody>
              </table>` : ''}

              ${expenseDocs.length > 0 ? `
              <!-- Expenses detail -->
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#1a0f0a;letter-spacing:0.08em;text-transform:uppercase;">Gastos</p>
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <thead>
                  <tr style="border-bottom:2px solid #e5d9d0;">
                    <th style="padding:6px 0;text-align:left;font-size:11px;color:#999;font-weight:500;">Fecha</th>
                    <th style="padding:6px 0;text-align:left;font-size:11px;color:#999;font-weight:500;">Método</th>
                    <th style="padding:6px 0;text-align:left;font-size:11px;color:#999;font-weight:500;">Detalle</th>
                    <th style="padding:6px 0;text-align:right;font-size:11px;color:#999;font-weight:500;">Monto</th>
                  </tr>
                </thead>
                <tbody>${expenseRows}</tbody>
              </table>` : ''}

              <a href="${SITE}/area-planner/cash-control/admin" style="display:inline-block;background:#6b1a2a;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;margin-top:8px;">
                Ver panel admin
              </a>
            </div>
          </div>
        `,
      });

      // Mark emailSent in the closure document
      const closureSnap = await firestore.collection('cashControlClosures')
        .where('userId', '==', userId)
        .where('eventId', '==', eventId)
        .limit(1)
        .get();
      if (!closureSnap.empty) {
        await closureSnap.docs[0].ref.update({ emailSent: true });
      }
    } catch (emailErr) {
      console.error('[close-account] email error:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[close-account]', err);
    const message = err instanceof Error ? err.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
