'use server';

import { auth, firestore } from '@/firebase/server';
import { PlannerRequest, TeamRole } from '@/lib/planner-types';
import { permissionsFor, teamRoleFor } from '@/lib/user-permissions';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY environment variable.');
  return new Resend(apiKey);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const reqRef  = firestore.collection('plannerRequests');
const planRef = firestore.collection('planners');

// ── Email helpers ─────────────────────────────────────────────────────────────

async function sendAdminNewRequestEmail(name: string, email: string, phone?: string): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM,
    to: ['admin@tequierofeliz.com'],
    subject: `Nuova richiesta di accesso — ${name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a0f0a;">
        <div style="background:#6b1a2a;padding:28px 32px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:400;letter-spacing:0.05em;">Te Quiero Feliz</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Area Admin</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5d9d0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 16px;font-size:16px;">Nuova richiesta di accesso</p>
          <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#555;">
            <strong>${name}</strong> (<a href="mailto:${email}" style="color:#6b1a2a;">${email}</a>${phone ? ` · ${phone}` : ''})
            ha inviato una richiesta di accesso all'<strong>Area Planner</strong>.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
            Accedi al pannello per approvarla o rifiutarla.
          </p>
          <a href="${SITE}/planner/requests"
             style="display:inline-block;background:#6b1a2a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Vai al pannello
          </a>
        </div>
      </div>
    `,
  });
  if (error) throw new Error(`Resend: ${(error as any).message ?? JSON.stringify(error)}`);
}

async function sendApprovalEmail(name: string, email: string): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: 'Il tuo accesso a Te Quiero Feliz è stato approvato ✓',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a0f0a;">
        <div style="background:#6b1a2a;padding:28px 32px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:400;letter-spacing:0.05em;">Te Quiero Feliz</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Area Planner</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5d9d0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 16px;font-size:16px;">Ciao <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#555;">
            La tua richiesta di accesso all'<strong>Area Planner</strong> di Te Quiero Feliz
            è stata <strong style="color:#15803d;">approvata</strong>! 🎉
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
            Hai ricevuto le credenziali di accesso. Accedi con l'email e la password temporanea che ti è stata fornita.
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
  if (error) throw new Error(`Resend: ${(error as any).message ?? JSON.stringify(error)}`);
}

