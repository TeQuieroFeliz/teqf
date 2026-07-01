// SEZIONE 1.2: single point for Resend sends that need a persistent delivery log.
// Centralized here so every close/resend path logs the same way and gets the same
// one-shot retry, instead of each route reimplementing try/catch around Resend.
import { firestore } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY');
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

export async function sendEmailWithRetry(params: {
  to: string[];
  subject: string;
  html: string;
  logType: string;
  projectId: string;
  projectName: string;
  sentBy: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, logType, projectId, projectName, sentBy } = params;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await getResend().emails.send({ from: FROM, to, subject, html });
      if (firestore) {
        await firestore.collection('emailLogs').add({
          type: logType,
          projectId,
          projectName,
          to,
          subject,
          status: 'success',
          attempt,
          sentBy,
          createdAt: FieldValue.serverTimestamp(),
        }).catch(err => console.error(`[${logType}] failed to write emailLogs:`, err));
      }
      return { success: true };
    } catch (err) {
      lastError = err;
      console.error(`[${logType}] email send attempt ${attempt} failed:`, err);
      if (attempt === 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown error';
  if (firestore) {
    await firestore.collection('emailLogs').add({
      type: logType,
      projectId,
      projectName,
      to,
      subject,
      status: 'failed',
      error: message,
      sentBy,
      createdAt: FieldValue.serverTimestamp(),
    }).catch(err => console.error(`[${logType}] failed to write emailLogs:`, err));
  }
  return { success: false, error: message };
}
