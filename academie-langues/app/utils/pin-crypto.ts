import crypto from "crypto";

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(pin, salt, 100000, 64, "sha512").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  if (stored.startsWith("pbkdf2:")) {
    const parts = stored.split(":");
    if (parts.length !== 3) return false;
    const [, salt, hash] = parts;
    const computed = crypto.pbkdf2Sync(pin, salt, 100000, 64, "sha512").toString("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
    } catch {
      return false;
    }
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(pin));
  } catch {
    return stored === pin;
  }
}

export const PIN_REGEX = /^\d{4}$/;

export function validatePin(pin: unknown): pin is string {
  return typeof pin === "string" && PIN_REGEX.test(pin);
}

export type PinSettings = {
  secure_programme: boolean;
  secure_etudiants: boolean;
  block_downloads: boolean;
};

export const DEFAULT_PIN_SETTINGS: PinSettings = {
  secure_programme: false,
  secure_etudiants: false,
  block_downloads: false,
};

export function parsePinSettings(raw: unknown): PinSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PIN_SETTINGS };
  const obj = raw as Record<string, unknown>;
  return {
    secure_programme: Boolean(obj.secure_programme),
    secure_etudiants: Boolean(obj.secure_etudiants),
    block_downloads: Boolean(obj.block_downloads),
  };
}