async function sendRejectionEmail(name: string, email: string): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: 'Aggiornamento sulla tua richiesta di accesso — Te Quiero Feliz',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a0f0a;">
        <div style="background:#6b1a2a;padding:28px 32px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:400;letter-spacing:0.05em;">Te Quiero Feliz</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Area Planner</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5d9d0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 16px;font-size:16px;">Ciao <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#555;">
            Grazie per aver richiesto l'accesso all'Area Planner di Te Quiero Feliz.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
            Purtroppo la tua richiesta non è stata approvata in questo momento.
            Se pensi si tratti di un errore, contatta il team di Te Quiero Feliz.
          </p>
          <a href="mailto:admin@tequierofeliz.com"
             style="display:inline-block;background:#6b1a2a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Contatta il team
          </a>
          <p style="margin:28px 0 0;font-size:12px;color:#999;">
            Te Quiero Feliz — <a href="${SITE}" style="color:#6b1a2a;">tequierofeliz.com</a>
          </p>
        </div>
      </div>
    `,
  });
  if (error) throw new Error(`Resend: ${(error as any).message ?? JSON.stringify(error)}`);
}

// ── Public actions ────────────────────────────────────────────────────────────

// Called from the public /sign-up page (no password — admin sets one during approval)
export async function createSignupRequest(
  name: string,
  email: string,
  phone: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await reqRef.where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      const status = existing.docs[0].data().status;
      if (status === 'pending')  return { success: false, error: 'Hai già una richiesta in attesa di approvazione.' };
      if (status === 'rejected') return { success: false, error: "La tua richiesta è stata rifiutata. Contatta l'amministratore." };
      return { success: false, error: 'Sei già registrata. Accedi con le tue credenziali.' };
    }
    const alreadyPlanner = await planRef.where('email', '==', email).limit(1).get();
    if (!alreadyPlanner.empty) {
      return { success: false, error: 'Sei già registrata. Accedi con le tue credenziali.' };
    }
    await reqRef.add({ name, email, phone, status: 'pending', createdAt: new Date().toISOString() });
    sendAdminNewRequestEmail(name, email, phone).catch((e) =>
      console.error('[createSignupRequest] admin email error:', e.message)
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Legacy: kept for backward compat with old /planner/register page
export async function createPlannerRequest(
  name: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  return createSignupRequest(name, email, '');
}

export async function getPlannerRequestByEmail(email: string): Promise<PlannerRequest | null> {
  const snap = await reqRef.where('email', '==', email).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as Omit<PlannerRequest, 'id'>) };
}

export async function getPendingRequests(): Promise<PlannerRequest[]> {
  const snap = await reqRef.where('status', '==', 'pending').get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<PlannerRequest, 'id'>) }))
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}

// Called during approval — creates Firebase Auth account + planner record with teamRole
export async function approvePlannerRequest(
  requestId: string,
  email: string,
  name: string,
  teamRole: TeamRole,
  tempPassword: string,
  phone?: string
): Promise<{ success: boolean; emailSent: boolean; error?: string; emailError?: string }> {
  try {
    // Create or update Firebase Auth account with the temp password set by admin
    let uid: string;
    try {
      const existingUser = await auth!.getUserByEmail(email);
      uid = existingUser.uid;
      await auth!.updateUser(uid, { password: tempPassword });
    } catch (authErr: any) {
      if (authErr.code === 'auth/user-not-found') {
        const newUser = await auth!.createUser({ email, password: tempPassword });
        uid = newUser.uid;
      } else {
        throw authErr;
      }
    }

    // Create / update planner record keyed by UID
    await planRef.doc(uid).set({
      email,
      name,
      phone: phone ?? '',
      teamRole,
      status:  'approved',
      active:  true,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    }, { merge: true });

    await reqRef.doc(requestId).update({ status: 'approved' });
    revalidatePath('/planner/requests');

    let emailSent = false;
    let emailError: string | undefined;
    try {
      await sendApprovalEmail(name, email);
      emailSent = true;
    } catch (emailErr: any) {
      emailError = emailErr.message;
      console.error('[approvePlannerRequest] email error:', emailErr.message);
    }

    return { success: true, emailSent, emailError };
  } catch (e: any) {
    return { success: false, emailSent: false, error: e.message };
  }
}

export async function rejectPlannerRequest(
  requestId: string,
  email: string,
  name: string
): Promise<{ success: boolean; emailSent: boolean; error?: string; emailError?: string }> {
  try {
    await reqRef.doc(requestId).update({ status: 'rejected' });
    revalidatePath('/planner/requests');

    // Mark planners doc as rejected + clean up Auth account
    try {
      const user = await auth!.getUserByEmail(email);
      await firestore.collection('planners').doc(user.uid).set(
        { status: 'rejected', active: false },
        { merge: true }
      );
      await auth!.deleteUser(user.uid);
    } catch (authErr: any) {
      if (authErr.code !== 'auth/user-not-found') {
        console.error('[rejectPlannerRequest] auth/planners error:', authErr.message);
      }
    }

    let emailSent = false;
    let emailError: string | undefined;
    try {
      await sendRejectionEmail(name, email);
      emailSent = true;
    } catch (emailErr: any) {
      emailError = emailErr.message;
      console.error('[rejectPlannerRequest] email error:', emailErr.message);
    }

    return { success: true, emailSent, emailError };
  } catch (e: any) {
    return { success: false, emailSent: false, error: e.message };
  }
}

// New approval flow — user self-registered with their own password.
// Updates users/{uid} + creates/updates planners/{uid}. No password handling.
export async function approveRegistration(
  requestId: string,
  email: string,
  name: string,
  teamRole: TeamRole,
  requestUid?: string,
): Promise<{ success: boolean; emailSent: boolean; error?: string; emailError?: string }> {
  try {
    const teams       = teamRole === 'xb_planner' ? ['XB']
                      : teamRole === 'teqf_user'  ? ['TeQF']
                      : ['XB', 'TeQF'];
    const permissions = permissionsFor(teams);
    const now         = new Date().toISOString();

    // Resolve Firebase Auth UID
    let uid: string;
    if (requestUid) {
      uid = requestUid;
    } else {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
    }

    // Update users/{uid}
    await firestore.collection('users').doc(uid).set(
      { email, name, team: teams, teamRole, permissions, status: 'approved', active: true, approvedAt: now },
      { merge: true }
    );

    // Create / update planners/{uid} so PlannerAuthContext can find the user
    await firestore.collection('planners').doc(uid).set(
      { email, name, team: teams, teamRole, permissions, status: 'approved', active: true, mustChangePassword: false, approvedAt: now },
      { merge: true }
    );

    // Mark request as approved
    await reqRef.doc(requestId).update({ status: 'approved' });
    revalidatePath('/planner/requests');

    let emailSent = false;
    let emailError: string | undefined;
    try {
      await sendApprovalEmail(name, email);
      emailSent = true;
    } catch (emailErr: any) {
      emailError = emailErr.message;
      console.error('[approveRegistration] email error:', emailErr.message);
    }

    return { success: true, emailSent, emailError };
  } catch (e: any) {
    return { success: false, emailSent: false, error: e.message };
  }
}
