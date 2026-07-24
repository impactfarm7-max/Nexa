# Chiffrement des messages au repos — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiffrer au repos les messages des 4 tables (`community_messages`, `private_messages`, `support_messages`, `guest_support_messages`) — illisibles en BD, lisibles par {expéditeur, destinataire, admin} via l'app.

**Architecture:** Chiffrement côté client (AES-256-GCM via Web Crypto) avant insert, déchiffrement après lecture/realtime. Sous-clés dérivées par conversation via HKDF-SHA256 d'une clé maître serveur (`MESSAGE_ENC_KEY`), livrées par un endpoint authentifié. Le guest passe par le serveur (Node crypto). Un cœur crypto isomorphe `.mjs` est partagé par le script de migration, le serveur et le client pour éviter toute dérive de format.

**Tech Stack:** Next.js 16, Supabase JS, Web Crypto API (navigateur), `node:crypto` (serveur/script), `node:test` (tests unitaires).

**Référence spec:** `docs/superpowers/specs/2026-06-02-chiffrement-messages-design.md`

**Ordre critique:** Le code app/serveur (Tasks 1-9) doit être déployé AVANT de lancer la migration réelle (Task 10). Sinon les messages chiffrés s'affichent en `enc:...` dans l'UI.

---

## Structure des fichiers

- Créer `app/utils/messageCrypto.core.mjs` — cœur isomorphe : constantes, `infoFor`, parse/format, `isEncrypted`, dérivation Node + chiffrement Node. Sans secret (la clé maître est passée en argument).
- Créer `app/utils/messageCrypto.core.d.ts` — types pour le `.mjs`.
- Créer `app/utils/messageCrypto.server.ts` — lit `MESSAGE_ENC_KEY`, expose `encryptServer/decryptServer(ctx)` et `deriveSubkeyB64(info)`.
- Créer `app/utils/messageCrypto.client.ts` — `"use client"` : fetch+cache des sous-clés, `encryptMessage/decryptMessage(ctx)` via Web Crypto, helper `decryptRows`.
- Créer `app/api/messages/keys/route.ts` — endpoint POST autorisé qui renvoie une sous-clé dérivée.
- Créer `app/utils/messageCrypto.core.test.mjs` — tests unitaires `node --test`.
- Modifier `package.json` — ajouter le script `test`.
- Modifier `scripts/encrypt-existing-messages.mjs` — importer le cœur au lieu des constantes inline (DRY).
- Modifier `app/communaute/page.tsx` — chiffrer/déchiffrer community + private (fetch, submit, realtime).
- Modifier `app/support/page.tsx` — chiffrer/déchiffrer support.
- Modifier `app/admin/page.tsx` — déchiffrer les 4 tables côté admin, chiffrer ses envois.
- Modifier `app/api/support/guest/route.ts` — chiffrer au POST, déchiffrer au GET (serveur).

---

## Task 1: Cœur crypto isomorphe + tests

**Files:**
- Create: `app/utils/messageCrypto.core.mjs`
- Create: `app/utils/messageCrypto.core.d.ts`
- Create: `app/utils/messageCrypto.core.test.mjs`
- Modify: `package.json` (ajout script `test`)

- [ ] **Step 1: Écrire le test qui échoue**

Create `app/utils/messageCrypto.core.test.mjs`:

```js
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
  const tampered = stored.slice(0, -2) + (stored.endsWith("A") ? "B" : "A") + "=";
  assert.throws(() => decryptWithKey(tampered, key));
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `node --test app/utils/messageCrypto.core.test.mjs`
Expected: FAIL — `Cannot find module './messageCrypto.core.mjs'`.

- [ ] **Step 3: Écrire le cœur**

Create `app/utils/messageCrypto.core.mjs`:

```js
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
```

- [ ] **Step 4: Créer les types**

Create `app/utils/messageCrypto.core.d.ts`:

```ts
export const PREFIX: string;
export const VERSION: string;
export const HKDF_SALT: string;

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
```

- [ ] **Step 5: Ajouter le script de test**

Modify `package.json` scripts (ajouter après `"lint": "next lint"`):

```json
    "lint": "next lint",
    "test": "node --test \"app/**/*.test.mjs\""
