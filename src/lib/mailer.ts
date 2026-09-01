import formData from "form-data";
import Mailgun from "mailgun.js";
import { env, hasMailgun, isProduction } from "./env";

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends via Mailgun when configured (BAM, 2026-08-31: Mailgun, not Resend). Without Mailgun
 * env it degrades to a console log so magic-link sign-in and the runway alert still work
 * end to end in local dev; in production a missing config is reported, never silently dropped.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<void> {
  // Development never sends real mail, even with Mailgun configured in .env.local: the
  // message logs to the console instead (a dev magic-link once emailed a real address,
  // 2026-08-31). Deployed preview/production environments send normally.
  if (!hasMailgun || !isProduction) {
    if (isProduction) {
      // Log no addresses or bodies in production (shared logging/PII rule).
      console.error("[mailer] Mailgun is not configured; message not sent");
      return;
    }
    console.log(`\n[mailer:dev] (${hasMailgun ? "dev never sends real mail" : "Mailgun not configured"}, logging instead)\n  To: ${to}\n  Subject: ${subject}\n  ${text}\n`);
    return;
  }

  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: "api",
    key: env.MAILGUN_API_KEY as string,
    url: env.MAILGUN_REGION === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net",
  });

  await mg.messages.create(env.MAILGUN_DOMAIN as string, {
    from: env.MAIL_FROM ?? `VO GOAT <noreply@${env.MAILGUN_DOMAIN}>`,
    to: [to],
    subject,
    text,
    ...(html ? { html } : {}),
  });
}
