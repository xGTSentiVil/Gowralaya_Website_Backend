import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(6, 'Phone number is required').max(20),
  message: z.string().min(1, 'Message is required').max(2000),
});

// The company WhatsApp number (update this)
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE || '919876543210';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@srigowralaya.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate
    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, phone, message } = result.data;

    // Build WhatsApp message
    const whatsappMessage = `New inquiry from website:\n\n` +
      `👤 Name: ${name}\n` +
      `📞 Phone: ${phone}\n` +
      `💬 Message: ${message}`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(whatsappMessage)}`;

    // Try to send email notification (optional — requires RESEND_API_KEY)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: 'Website Contact <onboarding@resend.dev>',
          to: CONTACT_EMAIL,
          subject: `New Website Inquiry from ${name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3C2415; border-bottom: 2px solid #C9A84C; padding-bottom: 12px;">
                New Contact Form Submission
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px; font-weight: bold; color: #6B4C3B; border-bottom: 1px solid #EDE4D3;">Name</td>
                  <td style="padding: 12px; border-bottom: 1px solid #EDE4D3;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; color: #6B4C3B; border-bottom: 1px solid #EDE4D3;">Phone</td>
                  <td style="padding: 12px; border-bottom: 1px solid #EDE4D3;">${phone}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; color: #6B4C3B; vertical-align: top;">Message</td>
                  <td style="padding: 12px;">${message}</td>
                </tr>
              </table>
              <p style="margin-top: 24px; color: #8B7355; font-size: 12px;">
                This email was sent from the Sri Gowralaya Builders website contact form.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been received. Redirecting to WhatsApp...',
      whatsappUrl,
    });
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
