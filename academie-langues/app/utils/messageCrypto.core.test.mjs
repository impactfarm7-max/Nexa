import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  PREFIX, VERSION, HKDF_SALT,
  isEncrypted, infoFor, deriveSubkey, encryptWithKey, decryptWithKey,
} from "./messageCrypto.core.mjs";

const master = randomBytes(32);

test("constantes canoniques figées (compat migration)", () => {
  assert.equal(PREFIX, "enc:");
  assert.equal(VERSION, "v1");
  assert.equal(HKDF_SALT, "iag-academy-msg-v1");
});

test("infoFor produit le bon contexte par type", () => {
  assert.equal(infoFor({ kind: "community", channel: "general" }), "community:general");
  assert.equal(infoFor({ kind: "support", studentId: "s1" }), "support:s1");
  assert.equal(infoFor({ kind: "guest", token: "t1" }), "guest:t1");
});

test("private: paire triée déterministe (ordre indifférent)", () => {
  const a = infoFor({ kind: "private", userA: "bbb", userB: "aaa" });
  const b = infoFor({ kind: "private", userA: "aaa", userB: "bbb" });
  assert.equal(a, b);
  assert.equal(a, "private:aaa:bbb");
});

test("HKDF déterministe: même info => même clé", () => {
  const k1 = deriveSubkey(master, "community:general");
  const k2 = deriveSubkey(master, "community:general");
  const k3 = deriveSubkey(master, "community:autre");
  assert.deepEqual(k1, k2);
  assert.notDeepEqual(k1, k3);
  assert.equal(k1.length, 32);
});

test("round-trip chiffre/déchiffre", () => {
  const key = deriveSubkey(master, "community:general");
  const stored = encryptWithKey("bonjour é à 漢", key);
  assert.ok(stored.startsWith("enc:v1:"));
  assert.equal(decryptWithKey(stored, key), "bonjour é à 漢");
});

test("legacy sans préfixe = passe-plat", () => {
  const key = deriveSubkey(master, "x:y");
  assert.equal(isEncrypted("texte clair"), false);
  assert.equal(decryptWithKey("texte clair", key), "texte clair");
});

test("altération détectée (GCM)", () => {
  const key = deriveSubkey(master, "community:general");
  const stored = encryptWithKey("secret", key);
  const parts = stored.split(":");
  const payload = Buffer.from(parts[3], "base64");
  payload[payload.length - 1] ^= 0xff; // flip dernier octet du tag GCM
  const tampered = parts.slice(0, 3).join(":") + ":" + payload.toString("base64");
  assert.throws(() => decryptWithKey(tampered, key));
});
