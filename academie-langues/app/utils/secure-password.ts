import crypto from "crypto";

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

/** Génère un secret temporaire avec un CSPRNG, sans caractères ambigus. */
export function generateSecureTemporaryPassword(length = 14): string {
  const size = Math.max(12, Math.min(64, Math.trunc(length)));
  let password = "";
  for (let index = 0; index < size; index += 1) {
    password += PASSWORD_ALPHABET[crypto.randomInt(0, PASSWORD_ALPHABET.length)];
  }
  return password;
}
