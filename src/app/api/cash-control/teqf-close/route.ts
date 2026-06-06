// PART-3: Close a TeQF project cash-control account + send email report
import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY');
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tequierofeliz.com';

function fmtMXN(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d?: string) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Token requerido.' }, { status: 401 });
    }

    // Verify caller is authenticated
    const decoded = await adminAuth.verifyIdToken(token);
    const callerUid = decoded.uid;

    const body = await req.json() as {
      projectId: string;
      projectName: string;
      closedBy: string;
      totalIncome: number;
      totalExpense: number;
      saldo: number;
    };

    const { projectId, projectName, closedBy, totalIncome, totalExpense, saldo } = body;

    if (!projectId || !closedBy) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // Caller must match closedBy
    if (callerUid !== closedBy) {
      return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
    }

    // Mark project as closed in Firestore
    const projectRef = firestore.collection('teqfProjects').doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
    }

    if (projectSnap.data()?.isClosed) {
      return NextResponse.json({ error: 'El proyecto ya está cerrado.' }, { status: 409 });
    }

    await projectRef.update({
      isClosed: true,
      closedAt: FieldValue.serverTimestamp(),
      closedBy,
      updatedAt: new Date().toISOString(),
    });

    // Fetch movements for email
    const balanceColor = saldo >= 0 ? '#166534' : '#991b1b';
    let movementRows = '';

    try {
      const movSnap = await firestore
        .collection('teqfProjects')
        .doc(projectId)
        .collection('cashControl')
        .orderBy('date', 'asc')
        .get();

      const callerRecord = await adminAuth.getUser(callerUid);
      const userName = callerRecord.displayName || callerRecord.email || callerUid;

      const methodLabel = (m?: string) =>
        m === 'transferencia' ? 'Transferencia' : m === 'efectivo' ? 'Efectivo' : '—';

      movementRows = movSnap.docs.map(d => {
        const mv = d.data();
        const isInc = mv.type === 'income';
        const amount = mv.amount as number ?? 0;
        const tags = (mv.tags as string[] ?? []).join(', ');
        return `<tr style="border-bottom:1px solid #f0e8e2;">
          <td style="padding:8px 0;color:#555;font-size:13px;">${fmtDate(mv.date as string)}</td>
          <td style="padding:8px 0;color:#555;font-size:13px;">${isInc ? 'Entrada' : 'Gasto'}</td>
          <td style="padding:8px 0;color:#555;font-size:13px;">${mv.description ?? ''}${tags ? ` · ${tags}` : ''}</td>
          <td style="padding:8px 0;color:#555;font-size:13px;">${methodLabel(mv.paymentMethod as string)}</td>
          <td style="padding:8px 0;text-align:right;color:${isInc ? '#166534' : '#991b1b'};font-weight:500;font-size:13px;">
            ${isInc ? '+' : '-'}${fmtMXN(amount)}
          </td>
        </tr>`;
      }).join('');

      await getResend().emails.send({
        from: FROM,
        to: ['admin@tequierofeliz.mx'],
        subject: `Cierre Cash Control: ${projectName} — ${userName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a0f0a;">
            <div style="background:#6b1a2a;padding:24px 32px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#fff;font-size:20px;font-weight:400;letter-spacing:0.05em;">Te Quiero Feliz</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Cash Control · Cierre de proyecto</p>
            </div>
            <div style="background:#fff;padding:28px 32px;border:1px solid #e5d9d0;border-top:none;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 6px;font-size:14px;color:#555;"><strong style="color:#1a0f0a;">Proyecto:</strong> ${projectName}</p>
              <p style="margin:0 0 20px;font-size:14px;color:#555;"><strong style="color:#1a0f0a;">Cerrado por:</strong> ${userName}</p>

              <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
                <tr style="border-bottom:1px solid #e5d9d0;">
                  <td style="padding:10px 0;color:#555;">Total entradas</td>
                  <td style="padding:10px 0;text-align:right;color:#166534;font-weight:500;">${fmtMXN(totalIncome)}</td>
                </tr>
                <tr style="border-bottom:1px solid #e5d9d0;">
                  <td style="padding:10px 0;color:#555;">Total gastos</td>
                  <td style="padding:10px 0;text-align:right;color:#991b1b;font-weight:500;">${fmtMXN(totalExpense)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;font-weight:600;color:#1a0f0a;">Saldo final</td>
                  <td style="padding:12px 0 0;text-align:right;font-weight:700;color:${balanceColor};font-size:16px;">${fmtMXN(saldo)}</td>
                </tr>
              </table>

              ${movementRows ? `
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#1a0f0a;letter-spacing:0.08em;text-transform:uppercase;">Detalle de movimientos</p>
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <thead>
                  <tr style="border-bottom:2px solid #e5d9d0;">
                    <th style="padding:6px 0;text-align:left;font-size:11px;color:#999;font-weight:500;">Fecha</th>
                    <th style="padding:6px 0;text-align:left;font-size:11px;color:#999;font-weight:500;">Tipo</th>
                    <th style="padding:6px 0;text-align:left;font-size:11px;color:#999;font-weight:500;">Descripción</th>
                    <th style="padding:6px 0;text-align:left;font-size:11px;color:#999;font-weight:500;">Método</th>
                    <th style="padding:6px 0;text-align:right;font-size:11px;color:#999;font-weight:500;">Monto</th>
                  </tr>
                </thead>
                <tbody>${movementRows}</tbody>
              </table>` : ''}

              <a href="${SITE}/planner/cash-control" style="display:inline-block;background:#6b1a2a;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;margin-top:8px;">
                Ver Cash Control
              </a>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      // Email failure is non-fatal — project is already closed
      console.error('[teqf-close] email error:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[teqf-close]', err);
    const message = err instanceof Error ? err.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
