"use client";
import { supabase } from "./supabase";
import { isEncrypted, infoFor, VERSION, type CryptoCtx } from "./messageCrypto.core.mjs";

const keyCache = new Map<string, Promise<CryptoKey>>();

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// Récupère (et cache) la CryptoKey AES-GCM pour un contexte donné.
async function getKey(ctx: CryptoCtx): Promise<CryptoKey> {
  const info = infoFor(ctx);
  let cached = keyCache.get(info);
  if (cached) return cached;

  cached = (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("pas de session");
    const res = await fetch("/api/messages/keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ctx),
    });
    if (!res.ok) throw new Error(`keys endpoint ${res.status}`);
    const { key } = await res.json();
    const raw = b64ToBytes(key);
    return crypto.subtle.importKey("raw", raw as BufferSource, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  })();

  keyCache.set(info, cached);
  return cached;
}

// Chiffre un texte clair -> "enc:v1:<ivB64>:<ct+tag B64>".
export async function encryptMessage(plain: string, ctx: CryptoCtx): Promise<string> {
  const key = await getKey(ctx);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plain) as BufferSource
  );
  const payload = bytesToB64(new Uint8Array(ctBuf));
  return `enc:${VERSION}:${bytesToB64(iv)}:${payload}`;
}

// Déchiffre. Passe-plat si legacy. "[message illisible]" si échec.
export async function decryptMessage(stored: string, ctx: CryptoCtx): Promise<string> {
  if (!isEncrypted(stored)) return stored;
  try {
    const parts = stored.split(":");
    if (parts.length !== 4 || parts[1] !== VERSION) throw new Error("format");
    const iv = b64ToBytes(parts[2]);
    const data = b64ToBytes(parts[3]);
    const key = await getKey(ctx);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data as BufferSource);
    return new TextDecoder().decode(plainBuf);
  } catch {
    return "[message illisible]";
  }
}

// Déchiffre un tableau de lignes : remplace row[field] par le clair.
export async function decryptRows<T extends Record<string, any>>(
  rows: T[],
  ctxFor: (row: T) => CryptoCtx,
  field: keyof T = "message" as keyof T
): Promise<T[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      [field]: await decryptMessage(row[field] as string, ctxFor(row)),
    }))
  );
}
