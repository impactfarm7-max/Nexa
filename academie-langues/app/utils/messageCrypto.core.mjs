// Cœur crypto isomorphe (sans secret). La clé maître est toujours passée en argument.
// Partagé par : script de migration, module serveur, tests. Format figé = compat BD.
import { hkdfSync, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const PREFIX = "enc:";
export const VERSION = "v1";
export const HKDF_SALT = "iag-academy-msg-v1";

export function isEncrypted(v) {
  return typeof v === "string" && v.startsWith(PREFIX);
}

// Construit la string d'info HKDF selon le contexte de conversation.
export function infoFor(ctx) {
  switch (ctx.kind) {
    case "community":
      return `community:${ctx.channel}`;
    case "private": {
      const [lo, hi] = [ctx.userA, ctx.userB].sort();
      return `private:${lo}:${hi}`;
    }
    case "support":
      return `support:${ctx.studentId}`;
    case "guest":
      return `guest:${ctx.token}`;
    default:
      throw new Error(`infoFor: kind inconnu ${ctx.kind}`);
  }
}

// HKDF-SHA256(master, salt, info) -> Buffer 32 octets.
export function deriveSubkey(master, info) {
  return Buffer.from(
    hkdfSync("sha256", master, Buffer.from(HKDF_SALT), Buffer.from(info), 32)
  );
}

// Chiffre avec une sous-clé (Buffer 32o) -> "enc:v1:<ivB64>:<ct+tag B64>".
export function encryptWithKey(plain, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([ct, tag]).toString("base64");
  return `${PREFIX}${VERSION}:${iv.toString("base64")}:${payload}`;
}

// Déchiffre. Passe-plat si pas de préfixe enc:. Throw si altéré/clé fausse.
export function decryptWithKey(stored, key) {
  if (!isEncrypted(stored)) return stored;
  const parts = stored.split(":");
  // ["enc","v1",ivB64,payloadB64]
  if (parts.length !== 4 || parts[1] !== VERSION) {
    throw new Error("format chiffré invalide");
  }
  const iv = Buffer.from(parts[2], "base64");
  const buf = Buffer.from(parts[3], "base64");
  const tag = buf.subarray(buf.length - 16);
  const ct = buf.subarray(0, buf.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
