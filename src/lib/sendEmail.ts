'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEventSummaryEmail({ to, event, subEvents }: any) {
  try {
    const emailSubject = `✨ Event Summary: ${event.title}`;

    // Generate sub-event sections with color display
    const subEventSections = subEvents.map((subEvent: any, index: number) => {
      const itemRows = (subEvent.items || [])
        .map((item: any, i: number) => {
          // Generate color chips
          const colorChips = item.colors
            .map(
              (color: any) => `
            <span class="color-chip" style="background-color: ${color.code};">
              ${color.name} (${color.quantity})
            </span>
          `
            )
            .join('');

          return `
            <tr>
              <td>${i + 1}</td>
              <td>
                <div class="item-name">${item.name}</div>
                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
              </td>
              <td>${item?.categoryName}</td>
              <td class="color-chips">${colorChips}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <div class="subevent">
          <h2 class="subevent-title">
            <span class="event-number">${index + 1}.</span>
            ${subEvent.subEventName}
          </h2>
          <div class="event-details">
            <div class="detail">
              <span class="detail-label">Date:</span>
              ${new Date(subEvent.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div class="detail">
              <span class="detail-label">Time:</span>
              ${subEvent.startTime} - ${subEvent.finishTime}
            </div>
            <div class="detail">
              <span class="detail-label">Location:</span>
              ${subEvent.address}, ${subEvent.city}
            </div>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Category</th>
                <th>Colors</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </div>
      `;
    });

    // Email HTML template
    const emailHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${emailSubject}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        font-size: 14px;
        color: #333;
        background: #fff;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      h1 {
        font-size: 20px;
        margin-bottom: 10px;
      }
      h2 {
        font-size: 16px;
        margin-top: 20px;
        margin-bottom: 10px;
      }
      .detail {
        margin-bottom: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        margin-bottom: 20px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 6px 8px;
        text-align: left;
      }
      th {
        background: #f0f0f0;
      }
      .color-chip {
        display: inline-block;
        padding: 2px 6px;
        font-size: 12px;
        border-radius: 4px;
        color: #fff;
        margin: 2px 2px 2px 0;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        color: #888;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${event.title} Summary</h1>
      <p>Event Details:</p>
      ${subEvents
        .map((subEvent: any, index: number) => {
          const itemRows = (subEvent.items || [])
            .map((item: any, i: number) => {
              const colorChips = item.colors
                .map(
                  (color: any) =>
                    `<span class="color-chip" style="background-color: ${color.code}">${color.name} (${color.quantity})</span>`
                )
                .join(' ');

              return `
            <tr>
              <td>${i + 1}</td>
              <td>${item.name}</td>
              <td>${item?.categoryName}</td>
              <td>${colorChips}</td>
            </tr>`;
            })
            .join('');

          return `
          <h2>${index + 1}. ${subEvent.subEventName}</h2>
          <div class="detail"><strong>Date:</strong> ${new Date(subEvent.date).toLocaleDateString()}</div>
          <div class="detail"><strong>Time:</strong> ${subEvent.startTime} - ${subEvent.finishTime}</div>
          <div class="detail"><strong>Location:</strong> ${subEvent.address}, ${subEvent.city}</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Category</th>
                <th>Colors</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        `;
        })
        .join('')}
      <div class="footer">
        <p>Thank you for using our service.</p>
        <p>Contact support if you need help.</p>
      </div>
    </div>
  </body>
  </html>
`;
    const { data, error } = await resend.emails.send({
      from: process.env.COMPANY_EMAIL!,
      to: [to],
      subject: emailSubject,
      html: emailHtml,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, message: error.message || (error as any).error };
    }

    return { success: true, message: 'Event summary email sent successfully.' };
  } catch (error) {
    console.error('Unexpected email error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while sending the email.',
    };
  }
}
