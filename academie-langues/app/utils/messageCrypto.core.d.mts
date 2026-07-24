export const PREFIX: "enc:";
export const VERSION: "v1";
export const HKDF_SALT: "iag-academy-msg-v1";

export type CryptoCtx =
  | { kind: "community"; channel: string }
  | { kind: "private"; userA: string; userB: string }
  | { kind: "support"; studentId: string }
  | { kind: "guest"; token: string };

export function isEncrypted(v: unknown): boolean;
export function infoFor(ctx: CryptoCtx): string;
export function deriveSubkey(master: Buffer, info: string): Buffer;
export function encryptWithKey(plain: string, key: Buffer): string;
export function decryptWithKey(stored: string, key: Buffer): string;
