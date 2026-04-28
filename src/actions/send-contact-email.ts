'use server';

import { Resend } from 'resend';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  eventCity: string;
  eventDate: string;
  message: string;
}

export async function sendContactEmail(data: ContactFormData) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Te Quiero Feliz <onboarding@resend.dev>',
      to: 'admin@tequierofeliz.mx',
      subject: `New Event Inquiry – ${data.eventType} in ${data.eventCity}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
        <p><strong>Event Type:</strong> ${data.eventType}</p>
        <p><strong>Event City:</strong> ${data.eventCity}</p>
        <p><strong>Event Date:</strong> ${data.eventDate || 'Not provided'}</p>
        <p><strong>Message:</strong></p>
        <p>${data.message.replace(/\n/g, '<br>')}</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
