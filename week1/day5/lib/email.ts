import nodemailer from 'nodemailer';

export interface SendInviteEmailParams {
  toEmail: string;
  orgName: string;
  inviteLink: string;
  role: string;
}

/**
 * Dispatches an organization invitation email to a user.
 * Supports SMTP environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).
 * If SMTP credentials are not set, falls back to logging the invitation preview link.
 */
export async function sendInviteEmail({
  toEmail,
  orgName,
  inviteLink,
  role,
}: SendInviteEmailParams): Promise<{ success: boolean; delivered: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"MultiTenant SaaS" <no-reply@saas.com>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; }
          .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
          .text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          .button { display: inline-block; background: linear-gradient(135deg, #FF6B2C, #FF8F5C); color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(255, 107, 44, 0.3); }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          .link { word-break: break-all; color: #FF6B2C; text-decoration: underline; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">You've been invited to join ${orgName}</div>
          <p class="text">
            An administrator from <strong>${orgName}</strong> has invited you to join their workspace as a <strong>${role}</strong>.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${inviteLink}" class="button" target="_blank">Accept Invitation & Join Workspace</a>
          </div>
          <p class="text">
            Or copy and paste this link into your browser:<br/>
            <a href="${inviteLink}" class="link">${inviteLink}</a>
          </p>
          <div class="footer">
            If you did not expect this invitation, you can safely ignore this email.
          </div>
        </div>
      </body>
    </html>
  `;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: toEmail,
        subject: `Invitation to join ${orgName} on MultiTenant SaaS`,
        html: htmlContent,
      });

      console.log(`[EMAIL DISPATCHED] Sent invitation email to ${toEmail}`);
      return { success: true, delivered: true };
    } catch (err: any) {
      console.error('[EMAIL ERROR] Failed to send SMTP email:', err);
      return { success: false, delivered: false, error: err.message };
    }
  } else {
    // Development Console Logging fallback
    console.log(`
======================================================================
[DEV EMAIL SIMULATION] INVITATION DISPATCHED
To: ${toEmail}
Organization: ${orgName}
Role: ${role}
Accept Invite Link: ${inviteLink}
======================================================================
    `);
    return { success: true, delivered: false };
  }
}
