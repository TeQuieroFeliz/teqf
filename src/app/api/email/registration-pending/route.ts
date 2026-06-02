import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@tequierofeliz.com';

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });

    const resend = new Resend(apiKey);
    const displayName = name || email.split('@')[0];

    // Send both emails in parallel
    await Promise.all([
      // 1. Confirm to the new user
      resend.emails.send({
        from: FROM,
        to: [email],
        subject: 'Registrazione ricevuta — Te Quiero Feliz',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a0f0a;">
            <div style="background:#6b1a2a;padding:28px 32px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:400;letter-spacing:0.05em;">Te Quiero Feliz</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Area Planner</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e5d9d0;border-top:none;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 16px;font-size:16px;">Ciao <strong>${displayName}</strong>,</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#555;">
                La tua registrazione all'<strong>Area Planner</strong> di Te Quiero Feliz è stata ricevuta con successo.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
                Il team esaminerà la tua richiesta a breve. Riceverai una email appena il tuo account sarà approvato e potrai accedere alla piattaforma.
              </p>
              <p style="margin:28px 0 0;font-size:12px;color:#999;">
                Per assistenza scrivi a <a href="mailto:${ADMIN_EMAIL}" style="color:#6b1a2a;">${ADMIN_EMAIL}</a>
              </p>
            </div>
          </div>
        `,
      }),

      // 2. Notify admin
      resend.emails.send({
        from: FROM,
        to: [ADMIN_EMAIL],
        subject: `Nuova registrazione — ${displayName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a0f0a;">
            <div style="background:#6b1a2a;padding:28px 32px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:400;letter-spacing:0.05em;">Te Quiero Feliz</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Area Admin</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e5d9d0;border-top:none;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 16px;font-size:16px;">Nuova registrazione in attesa</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#555;">
                <strong>${displayName}</strong> (<a href="mailto:${email}" style="color:#6b1a2a;">${email}</a>)
                si è registrato/a all'Area Planner ed è in attesa di approvazione.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
                Accedi al pannello per approvare o rifiutare la richiesta.
              </p>
              <a href="${SITE}/planner/requests"
                 style="display:inline-block;background:#6b1a2a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
                Gestisci richieste
              </a>
            </div>
          </div>
        `,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[email/registration-pending]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