```

- [ ] **Step 6: Lancer les tests, vérifier le succès**

Run: `node --test app/utils/messageCrypto.core.test.mjs`
Expected: PASS — 7 tests, 0 fail.

- [ ] **Step 7: Commit**

```bash
git add app/utils/messageCrypto.core.mjs app/utils/messageCrypto.core.d.ts app/utils/messageCrypto.core.test.mjs package.json
git commit -m "Add isomorphic message-crypto core with unit tests"
```

---

## Task 2: Module serveur

**Files:**
- Create: `app/utils/messageCrypto.server.ts`
- Test: réutilise le cœur (déjà testé). Vérification d'intégration via Task 3.

- [ ] **Step 1: Écrire le module serveur**

Create `app/utils/messageCrypto.server.ts`:

```ts
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
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur `messageCrypto.server.ts` (l'import du `.mjs` est typé par le `.d.ts`).

- [ ] **Step 3: Commit**

```bash
git add app/utils/messageCrypto.server.ts
git commit -m "Add server-side message crypto module"
```

---

## Task 3: Endpoint de livraison des sous-clés

**Files:**
- Create: `app/api/messages/keys/route.ts`

Autorisation : `community` → tout user authentifié. `private` → requester ∈ {userA,userB} OU admin. `support` → requester.id == studentId OU admin. `guest` → jamais exposé au client (chiffré/déchiffré serveur uniquement) → refusé ici.

- [ ] **Step 1: Écrire l'endpoint**

Create `app/api/messages/keys/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { deriveSubkeyB64 } from "@/app/utils/messageCrypto.server";
import type { CryptoCtx } from "@/app/utils/messageCrypto.core.mjs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind as string;
  const admin = await isAdmin(user.id);

  let ctx: CryptoCtx;
  if (kind === "community") {
    if (!body.channel) return NextResponse.json({ error: "channel requis" }, { status: 400 });
    ctx = { kind: "community", channel: String(body.channel) };
  } else if (kind === "private") {
    const a = String(body.userA || "");
    const b = String(body.userB || "");
    if (!a || !b) return NextResponse.json({ error: "userA/userB requis" }, { status: 400 });
    if (!admin && user.id !== a && user.id !== b) {
      return NextResponse.json({ error: "Interdit." }, { status: 403 });
    }
    ctx = { kind: "private", userA: a, userB: b };
  } else if (kind === "support") {
    const studentId = String(body.studentId || "");
    if (!studentId) return NextResponse.json({ error: "studentId requis" }, { status: 400 });
    if (!admin && user.id !== studentId) {
      return NextResponse.json({ error: "Interdit." }, { status: 403 });
    }
    ctx = { kind: "support", studentId };
  } else {
    return NextResponse.json({ error: "kind invalide" }, { status: 400 });
  }

  return NextResponse.json({ key: deriveSubkeyB64(ctx) });
}
```

- [ ] **Step 2: Test manuel d'autorisation**

Démarrer `npm run dev`. Avec un token étudiant valide (récupérer via la console navigateur : `(await supabase.auth.getSession()).data.session.access_token`) :

```bash
# community: doit renvoyer { key: "..." }
curl -s -X POST http://localhost:3000/api/messages/keys -H "Authorization: Bearer <TOKEN_ETUDIANT>" -H "Content-Type: application/json" -d '{"kind":"community","channel":"general"}'

# support d'un AUTRE étudiant: doit renvoyer 403
curl -s -X POST http://localhost:3000/api/messages/keys -H "Authorization: Bearer <TOKEN_ETUDIANT>" -H "Content-Type: application/json" -d '{"kind":"support","studentId":"<UUID_AUTRE>"}'
```

Expected: 1er = `{"key":"..."}` (44 car. base64). 2e = `{"error":"Interdit."}` HTTP 403.

- [ ] **Step 3: Commit**

```bash
git add app/api/messages/keys/route.ts
git commit -m "Add authorized subkey delivery endpoint"
```

---

## Task 4: Module client

**Files:**
- Create: `app/utils/messageCrypto.client.ts`

Le client n'a pas la clé maître. Il récupère les sous-clés via l'endpoint, les met en cache (par `info`), et chiffre/déchiffre via Web Crypto. Le déchiffrement échoué renvoie `[message illisible]` (pas de crash).

- [ ] **Step 1: Écrire le module client**

Create `app/utils/messageCrypto.client.ts`:

```ts
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
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
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
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain)
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
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
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
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add app/utils/messageCrypto.client.ts
git commit -m "Add client message crypto module (Web Crypto + subkey cache)"
```

---

## Task 5: Brancher community_messages (page communauté)

**Files:**
- Modify: `app/communaute/page.tsx`

Contexte community : `{ kind: "community", channel }`. 4 points : `fetchMessages` (lecture), `handleSubmit` (insert + update), realtime INSERT, realtime UPDATE.

- [ ] **Step 1: Importer le module client**

En haut de `app/communaute/page.tsx`, après les imports existants, ajouter :

```ts
import { encryptMessage, decryptMessage, decryptRows } from "@/app/utils/messageCrypto.client";
```

- [ ] **Step 2: Déchiffrer à la lecture (`fetchMessages`)**

Dans `fetchMessages` (~ligne 352), remplacer le bloc `if (!error && data)` :

```ts
    if (!error && data) {
      const decrypted = await decryptRows(data, () => ({ kind: "community", channel: channelId }));
      setMessages(decrypted);
      scrollToBottom();
    }
```

- [ ] **Step 3: Chiffrer à l'envoi/édition (`handleSubmit`)**

Dans `handleSubmit` (~ligne 401), remplacer le contenu du `try` :

```ts
    try {
      if (editingId) {
        const enc = await encryptMessage(newMessage.trim(), { kind: "community", channel: activeChannel });
        const { error } = await supabase
          .from("community_messages")
          .update({ message: enc, edited: true })
          .eq("id", editingId);
        if (!error) {
          setMessages((prev) => prev.map((m) => m.id === editingId ? { ...m, message: newMessage.trim(), edited: true } : m));
        } else alert("Erreur lors de la modification.");
        setEditingId(null);
      } else {
        const enc = await encryptMessage(newMessage.trim(), { kind: "community", channel: activeChannel });
        const { error } = await supabase.from("community_messages").insert([{
          user_id: user.id,
          message: enc,
          channel: activeChannel,
        }]);
        if (error) alert("Erreur d'envoi");
      }
      setNewMessage("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    } finally {
      setIsSending(false);
    }
```

- [ ] **Step 4: Déchiffrer le realtime INSERT**

Dans le handler INSERT (~ligne 161), avant `setMessages` :

```ts
          async (payload) => {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("prenom, role")
              .eq("id", payload.new.user_id)
              .single();
            const clear = await decryptMessage(payload.new.message, { kind: "community", channel: activeChannel });
            setMessages((prev) => [...prev, { ...payload.new, message: clear, profiles: profileData || { prenom: "Inconnu", role: "student" } }]);
            scrollToBottom();
          })
```

- [ ] **Step 5: Déchiffrer le realtime UPDATE**

Dans le handler UPDATE (~ligne 171) :

```ts
          async (payload) => {
            const clear = await decryptMessage(payload.new.message, { kind: "community", channel: activeChannel });
            setMessages((prev) => prev.map((m) => m.id === payload.new.id ? { ...m, message: clear, edited: true } : m));
          })
```

- [ ] **Step 6: Vérifier compilation + manuel**

Run: `npx tsc --noEmit` → aucune erreur.
Manuel (`npm run dev`) : envoyer un message communauté → s'affiche en clair ; dans Supabase Table Editor, la colonne `message` commence par `enc:v1:`. Éditer le message → reste cohérent. Ouvrir un 2e onglet → realtime affiche en clair.

- [ ] **Step 7: Commit**

```bash
git add app/communaute/page.tsx
git commit -m "Encrypt community_messages at rest in communaute page"
```

---

## Task 6: Brancher private_messages (PM + DM)

**Files:**
- Modify: `app/communaute/page.tsx`

Contexte privé : `{ kind: "private", userA: from, userB: to }`. Points : `sendPm`, `sendDm` (insert), `fetchPmMessages`, `fetchDmMessages` (lecture), realtime PM INSERT (déclenche un refetch → déjà couvert par `fetchPmMessages`).

- [ ] **Step 1: Chiffrer `sendPm`**

Dans `sendPm` (~ligne 303), remplacer la ligne d'insert :

```ts
    const enc = await encryptMessage(msg, { kind: "private", userA: user.id, userB: aId });
    await supabase.from("private_messages").insert([{ from_user_id: user.id, to_user_id: aId, message: enc }]);
    await fetchPmMessages(user.id);
```

- [ ] **Step 2: Chiffrer `sendDm`**

Dans `sendDm` (~ligne 347), remplacer la ligne d'insert :

```ts
    const enc = await encryptMessage(msg, { kind: "private", userA: user.id, userB: dmStudent.id });
    await supabase.from("private_messages").insert([{ from_user_id: user.id, to_user_id: dmStudent.id, message: enc }]);
    await fetchDmMessages(dmStudent.id);
```

- [ ] **Step 3: Déchiffrer `fetchPmMessages`**

Dans `fetchPmMessages` (~ligne 199), remplacer `if (data) { setPmMessages(data); ... }` :

```ts
    if (data) {
      const decrypted = await decryptRows(data, (m: any) => ({ kind: "private", userA: m.from_user_id, userB: m.to_user_id }));
      setPmMessages(decrypted);
      await supabase
        .from("private_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("to_user_id", uid)
        .is("read_at", null);
      setPmUnread(0);
    }
```

- [ ] **Step 4: Déchiffrer `fetchDmMessages`**

Dans `fetchDmMessages` (~ligne 309), après le calcul de `filtered`, déchiffrer avant `setDmMessages` :

```ts
    const decrypted = await decryptRows(filtered, (m: any) => ({ kind: "private", userA: m.from_user_id, userB: m.to_user_id }));
    setDmMessages(decrypted);
    if (filtered.length) {
```

(Remplacer `setDmMessages(filtered);` par les deux lignes ci-dessus ; garder la suite `if (filtered.length) {...}` inchangée.)

- [ ] **Step 5: Vérifier compilation + manuel**

Run: `npx tsc --noEmit` → aucune erreur.
Manuel : étudiant envoie un PM → admin (onglet communauté → DM) le lit en clair ; BD `private_messages.message` = `enc:v1:`. Admin répond via DM → étudiant le lit en clair.

- [ ] **Step 6: Commit**

```bash
git add app/communaute/page.tsx
git commit -m "Encrypt private_messages at rest (PM + DM)"
```

---

## Task 7: Brancher support_messages (page support)

**Files:**
- Modify: `app/support/page.tsx`

Contexte support : `{ kind: "support", studentId }`. Côté page support, l'étudiant connecté est le student → `studentId = user.id`. Lire les lignes (~59, ~83, ~204) et écritures dans ce fichier.

- [ ] **Step 1: Lire le fichier pour repérer les points exacts**

Run: ouvrir `app/support/page.tsx`. Identifier : (a) le `select` initial des messages, (b) l'`insert` d'un message, (c) tout handler realtime. Noter la variable d'ID de l'étudiant courant (probablement `user.id`).

- [ ] **Step 2: Importer le module client**

En haut de `app/support/page.tsx` :

```ts
import { encryptMessage, decryptMessage, decryptRows } from "@/app/utils/messageCrypto.client";
```

- [ ] **Step 3: Déchiffrer chaque lecture**

Après chaque `.from("support_messages").select(...)` qui remplit l'état des messages, mapper le résultat :

```ts
const decrypted = await decryptRows(data, () => ({ kind: "support", studentId: user.id }));
// utiliser `decrypted` au lieu de `data` pour setState
```

- [ ] **Step 4: Chiffrer chaque envoi**

Avant chaque `.from("support_messages").insert(...)`, chiffrer le champ `message` :

```ts
const enc = await encryptMessage(messageText, { kind: "support", studentId: user.id });
// insérer { ..., message: enc }
```

- [ ] **Step 5: Déchiffrer le realtime support (si présent)**

Si un handler `postgres_changes` INSERT sur `support_messages` existe, déchiffrer `payload.new.message` via `decryptMessage(payload.new.message, { kind: "support", studentId: user.id })` avant le setState (même motif que Task 5 Step 4).

- [ ] **Step 6: Vérifier compilation + manuel**

Run: `npx tsc --noEmit` → aucune erreur.
Manuel : étudiant connecté envoie un message support → s'affiche en clair ; BD `support_messages.message` = `enc:v1:`.

- [ ] **Step 7: Commit**

```bash
git add app/support/page.tsx
git commit -m "Encrypt support_messages at rest (support page)"
```

---

## Task 8: Brancher la route guest (serveur)

**Files:**
- Modify: `app/api/support/guest/route.ts`

Le guest n'a pas de clé. Le serveur chiffre au POST et déchiffre au GET. Deux cas :
- Étudiant matché par email → écrit dans `support_messages` avec ctx `{ kind: "support", studentId: student.id }`.
- Guest pur → `guest_support_messages` avec ctx `{ kind: "guest", token }`.

- [ ] **Step 1: Importer le module serveur**

En haut de `app/api/support/guest/route.ts` :

```ts
import { encryptServer, decryptServer } from "@/app/utils/messageCrypto.server";
```

- [ ] **Step 2: Chiffrer au POST (étudiant matché)**

Dans le bloc `if (student)` du POST (~ligne 120), chiffrer `messageWithFallback` avant l'insert :

```ts
    const encMsg = encryptServer(messageWithFallback, { kind: "support", studentId: student.id });
    const { data: inserted, error } = await supabaseAdmin.from("support_messages").insert([{
      from_user_id: student.id,
      to_user_id: adminId,
      message: encMsg,
      image_url: imageUrl,
    }]).select("id, image_url").single();
```

- [ ] **Step 3: Chiffrer au POST (guest pur)**

Dans l'insert `guest_support_messages` (~ligne 134) :

```ts
  const encGuestMsg = encryptServer(messageWithFallback, { kind: "guest", token });
  const { data: inserted, error } = await supabaseAdmin.from("guest_support_messages").insert([{
    guest_token: token,
    guest_name: guestName,
    guest_email: guestEmail,
    sender: "guest",
    message: encGuestMsg,
    image_url: imageUrl,
  }]).select("id, image_url").single();
```

- [ ] **Step 4: Déchiffrer au GET (étudiant matché)**

Dans le bloc `if (student)` du GET (~ligne 60), déchiffrer chaque message avant de renvoyer. Remplacer le `.map` qui construit `messages` :

```ts
    const messages = (data || []).map((msg: any) => ({
      ...msg,
      message: decryptServer(msg.message, { kind: "support", studentId: student.id }),
      sender_name: msg.from_user_id !== student.id ? adminNameMap.get(msg.from_user_id) || "Support client" : null,
    }));
```

- [ ] **Step 5: Déchiffrer au GET (guest pur)**

Dans le `.map` guest (~ligne 91) :

```ts
  const messages = (data || []).map((msg: any) => ({
    ...msg,
    message: decryptServer(msg.message, { kind: "guest", token }),
    sender_name: msg.sender === "admin" ? adminNameMap.get(msg.sender_user_id) || "Support client" : null,
  }));
```

- [ ] **Step 6: Vérifier compilation + manuel**

Run: `npx tsc --noEmit` → aucune erreur.
Manuel : depuis la page support guest (non connecté), envoyer un message → BD `guest_support_messages.message` = `enc:v1:` ; recharger la page guest → message lisible (déchiffré serveur).

- [ ] **Step 7: Commit**

```bash
git add app/api/support/guest/route.ts
git commit -m "Encrypt guest/support messages server-side in guest route"
```

---

## Task 9: Brancher l'admin (lecture des 4 tables)

**Files:**
- Modify: `app/admin/page.tsx`

L'admin lit `community_messages`, `private_messages`, `support_messages`, `guest_support_messages` (lignes repérées : 346, 736-774, 808-938, 1085-1089). Il doit déchiffrer avec le bon ctx par table, et chiffrer ses envois (réponses support / community).

- [ ] **Step 1: Lire le fichier et cartographier**

Run: ouvrir `app/admin/page.tsx`. Pour chaque `.from("...").select(...)` des 4 tables, noter : la variable d'état remplie, et l'ID pertinent (channel / studentId / paire). Pour les écritures admin (`insert`), noter le destinataire.

- [ ] **Step 2: Importer le module client**

```ts
import { encryptMessage, decryptMessage, decryptRows } from "@/app/utils/messageCrypto.client";
```

- [ ] **Step 3: Déchiffrer les lectures community**

Après chaque select `community_messages`, mapper :

```ts
const decrypted = await decryptRows(data, (m: any) => ({ kind: "community", channel: m.channel }));
```

- [ ] **Step 4: Déchiffrer les lectures private**

Après chaque select `private_messages` :

```ts
const decrypted = await decryptRows(data, (m: any) => ({ kind: "private", userA: m.from_user_id, userB: m.to_user_id }));
```

- [ ] **Step 5: Déchiffrer les lectures support**

`support_messages` → studentId = participant non-admin de la ligne. L'admin connaît son propre id (`adminUser.id` ou équivalent dans le fichier) :

```ts
const decrypted = await decryptRows(data, (m: any) => ({
  kind: "support",
  studentId: m.from_user_id === ADMIN_ID ? m.to_user_id : m.from_user_id,
}));
```

`guest_support_messages` → ctx `{ kind: "guest", token: m.guest_token }`. **Attention** : ces lignes sont chiffrées **côté serveur** ; le client admin doit les déchiffrer via une sous-clé `guest:<token>`. L'endpoint `keys` refuse `guest`. Donc l'admin lit les messages guest via la route serveur existante `/api/support/guest` (qui déchiffre déjà) plutôt qu'en direct. Si l'admin lit `guest_support_messages` en direct dans ce fichier, ajouter le support de `kind:"guest"` à l'endpoint `keys` réservé aux admins :

Dans `app/api/messages/keys/route.ts`, ajouter avant le `else` final :

```ts
  } else if (kind === "guest") {
    if (!admin) return NextResponse.json({ error: "Interdit." }, { status: 403 });
    const token = String(body.token || "");
    if (!token) return NextResponse.json({ error: "token requis" }, { status: 400 });
    ctx = { kind: "guest", token };
```

Puis côté admin :

```ts
const decrypted = await decryptRows(data, (m: any) => ({ kind: "guest", token: m.guest_token }));
```

- [ ] **Step 6: Chiffrer les envois admin**

Pour chaque `insert` admin dans `private_messages` (réponse DM) :

```ts
const enc = await encryptMessage(text, { kind: "private", userA: ADMIN_ID, userB: studentId });
```

Pour `support_messages` (réponse support) :

```ts
const enc = await encryptMessage(text, { kind: "support", studentId });
```

Pour `community_messages` (post admin) :

```ts
const enc = await encryptMessage(text, { kind: "community", channel });
```

Insérer `{ ..., message: enc }` à chaque fois.

- [ ] **Step 7: Vérifier compilation + manuel**

Run: `npx tsc --noEmit` → aucune erreur.
Manuel : ouvrir l'admin → chaque conversation (community, PM/DM, support, guest) s'affiche en clair ; envoyer une réponse depuis l'admin → l'étudiant la voit en clair ; BD = `enc:v1:`.

- [ ] **Step 8: Commit**

```bash
git add app/admin/page.tsx app/api/messages/keys/route.ts
git commit -m "Decrypt all message tables in admin view + encrypt admin sends"
```

---

## Task 10: Aligner le script de migration (DRY) + exécuter

**Files:**
- Modify: `scripts/encrypt-existing-messages.mjs`

Le script duplique les constantes crypto. Le refactoriser pour importer le cœur, garantissant zéro dérive de format.

- [ ] **Step 1: Refactoriser le script pour importer le cœur**

Dans `scripts/encrypt-existing-messages.mjs`, remplacer le bloc « Constantes crypto canoniques » + les fonctions `deriveKey`/`encrypt`/`isEncrypted` par un import du cœur :

```js
import {
  isEncrypted,
  infoFor,
  deriveSubkey,
  encryptWithKey,
} from "../app/utils/messageCrypto.core.mjs";
```

Puis remplacer les appels :
- `encrypt(row.message, info)` → `encryptWithKey(row.message, deriveSubkey(MASTER, info))`
- les `info` construits manuellement → `infoFor(...)` :
  - community : `infoFor({ kind: "community", channel: row.channel })`
  - private : `infoFor({ kind: "private", userA: r.from_user_id, userB: r.to_user_id })`
  - support : `infoFor({ kind: "support", studentId: sid })`
  - guest : `infoFor({ kind: "guest", token: row.guest_token })`

Supprimer les fonctions locales `communityInfo`/`pairInfo`/`guestInfo`/`deriveKey`/`encrypt`/`isEncrypted` désormais inutiles (garder `studentOf`).

- [ ] **Step 2: Re-vérifier le dry-run (format inchangé)**

Run: `node --env-file=.env.local scripts/encrypt-existing-messages.mjs --dry-run`
Expected: mêmes comptes qu'avant (community 41, private 53, support 20, guest 7), aucune erreur.

- [ ] **Step 3: Commit du refactor**

```bash
git add scripts/encrypt-existing-messages.mjs
git commit -m "Refactor migration script to reuse crypto core (DRY)"
```

- [ ] **Step 4: Déployer le code AVANT la migration**

Merger/déployer les Tasks 1-9 en production. Ajouter `MESSAGE_ENC_KEY` (même valeur que `.env.local`) aux variables d'environnement Vercel (Production + Preview). Redéployer.

- [ ] **Step 5: Backup BD puis migration réelle**

Faire un dump/backup Supabase. Puis :

```powershell
node --env-file=.env.local scripts/encrypt-existing-messages.mjs
```

Expected: `community_messages: 41 ... 41 chiffrée(s)` etc. (sans `[dry-run]`).

- [ ] **Step 6: Vérifier l'idempotence**

Run: `node --env-file=.env.local scripts/encrypt-existing-messages.mjs`
Expected: `0 chiffrée(s)` partout (toutes déjà `enc:`).

- [ ] **Step 7: Vérification finale**

Dans Supabase Table Editor : colonnes `message` des 4 tables = `enc:v1:...`. Dans l'app (étudiant + admin) : tous les messages historiques s'affichent en clair.

---

## Self-review (rempli)

- **Spec coverage:** Section 1 (format) → Task 1 ; Section 2 (clés/endpoint) → Tasks 2-3 ; Section 3 (4 tables) → Tasks 5-9 ; Section 4 (migration) → Task 10 ; Section 5 (cas limites : déchiffrement échoué → Task 4 `[message illisible]` ; édition → Task 5 ; legacy passe-plat → Task 1) ; Section 6 (tests) → Task 1 unitaires + étapes manuelles par task.
- **Push notifications:** confirmé hors périmètre (aucun contenu chat dans les push) — rien à faire.
- **Placeholders:** aucun TODO/TBD ; code complet à chaque étape.
- **Type consistency:** `CryptoCtx`, `infoFor`, `encryptMessage`/`decryptMessage`/`decryptRows`, `encryptServer`/`decryptServer`/`deriveSubkeyB64` cohérents entre tasks.

## Hors scope (rappel)

- Chiffrement des pièces jointes (`image_url`).
- E2EE zéro-connaissance.
- Rotation automatique des clés (procédure `v2` manuelle documentée dans la spec).
