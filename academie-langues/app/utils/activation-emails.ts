import { sendEmail } from "@/app/utils/email-server";
import { nexaOfferLabel } from "@/app/data/nexaOffers";

function siteLoginUrl(locale: "fr" | "en" = "fr") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://nexa.fr").replace(/\/$/, "");
  return `${base}/login?lang=${locale}`;
}

function formatDate(value: string | null | undefined, locale: "fr" | "en") {
  if (!value) return null;
  return new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(amount: number | null | undefined) {
  if (amount == null || !Number.isFinite(amount)) return null;
  return `${Math.trunc(amount).toLocaleString("fr-FR")} FCFA`;
}

/** Email non bloquant : l'activation réussit même si l'envoi échoue. */
export async function sendCenterActivatedEmail(input: {
  to: string | null | undefined;
  centerName: string;
  offerKey: string | null | undefined;
  amount?: number | null;
  periodMonths?: number | null;
  renewalAt?: string | null;
  locale?: "fr" | "en";
}) {
  const to = input.to?.trim();
  if (!to) return { sent: false, skipped: true as const };

  const locale = input.locale ?? "fr";
  const offer = nexaOfferLabel(input.offerKey, locale);
  const amount = formatAmount(input.amount);
  const renewal = formatDate(input.renewalAt, locale);
  const period = input.periodMonths && input.periodMonths > 0 ? input.periodMonths : 1;
  const loginUrl = siteLoginUrl(locale);

  const subject =
    locale === "en"
      ? `Your center “${input.centerName}” is now active on Nexa`
      : `Votre centre « ${input.centerName} » est activé sur Nexa`;

  const text =
    locale === "en"
      ? [
          `Hello,`,
          ``,
          `Your center “${input.centerName}” has been activated on Nexa.`,
          `Plan: ${offer}`,
          amount ? `Amount: ${amount} / month` : null,
          `Billing period: ${period} month(s)`,
          renewal ? `Next renewal: ${renewal}` : null,
          ``,
          `Sign in to your dashboard: ${loginUrl}`,
          ``,
          `— The Nexa team`,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `Bonjour,`,
          ``,
          `Votre centre « ${input.centerName} » a été activé sur Nexa.`,
          `Offre : ${offer}`,
          amount ? `Montant : ${amount} / mois` : null,
          `Période : ${period} mois`,
          renewal ? `Prochain renouvellement : ${renewal}` : null,
          ``,
          `Connectez-vous à votre espace : ${loginUrl}`,
          ``,
          `— L’équipe Nexa`,
        ]
          .filter(Boolean)
          .join("\n");

  try {
    return await sendEmail({ to, subject, text });
  } catch (error) {
    console.error("[activation-email] center:", error);
    return { sent: false, skipped: false };
  }
}

export async function sendStudentActivatedEmail(input: {
  to: string | null | undefined;
  studentName: string;
  centerName?: string | null;
  locale?: "fr" | "en";
}) {
  const to = input.to?.trim();
  if (!to) return { sent: false, skipped: true as const };

  const locale = input.locale ?? "fr";
  const loginUrl = siteLoginUrl(locale);
  const centerBit = input.centerName?.trim()
    ? locale === "en"
      ? ` at ${input.centerName.trim()}`
      : ` au centre ${input.centerName.trim()}`
    : "";

  const subject =
    locale === "en"
      ? `Your Nexa account is activated`
      : `Votre compte Nexa est activé`;

  const text =
    locale === "en"
      ? [
          `Hello ${input.studentName},`,
          ``,
          `Your learner account${centerBit} has been activated.`,
          `You can now sign in and start learning.`,
          ``,
          `Sign in: ${loginUrl}`,
          ``,
          `— The Nexa team`,
        ].join("\n")
      : [
          `Bonjour ${input.studentName},`,
          ``,
          `Votre compte apprenant${centerBit} a été activé.`,
          `Vous pouvez maintenant vous connecter et commencer.`,
          ``,
          `Connexion : ${loginUrl}`,
          ``,
          `— L’équipe Nexa`,
        ].join("\n");

  try {
    return await sendEmail({ to, subject, text });
  } catch (error) {
    console.error("[activation-email] student:", error);
    return { sent: false, skipped: false };
  }
}

export async function sendCenterTrialAlertEmail(input: {
  to: string | null | undefined;
  centerName: string;
  daysLeft: number;
  endsAt?: string | null;
  locale?: "fr" | "en";
}) {
  const to = input.to?.trim();
  if (!to) return { sent: false, skipped: true as const };

  const locale = input.locale ?? "fr";
  const loginUrl = siteLoginUrl(locale);
  const endDate = formatDate(input.endsAt, locale);
  const urgent = input.daysLeft <= 1;

  const subject =
    locale === "en"
      ? urgent
        ? `Trial ending soon — ${input.centerName}`
        : `Your Nexa trial for “${input.centerName}” ends in ${input.daysLeft} day(s)`
      : urgent
        ? `Essai bientôt terminé — ${input.centerName}`
        : `Votre essai Nexa pour « ${input.centerName} » se termine dans ${input.daysLeft} j`;

  const text =
    locale === "en"
      ? [
          `Hello,`,
          ``,
          `The trial for your center “${input.centerName}” is ending soon.`,
          endDate ? `End date: ${endDate}` : null,
          `Please contact the Nexa team to activate your subscription.`,
          ``,
          `Sign in: ${loginUrl}`,
          ``,
          `— The Nexa team`,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `Bonjour,`,
          ``,
          `L’essai de votre centre « ${input.centerName} » touche à sa fin.`,
          endDate ? `Date de fin : ${endDate}` : null,
          `Contactez l’équipe Nexa pour activer votre abonnement.`,
          ``,
          `Connexion : ${loginUrl}`,
          ``,
          `— L’équipe Nexa`,
        ]
          .filter(Boolean)
          .join("\n");

  try {
    return await sendEmail({ to, subject, text });
  } catch (error) {
    console.error("[activation-email] trial-alert:", error);
    return { sent: false, skipped: false };
  }
}

export async function sendCenterRenewalAlertEmail(input: {
  to: string | null | undefined;
  centerName: string;
  daysLeft: number;
  renewalAt?: string | null;
  amount?: number | null;
  locale?: "fr" | "en";
}) {
  const to = input.to?.trim();
  if (!to) return { sent: false, skipped: true as const };

  const locale = input.locale ?? "fr";
  const loginUrl = siteLoginUrl(locale);
  const renewal = formatDate(input.renewalAt, locale);
  const amount = formatAmount(input.amount);

  const subject =
    locale === "en"
      ? `Renewal reminder — ${input.centerName} (${input.daysLeft}d)`
      : `Rappel renouvellement — ${input.centerName} (${input.daysLeft} j)`;

  const text =
    locale === "en"
      ? [
          `Hello,`,
          ``,
          `Your Nexa subscription for “${input.centerName}” renews soon.`,
          renewal ? `Renewal date: ${renewal}` : null,
          amount ? `Amount: ${amount} / month` : null,
          ``,
          `Sign in to your dashboard: ${loginUrl}`,
          ``,
          `— The Nexa team`,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `Bonjour,`,
          ``,
          `L’abonnement Nexa de votre centre « ${input.centerName} » arrive à échéance.`,
          renewal ? `Date de renouvellement : ${renewal}` : null,
          amount ? `Montant : ${amount} / mois` : null,
          ``,
          `Connexion : ${loginUrl}`,
          ``,
          `— L’équipe Nexa`,
        ]
          .filter(Boolean)
          .join("\n");

  try {
    return await sendEmail({ to, subject, text });
  } catch (error) {
    console.error("[activation-email] renewal-alert:", error);
    return { sent: false, skipped: false };
  }
}
