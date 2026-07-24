/** Politique mot de passe NEXA : 6+ car., majuscule, minuscule, chiffre. */

export type PasswordCheck = {
  ok: boolean;
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  message: string | null;
};

export const PASSWORD_POLICY_HINT =
  "Au moins 6 caractères, avec une majuscule, une minuscule et un chiffre.";

export function checkPasswordStrength(password: string): PasswordCheck {
  const value = String(password || "");
  const minLength = value.length >= 6;
  const hasUpper = /[A-ZÀ-ÖØ-Þ]/.test(value);
  const hasLower = /[a-zà-öø-ÿ]/.test(value);
  const hasDigit = /\d/.test(value);
  const ok = minLength && hasUpper && hasLower && hasDigit;

  let message: string | null = null;
  if (!ok) {
    const missing: string[] = [];
    if (!minLength) missing.push("6 caractères minimum");
    if (!hasUpper) missing.push("une majuscule");
    if (!hasLower) missing.push("une minuscule");
    if (!hasDigit) missing.push("un chiffre");
    message = `Mot de passe trop faible : ajoutez ${missing.join(", ")}.`;
  }

  return { ok, minLength, hasUpper, hasLower, hasDigit, message };
}

export function isPasswordStrong(password: string): boolean {
  return checkPasswordStrength(password).ok;
}
