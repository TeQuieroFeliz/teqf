import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const { email, name, teams } = await req.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });

    const resend = new Resend(apiKey);
    const displayName = name || email.split('@')[0];
    const teamLabel = Array.isArray(teams) ? teams.join(' + ') : String(teams ?? '');

    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: 'Team assegnato — puoi accedere a Te Quiero Feliz ✓',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a0f0a;">
          <div style="background:#6b1a2a;padding:28px 32px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:400;letter-spacing:0.05em;">Te Quiero Feliz</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Area Planner</p>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e5d9d0;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin:0 0 16px;font-size:16px;">Ciao <strong>${displayName}</strong>,</p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#555;">
              Sei stato/a assegnato/a al team <strong>${teamLabel}</strong> nell'Area Planner di Te Quiero Feliz.
            </p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
              Puoi ora accedere alla piattaforma con le tue credenziali.
            </p>
            <a href="${SITE}/planner/login"
               style="display:inline-block;background:#6b1a2a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
              Accedi all'Area Planner
            </a>
            <p style="margin:28px 0 0;font-size:12px;color:#999;">
              Per assistenza scrivi a <a href="mailto:admin@tequierofeliz.com" style="color:#6b1a2a;">admin@tequierofeliz.com</a>
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[email/team-assigned]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
