import { Resend } from "resend";
import { env } from "@/server/config/env";
import { logger } from "@/server/lib/logger";

interface InvitationEmailParams {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  invitationLink: string;
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resendClient && env.RESEND_API_KEY) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendInvitationEmail(params: InvitationEmailParams): Promise<{ id?: string; simulated?: boolean }> {
  const { to, inviterName, organizationName, role, invitationLink } = params;

  const client = getResendClient();

  if (!client) {
    // Development / test fallback when RESEND_API_KEY is not configured
    logger.info(
      {
        to,
        inviterName,
        organizationName,
        role,
        invitationLink,
      },
      `[DEV EMAIL] Invitation link for ${to}: ${invitationLink}`
    );
    return { id: `simulated-${Date.now()}`, simulated: true };
  }

  const fromAddress =
    env.EMAIL_FROM && !env.EMAIL_FROM.includes("yourdomain.com")
      ? env.EMAIL_FROM
      : "Team Collab <onboarding@resend.dev>";

  try {
    const { data, error } = await client.emails.send({
      from: fromAddress,
      to,
      subject: `You've been invited to join ${organizationName} on Team Collab`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #111827;">Team Invitation</h2>
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
          <div style="margin: 30px 0;">
            <a href="${invitationLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Or copy and paste this URL into your browser:<br />
            <a href="${invitationLink}" style="color: #2563eb;">${invitationLink}</a>
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">
            This invitation link is valid for ${env.INVITATION_EXPIRES_IN_HOURS} hours.
          </p>
        </div>
      `,
    });

    if (error) {
      logger.error({ error, to }, "Failed to send invitation email via Resend");
      // Don't crash the entire invite flow if email delivery fails, but log error
      return { simulated: false };
    }

    return { id: data?.id, simulated: false };
  } catch (err) {
    logger.error({ err, to }, "Exception while sending email via Resend");
    return { simulated: false };
  }
}
