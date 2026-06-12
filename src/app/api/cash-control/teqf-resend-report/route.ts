// Resend the email report for a closed TeQF project — any authenticated user
import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';
import { Resend } from 'resend';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY');
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
const TO   = 'admin@tequierofeliz.mx';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tequierofeliz.com';

function fmtMXN(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return d; }
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Token requerido.' }, { status: 401 });

    const decoded   = await adminAuth.verifyIdToken(token);
    const callerUid = decoded.uid;

    const { projectId } = await req.json() as { projectId: string };
    if (!projectId) return NextResponse.json({ error: 'projectId requerido.' }, { status: 400 });

    const projectRef  = firestore.collection('teqfProjects').doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
    }
    if (!projectSnap.data()?.isClosed) {
      return NextResponse.json({ error: 'El proyecto no está cerrado.' }, { status: 409 });
    }

    const projectData = projectSnap.data()!;

    // Fetch movements
    const movSnap = await firestore
      .collection('teqfProjects').doc(projectId).collection('cashControl')
      .orderBy('date', 'asc').get();

    // Compute totals
    let totalIncome  = 0;
    let totalExpense = 0;
    for (const d of movSnap.docs) {
      const mv = d.data();
      if (mv.type === 'income') totalIncome  += (mv.amount as number) ?? 0;
      else                       totalExpense += (mv.amount as number) ?? 0;
    }
    const saldo = totalIncome - totalExpense;
    const balanceColor = saldo >= 0 ? '#166534' : '#991b1b';

    // Per-user breakdown
    type UserEntry = { movements: FirebaseFirestore.DocumentData[]; income: number; expense: number };
    const userMap = new Map<string, UserEntry>();
    for (const d of movSnap.docs) {
      const mv   = d.data();
      const name = (mv.assignedTo as string) || 'Sin asignar';
      if (!userMap.has(name)) userMap.set(name, { movements: [], income: 0, expense: 0 });
      const entry = userMap.get(name)!;
      entry.movements.push(mv);
      if (mv.type === 'income') entry.income  += (mv.amount as number) ?? 0;
      else                       entry.expense += (mv.amount as number) ?? 0;
    }

    // Per-category breakdown
    const catMap = new Map<string, number>();
    for (const d of movSnap.docs) {
      const mv = d.data();
      if (mv.type !== 'expense') continue;
      const tags = mv.tags as string[] ?? [];
      const cat  = tags.length > 0 ? tags[0] : 'sin categoría';
      catMap.set(cat, (catMap.get(cat) ?? 0) + ((mv.amount as number) ?? 0));
    }
    const sortedCats = [...catMap.entries()].sort((a, b) => b[1] - a[1]);

    const callerRecord = await adminAuth.getUser(callerUid);
    const senderName   = callerRecord.displayName || callerRecord.email || callerUid;
    const closerName   = projectData.closerName as string || senderName;

    const summaryRows = `
      <tr style="border-bottom:1px solid #e5d9d0;">
        <td style="padding:10px 0;color:#555;font-size:14px;">Total entradas</td>
        <td style="padding:10px 0;text-align:right;color:#166534;font-weight:500;font-size:14px;">${fmtMXN(totalIncome)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5d9d0;">
        <td style="padding:10px 0;color:#555;font-size:14px;">Total gastos</td>
        <td style="padding:10px 0;text-align:right;color:#991b1b;font-weight:500;font-size:14px;">${fmtMXN(totalExpense)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 0;font-weight:600;color:#1a0f0a;font-size:14px;">Saldo final</td>
        <td style="padding:12px 0 0;text-align:right;font-weight:700;color:${balanceColor};font-size:16px;">${fmtMXN(saldo)}</td>
      </tr>`;

    let userSections = '';
    for (const [name, entry] of userMap) {
      const userBalance  = entry.income - entry.expense;
      const userBalColor = userBalance >= 0 ? '#166534' : '#991b1b';

      const movRows = entry.movements.map(mv => {
        const isInc = mv.type === 'income';
        const amt   = (mv.amount as number) ?? 0;
        const tags  = (mv.tags as string[] ?? []).join(', ');
        return `<tr style="border-bottom:1px solid #f5ede8;">
          <td style="padding:5px 0;color:#777;font-size:12px;white-space:nowrap;">${fmtDate(mv.date as string)}</td>
          <td style="padding:5px 0;color:#555;font-size:12px;">${mv.description ?? ''}${tags ? ` <span style="color:#aaa;">(${tags})</span>` : ''}</td>
          <td style="padding:5px 0;text-align:right;color:${isInc ? '#166534' : '#991b1b'};font-weight:500;font-size:12px;">${isInc ? '+' : '-'}${fmtMXN(amt)}</td>
        </tr>`;
      }).join('');

      const reimburseRow = userBalance < 0 ? `
        <div style="margin-top:8px;padding:8px 12px;background:#fef2f2;border-radius:6px;border-left:3px solid #991b1b;">
          <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">Da rimborsare a ${name}: ${fmtMXN(Math.abs(userBalance))}</p>
        </div>` : '';

      userSections += `
        <div style="margin-bottom:24px;">
          <p style="font-size:13px;font-weight:600;color:#1a0f0a;margin:0 0 8px;border-bottom:1px solid #e5d9d0;padding-bottom:6px;">${name}</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="border-bottom:1px solid #e5d9d0;">
              <th style="text-align:left;color:#aaa;font-size:11px;padding:4px 0;font-weight:500;">Fecha</th>
              <th style="text-align:left;color:#aaa;font-size:11px;padding:4px 0;font-weight:500;">Descripción</th>
              <th style="text-align:right;color:#aaa;font-size:11px;padding:4px 0;font-weight:500;">Monto</th>
            </tr></thead>
            <tbody>${movRows}</tbody>
          </table>
          <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:6px;border-top:1px solid #e5d9d0;">
            <span style="font-size:12px;color:#555;">Saldo personal</span>
            <span style="font-size:13px;font-weight:600;color:${userBalColor};">${fmtMXN(userBalance)}</span>
          </div>
          ${reimburseRow}
        </div>`;
    }

    const catRows = sortedCats.map(([cat, total]) =>
      `<tr style="border-bottom:1px solid #f5ede8;">
        <td style="padding:6px 0;color:#555;font-size:13px;text-transform:capitalize;">${cat}</td>
        <td style="padding:6px 0;text-align:right;color:#991b1b;font-weight:500;font-size:13px;">${fmtMXN(total)}</td>
      </tr>`
    ).join('');

    const projectName = projectData.name as string;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a0f0a;">
        <div style="background:#6b1a2a;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:400;letter-spacing:0.05em;">Te Quiero Feliz</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Cash Control · Reenvío de reporte</p>
        </div>
        <div style="background:#fff;padding:28px 32px;border:1px solid #e5d9d0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 4px;font-size:14px;color:#555;"><strong style="color:#1a0f0a;">Proyecto:</strong> ${projectName}</p>
          ${projectData.dateStart ? `<p style="margin:0 0 4px;font-size:14px;color:#555;"><strong style="color:#1a0f0a;">Abierto:</strong> ${fmtDate(projectData.dateStart as string)}</p>` : ''}
          ${projectData.closedAt ? `<p style="margin:0 0 4px;font-size:14px;color:#555;"><strong style="color:#1a0f0a;">Cerrado:</strong> ${fmtDate(projectData.closedAt as string)}</p>` : ''}
          <p style="margin:0 0 20px;font-size:14px;color:#555;"><strong style="color:#1a0f0a;">Reenviado por:</strong> ${senderName}</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">${summaryRows}</table>

          ${userSections ? `
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#1a0f0a;letter-spacing:0.08em;text-transform:uppercase;border-bottom:2px solid #e5d9d0;padding-bottom:8px;">Riepilogo per utente</p>
          ${userSections}` : ''}

          ${catRows ? `
          <p style="margin:20px 0 10px;font-size:11px;font-weight:600;color:#1a0f0a;letter-spacing:0.08em;text-transform:uppercase;border-bottom:2px solid #e5d9d0;padding-bottom:8px;">Gastos por categoría</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tbody>${catRows}</tbody></table>` : ''}

          <a href="${SITE}/planner/cash-control/${projectId}" style="display:inline-block;background:#6b1a2a;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;">
            Ver proyecto →
          </a>
        </div>
      </div>`;

    await getResend().emails.send({
      from:    FROM,
      to:      [TO],
      subject: `[Reenvío] Cierre Cash Control: ${projectName}`,
      html,
    });

    await projectRef.update({
      reportSentAt:      new Date().toISOString(),
      reportSentTo:      TO,
      reportEmailFailed: false,
    });

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    console.error('[teqf-resend-report]', err);
    const message = err instanceof Error ? err.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
