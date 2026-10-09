import crypto from "crypto";

/** Génère un mot de passe temporaire au format Nexa + 4 chiffres aléatoires (ex: Nexa0427). */
export function generateSecureTemporaryPassword(): string {
  const digits = crypto.randomInt(0, 10000).toString().padStart(4, "0");
  return `Nexa${digits}`;
}
