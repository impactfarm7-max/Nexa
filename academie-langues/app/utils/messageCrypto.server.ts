import {
  deriveSubkey,
  encryptWithKey,
  decryptWithKey,
  infoFor,
  type CryptoCtx,
} from "./messageCrypto.core.mjs";

function master(): Buffer {
  const b64 = process.env.MESSAGE_ENC_KEY;
  if (!b64) throw new Error("MESSAGE_ENC_KEY manquante");
  const buf = Buffer.from(b64, "base64");
  if (buf.length !== 32) throw new Error("MESSAGE_ENC_KEY doit faire 32 octets");
  return buf;
}

export function encryptServer(plain: string, ctx: CryptoCtx): string {
  const key = deriveSubkey(master(), infoFor(ctx));
  return encryptWithKey(plain, key);
}

export function decryptServer(stored: string, ctx: CryptoCtx): string {
  const key = deriveSubkey(master(), infoFor(ctx));
  return decryptWithKey(stored, key);
}

// Renvoie la sous-clé (base64) pour livraison au client par l'endpoint /api/messages/keys.
export function deriveSubkeyB64(ctx: CryptoCtx): string {
  return deriveSubkey(master(), infoFor(ctx)).toString("base64");
}
