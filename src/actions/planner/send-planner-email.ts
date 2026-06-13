'use server';

import { Resend } from 'resend';
import { PlannerEvent } from '@/lib/planner-types';
import { Lang, DT, LOCALE_MAP } from '@/lib/planner-i18n';

function formatTime(t: string) {
  if (!t) return '—';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${period}`;
}

function formatDate(iso: string, locale: string) {
  if (!iso) return iso;
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export async function sendPlannerEventEmail(
  event: PlannerEvent,
  lang: Lang = 'en'
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const dt = DT[lang];
    const locale = LOCALE_MAP[lang];

    const daysHtml = event.days.length === 0
      ? `<p>${dt.noFurnitureSelected}</p>`
      : event.days.map((day, idx) => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #e8ddd4;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#f9f3ef;padding:10px 14px;font-weight:600;color:#3d1a1a;">
            📅 ${dt.daySection(idx + 1, formatDate(day.date, locale))}${day.eventName ? ` — ${day.eventName}` : ''}
          </td></tr>
          <tr><td style="padding:10px 14px;font-size:13px;color:#4a4a4a;">
            ${day.venue ? `<p style="margin:4px 0;"><strong>${dt.venue}:</strong> ${day.venue}${day.venueAddress ? ` · ${day.venueAddress}` : ''}</p>` : ''}
            ${day.notes ? `<p style="margin:4px 0;"><strong>Note:</strong> ${day.notes}</p>` : ''}
            <p style="margin:4px 0;">
              <strong>${dt.setup}:</strong> ${formatTime(day.setupTime)} &nbsp;|&nbsp;
              <strong>${dt.eventStart}:</strong> ${formatTime(day.eventStartTime ?? '')} &nbsp;|&nbsp;
              <strong>${dt.breakdown}:</strong> ${formatTime(day.breakdownTime)} &nbsp;|&nbsp;
              <strong>${dt.supplierAccess}:</strong> ${formatTime(day.supplierAccessTime)}
            </p>
            ${day.supplierRegulationUrl ? `<p style="margin:4px 0;"><strong>${dt.documents}:</strong> <a href="${day.supplierRegulationUrl}">Download</a></p>` : ''}
            ${day.layoutUrls?.length ? `<p style="margin:4px 0;"><strong>Layout:</strong> ${day.layoutUrls.map((u, i) => `<a href="${u}">Layout ${i + 1}</a>`).join(', ')}</p>` : ''}
          </td></tr>
        </table>
      `).join('');

    const allFurniture = event.days.flatMap(d => d.selectedFurniture ?? []);
    const allFlowers   = event.days.flatMap(d => d.selectedFlowers ?? []);

    const furnitureTotal = allFurniture.reduce((s, i) => s + i.price * i.quantity, 0);
    const flowersTotal   = allFlowers.reduce((s, i) => s + i.price * i.quantity, 0);
    const grandTotal     = furnitureTotal + flowersTotal;

    const furnitureRows = allFurniture.map(i => `
      <tr>
        <td style="padding:5px 8px;font-size:13px;color:#3d1a1a;">${i.itemName}</td>
        <td style="padding:5px 8px;font-size:13px;text-align:center;">×${i.quantity}</td>
        <td style="padding:5px 8px;font-size:13px;text-align:right;">$${(i.price * i.quantity).toLocaleString('es-MX')} MXN</td>
      </tr>
    `).join('');

    const flowerRows = allFlowers.map(i => `
      <tr>
        <td style="padding:5px 8px;font-size:13px;color:#3d1a1a;">${i.itemName}</td>
        <td style="padding:5px 8px;font-size:13px;text-align:center;">×${i.quantity} ${i.unit}</td>
        <td style="padding:5px 8px;font-size:13px;text-align:right;">$${(i.price * i.quantity).toLocaleString('es-MX')} MXN</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9f3ef;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f3ef;padding:32px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;border:1px solid #e8ddd4;">

        <tr><td style="background:#3d1a1a;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#f9f3ef;font-size:22px;font-weight:400;letter-spacing:0.05em;">${dt.newEventReceived}</h1>
          <p style="margin:8px 0 0;color:#c8a9a9;font-size:14px;font-family:Arial,sans-serif;">Te Quiero Feliz — Planner</p>
        </td></tr>

        <tr><td style="padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f3ef;border-radius:8px;padding:16px;margin-bottom:24px;">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#888;font-family:Arial,sans-serif;width:140px;">${dt.eventCode}</td>
              <td style="padding:4px 0;font-size:15px;font-weight:600;color:#3d1a1a;letter-spacing:0.06em;">${event.eventCode}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#888;font-family:Arial,sans-serif;">${dt.client}</td>
              <td style="padding:4px 0;font-size:14px;color:#3d1a1a;">${event.clientName || '—'}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#888;font-family:Arial,sans-serif;">${dt.city}</td>
              <td style="padding:4px 0;font-size:14px;color:#3d1a1a;">${event.city || '—'}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#888;font-family:Arial,sans-serif;">${dt.plannerSection}</td>
              <td style="padding:4px 0;font-size:14px;color:#3d1a1a;">${event.plannerName} &lt;${event.plannerEmail}&gt;</td>
            </tr>
          </table>

          <h2 style="font-size:14px;color:#3d1a1a;margin:0 0 12px;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.08em;">${dt.eventDetails}</h2>
          ${daysHtml}

          <h2 style="font-size:14px;color:#3d1a1a;margin:24px 0 12px;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.08em;">${dt.furnitureSection}</h2>
          ${allFurniture.length > 0 ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8ddd4;border-radius:8px;overflow:hidden;">
            <tr style="background:#f9f3ef;">
              <th style="padding:6px 8px;font-size:12px;text-align:left;color:#888;font-family:Arial,sans-serif;font-weight:400;">${dt.item}</th>
              <th style="padding:6px 8px;font-size:12px;text-align:center;color:#888;font-family:Arial,sans-serif;font-weight:400;">${dt.qty}</th>
              <th style="padding:6px 8px;font-size:12px;text-align:right;color:#888;font-family:Arial,sans-serif;font-weight:400;">${dt.total}</th>
            </tr>
            ${furnitureRows}
            <tr style="background:#f9f3ef;border-top:1px solid #e8ddd4;">
              <td colspan="2" style="padding:8px;font-size:13px;font-weight:600;color:#3d1a1a;">${dt.subtotalFurniture}</td>
              <td style="padding:8px;font-size:13px;font-weight:600;color:#3d1a1a;text-align:right;">$${furnitureTotal.toLocaleString('es-MX')} MXN</td>
            </tr>
          </table>` : `<p style="color:#888;font-size:13px;font-family:Arial,sans-serif;">${dt.noFurnitureSelected}</p>`}

          <h2 style="font-size:14px;color:#3d1a1a;margin:24px 0 12px;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.08em;">${dt.flowersSection}</h2>
          ${allFlowers.length > 0 ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8ddd4;border-radius:8px;overflow:hidden;">
            <tr style="background:#f9f3ef;">
              <th style="padding:6px 8px;font-size:12px;text-align:left;color:#888;font-family:Arial,sans-serif;font-weight:400;">${dt.flower}</th>
              <th style="padding:6px 8px;font-size:12px;text-align:center;color:#888;font-family:Arial,sans-serif;font-weight:400;">${dt.quantity}</th>
              <th style="padding:6px 8px;font-size:12px;text-align:right;color:#888;font-family:Arial,sans-serif;font-weight:400;">${dt.total}</th>
            </tr>
            ${flowerRows}
            <tr style="background:#f9f3ef;border-top:1px solid #e8ddd4;">
              <td colspan="2" style="padding:8px;font-size:13px;font-weight:600;color:#3d1a1a;">${dt.subtotalFlowers}</td>
              <td style="padding:8px;font-size:13px;font-weight:600;color:#3d1a1a;text-align:right;">$${flowersTotal.toLocaleString('es-MX')} MXN</td>
            </tr>
          </table>` : `<p style="color:#888;font-size:13px;font-family:Arial,sans-serif;">${dt.noFlowersSelected}</p>`}

          ${grandTotal > 0 ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#3d1a1a;border-radius:8px;">
            <tr>
              <td style="padding:14px 16px;color:#f9f3ef;font-size:14px;font-family:Arial,sans-serif;">${dt.estimatedTotal}</td>
              <td style="padding:14px 16px;color:white;font-size:18px;text-align:right;font-weight:300;">$${grandTotal.toLocaleString('es-MX')} MXN</td>
            </tr>
          </table>` : ''}

          ${event.notes ? `
          <h2 style="font-size:14px;color:#3d1a1a;margin:24px 0 8px;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.08em;">${dt.generalNotes}</h2>
          <p style="font-size:13px;color:#4a4a4a;font-family:Arial,sans-serif;line-height:1.6;background:#f9f3ef;padding:12px;border-radius:8px;">${event.notes.replace(/\n/g, '<br>')}</p>` : ''}
        </td></tr>

        <tr><td style="background:#f9f3ef;padding:16px 32px;text-align:center;border-top:1px solid #e8ddd4;">
          <p style="margin:0;font-size:12px;color:#aaa;font-family:Arial,sans-serif;">Te Quiero Feliz · Planner Portal</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await resend.emails.send({
      from: 'Te Quiero Feliz <onboarding@resend.dev>',
      to: 'admin@tequierofeliz.mx',
      subject: `${dt.newEventReceived}: ${event.eventCode}${event.clientName ? ` — ${event.clientName}` : ''}`,
      html,
    });

    return { success: true };
  } catch (e: any) {
    console.error('Planner email error:', e);
    return { success: false, error: e.message };
  }
}
