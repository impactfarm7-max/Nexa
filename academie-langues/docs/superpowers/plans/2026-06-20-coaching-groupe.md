# Coaching Groupe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'admin de programmer une session de coaching groupe (date/heure/durée/titre), annuler automatiquement les séances individuelles en conflit, notifier par push (création, rappel 15min, annulation), et afficher un chrono temps-restant dans les rooms individuelle et groupe.

**Architecture:** Nouvelle table `group_coaching_sessions` séparée de `coaching_sessions`. Logique pure (chevauchement, éligibilité, fenêtre rappel, `endsAt`) extraite dans un module isomorphe `groupCoaching.core.mjs` testé par `node --test`, consommé par les routes API. Trois routes : admin CRUD groupe, token room groupe, et extension du cron rappels existant. UI : carte admin + bannière étudiant + room groupe + composant chrono partagé.

**Tech Stack:** Next.js 16 (App Router, route handlers), Supabase (service role), LiveKit, web-push, React 19, Tailwind, framer-motion, lucide-react. Tests `node --test` sur `.mjs`.

## Global Constraints

- Timezone: `Africa/Douala`, offset horaire fixe `+01:00` dans toutes les conversions date/heure (convention identique à `coaching_sessions`).
- Format heure stocké : chaîne `"HH:MM"` (`session_time`), date : `"YYYY-MM-DD"` (`session_date`).
- `coaching_total === 9999` signifie illimité (jamais décrémenter le quota).
- Crédit coaching groupe = **gratuit** (ne jamais incrémenter `coaching_used` pour le groupe).
- Éligibilité étudiant = `coaching_total > 0` ET `tag_status` ∉ {`revoque`, `termine`}. Un admin est toujours autorisé à rejoindre.
- Auth API : `getAuthUser(req)` via header `Authorization: Bearer <token>`.
- Push : `sendPushToUsers(userIds, { title, body, url })` + insertion de lignes `notifications` `{ user_id, message }`.
- Pas d'email pour les sessions groupe.
- Statut DB séance individuelle : `en_attente` / `confirme` / `annule` (français, valeurs réellement utilisées à la création par les étudiants).
- Statut DB session groupe : `scheduled` / `cancelled` / `done`.
- Room LiveKit groupe : `group-coaching-${id}`.
- Module isomorphe partagé : trio `*.core.mjs` + `*.core.d.ts` + `*.core.test.mjs` (pattern existant `messageCrypto.core.*`).

---

### Task 1: Module pur `groupCoaching.core` + tests

**Files:**
- Create: `app/utils/groupCoaching.core.mjs`
- Create: `app/utils/groupCoaching.core.d.ts`
- Test: `app/utils/groupCoaching.core.test.mjs`

**Interfaces:**
- Consumes: rien.
- Produces (toutes pures, sans accès DB) :
  - `sessionToMs(sessionDate: string, sessionTime: string): number` — epoch ms depuis `"YYYY-MM-DD"` + `"HH:MM"` à `+01:00`.
  - `computeEndsAt(startMs: number, durationMin: number): number` — `startMs + durationMin * 60000`.
  - `isEligibleProfile(p: { coaching_total?: number|null; tag_status?: string|null }): boolean`.
  - `overlapsGroupWindow(indivStartMs: number, groupStartMs: number, groupEndMs: number, indivDurationMs?: number): boolean` — `indivDurationMs` défaut `30*60000`.
  - `reminderDueMinutes(startMs: number, nowMs: number): boolean` — vrai si `0 <= (startMs-nowMs)/60000 <= 15`.

- [ ] **Step 1: Write the failing test**

Create `app/utils/groupCoaching.core.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sessionToMs,
  computeEndsAt,
  isEligibleProfile,
  overlapsGroupWindow,
  reminderDueMinutes,
} from "./groupCoaching.core.mjs";

test("sessionToMs interprète date+heure en +01:00", () => {
  const ms = sessionToMs("2026-06-20", "14:00");
  // 14:00 +01:00 == 13:00 UTC
  assert.equal(new Date(ms).toISOString(), "2026-06-20T13:00:00.000Z");
});

test("sessionToMs tolère un session_time avec secondes", () => {
  const ms = sessionToMs("2026-06-20", "14:00:00");
  assert.equal(new Date(ms).toISOString(), "2026-06-20T13:00:00.000Z");
});

test("computeEndsAt ajoute la durée en minutes", () => {
  assert.equal(computeEndsAt(1_000_000, 60), 1_000_000 + 60 * 60000);
  assert.equal(computeEndsAt(0, 30), 30 * 60000);
});

test("isEligibleProfile: coaching dans le pack et actif", () => {
  assert.equal(isEligibleProfile({ coaching_total: 4, tag_status: "actif" }), true);
  assert.equal(isEligibleProfile({ coaching_total: 9999, tag_status: null }), true);
  assert.equal(isEligibleProfile({ coaching_total: 0, tag_status: "actif" }), false);
  assert.equal(isEligibleProfile({ coaching_total: null, tag_status: "actif" }), false);
  assert.equal(isEligibleProfile({ coaching_total: 4, tag_status: "revoque" }), false);
  assert.equal(isEligibleProfile({ coaching_total: 4, tag_status: "termine" }), false);
});

test("overlapsGroupWindow: chevauchement ±30min", () => {
  const gStart = sessionToMs("2026-06-20", "14:00");
  const gEnd = computeEndsAt(gStart, 60); // 14:00 -> 15:00
  // individuelle 14:30 (dure 30min) -> chevauche
  assert.equal(overlapsGroupWindow(sessionToMs("2026-06-20", "14:30"), gStart, gEnd), true);
  // individuelle 13:45 (finit 14:15) -> chevauche le début
  assert.equal(overlapsGroupWindow(sessionToMs("2026-06-20", "13:45"), gStart, gEnd), true);
  // individuelle 13:00 (finit 13:30) -> pas de chevauchement
  assert.equal(overlapsGroupWindow(sessionToMs("2026-06-20", "13:00"), gStart, gEnd), false);
  // individuelle 15:00 (commence à la fin) -> pas de chevauchement
  assert.equal(overlapsGroupWindow(sessionToMs("2026-06-20", "15:00"), gStart, gEnd), false);
});

test("reminderDueMinutes: fenêtre 0..15 min avant le départ", () => {
  const now = 1_000_000_000_000;
  assert.equal(reminderDueMinutes(now + 10 * 60000, now), true);
  assert.equal(reminderDueMinutes(now + 15 * 60000, now), true);
  assert.equal(reminderDueMinutes(now + 0, now), true);
  assert.equal(reminderDueMinutes(now + 16 * 60000, now), false);
  assert.equal(reminderDueMinutes(now - 1, now), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test app/utils/groupCoaching.core.test.mjs`
Expected: FAIL — `Cannot find module './groupCoaching.core.mjs'`.

- [ ] **Step 3: Write minimal implementation**

Create `app/utils/groupCoaching.core.mjs`:

```js
// Logique pure du coaching groupe — sans accès DB, isomorphe (Node + bundler).
// Convention identique à coaching_sessions : offset horaire fixe +01:00.

const INDIV_DURATION_MS = 30 * 60000;

export function sessionToMs(sessionDate, sessionTime) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`).getTime();
}

export function computeEndsAt(startMs, durationMin) {
  return startMs + durationMin * 60000;
}

export function isEligibleProfile(p) {
  const total = p?.coaching_total ?? 0;
  if (total <= 0) return false;
  if (p?.tag_status === "revoque" || p?.tag_status === "termine") return false;
  return true;
}

export function overlapsGroupWindow(indivStartMs, groupStartMs, groupEndMs, indivDurationMs = INDIV_DURATION_MS) {
  return indivStartMs < groupEndMs && indivStartMs + indivDurationMs > groupStartMs;
}

export function reminderDueMinutes(startMs, nowMs) {
  const minutesUntil = (startMs - nowMs) / 60000;
  return minutesUntil >= 0 && minutesUntil <= 15;
}
```

- [ ] **Step 4: Create the type declarations**

Create `app/utils/groupCoaching.core.d.ts`:

```ts
export function sessionToMs(sessionDate: string, sessionTime: string): number;
export function computeEndsAt(startMs: number, durationMin: number): number;
export function isEligibleProfile(p: { coaching_total?: number | null; tag_status?: string | null }): boolean;
export function overlapsGroupWindow(
  indivStartMs: number,
  groupStartMs: number,
  groupEndMs: number,
  indivDurationMs?: number
): boolean;
export function reminderDueMinutes(startMs: number, nowMs: number): boolean;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test app/utils/groupCoaching.core.test.mjs`
Expected: PASS — 6 tests.

- [ ] **Step 6: Commit**

```bash
git add app/utils/groupCoaching.core.mjs app/utils/groupCoaching.core.d.ts app/utils/groupCoaching.core.test.mjs
git commit -m "feat: pure group-coaching helpers (overlap, eligibility, reminder window)"
```

---

### Task 2: Route admin `group-coaching` (GET/POST/DELETE)

**Files:**
- Create: `app/api/admin/group-coaching/route.ts`

**Interfaces:**
- Consumes: `sessionToMs`, `computeEndsAt`, `isEligibleProfile`, `overlapsGroupWindow` (Task 1) ; `getAuthUser` (`app/utils/auth-server`) ; `sendPushToUsers` (`app/utils/push-server`).
- Produces (réponses JSON consommées par l'UI) :
  - GET → `{ sessions: GroupSession[], eligibleCount: number }` où `GroupSession = { id, title, description, session_date, session_time, duration_min, status, scheduled_at, created_at }` (`scheduled_at` = ISO calculé).
  - POST body `{ title, description, scheduled_at, duration_min }` → `{ session: GroupSession, cancelledCount: number }`.
  - DELETE body `{ id }` → `{ ok: true }`.

- [ ] **Step 1: Write the route**

Create `app/api/admin/group-coaching/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { sendPushToUsers } from "@/app/utils/push-server";
import {
  sessionToMs,
  computeEndsAt,
  isEligibleProfile,
  overlapsGroupWindow,
} from "@/app/utils/groupCoaching.core.mjs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UNLIMITED = 9999;
const TIME_ZONE = "Africa/Douala";

async function requireAdmin(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, response: NextResponse.json({ error: "Non autorise." }, { status: 401 }) };
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { user: null, response: NextResponse.json({ error: "Acces refuse." }, { status: 403 }) };
  }
  return { user, response: null };
}

function getSessionParts(date: Date) {
  const sessionDate = date.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const sessionTime = date.toLocaleTimeString("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { sessionDate, sessionTime };
}

function formatWhen(sessionDate: string, sessionTime: string) {
  return new Date(sessionToMs(sessionDate, sessionTime)).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  });
}

function normalize(s: any) {
  return { ...s, scheduled_at: new Date(sessionToMs(s.session_date, s.session_time)).toISOString() };
}

async function getEligibleStudents() {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, coaching_total, tag_status, role")
    .gt("coaching_total", 0);
  return (data ?? []).filter((p) => p.role !== "admin" && isEligibleProfile(p));
}

export async function GET(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

  const { data, error } = await supabaseAdmin
    .from("group_coaching_sessions")
    .select("*")
    .gte("session_date", since)
    .order("session_date", { ascending: true })
    .order("session_time", { ascending: true });

  if (error) {
    console.error("group-coaching GET error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const eligible = await getEligibleStudents();
  return NextResponse.json({ sessions: (data ?? []).map(normalize), eligibleCount: eligible.length });
}

export async function POST(req: Request) {
  const { user, response } = await requireAdmin(req);
  if (response) return response;

  const { title, description, scheduled_at, duration_min } = await req.json();
  const scheduledAt = new Date(scheduled_at);
  const cleanTitle = typeof title === "string" ? title.trim().slice(0, 120) : "";
  const cleanDesc = typeof description === "string" ? description.trim().slice(0, 1000) : null;
  const durationMin = Number.isFinite(duration_min) ? Math.min(240, Math.max(15, Math.round(duration_min))) : 60;

  if (!cleanTitle) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  if (!scheduled_at || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }
  if (scheduledAt.getTime() < Date.now() + 30 * 60 * 1000) {
    return NextResponse.json({ error: "Choisissez un creneau au moins 30 minutes dans le futur." }, { status: 400 });
  }

  const { sessionDate, sessionTime } = getSessionParts(scheduledAt);
  const { data: session, error } = await supabaseAdmin
    .from("group_coaching_sessions")
    .insert({
      title: cleanTitle,
      description: cleanDesc,
      session_date: sessionDate,
      session_time: sessionTime,
      duration_min: durationMin,
      status: "scheduled",
      created_by: user!.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("group-coaching POST error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const groupStart = sessionToMs(sessionDate, sessionTime);
  const groupEnd = computeEndsAt(groupStart, durationMin);
  const when = formatWhen(sessionDate, sessionTime);

  // --- Annulation des séances individuelles en conflit ---
  const sinceDate = new Date(groupStart - 60 * 60000).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const untilDate = new Date(groupEnd + 60 * 60000).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

  const { data: indiv } = await supabaseAdmin
    .from("coaching_sessions")
    .select("id, user_id, session_date, session_time, status, profiles:user_id(coaching_total, coaching_used)")
    .in("status", ["en_attente", "confirme"])
    .gte("session_date", sinceDate)
    .lte("session_date", untilDate);

  const conflicts = (indiv ?? []).filter((s) =>
    overlapsGroupWindow(sessionToMs(s.session_date, s.session_time), groupStart, groupEnd)
  );

  const conflictUserIds: string[] = [];
  for (const c of conflicts) {
    await supabaseAdmin
      .from("coaching_sessions")
      .update({ status: "annule", cancel_reason: "Annulé : session de coaching groupe programmée" })
      .eq("id", c.id);

    if (c.status === "confirme") {
      const prof = (c.profiles as any) ?? {};
      const total = prof.coaching_total ?? 0;
      const used = prof.coaching_used ?? 0;
      if (total !== UNLIMITED && used > 0) {
        await supabaseAdmin.from("profiles").update({ coaching_used: used - 1 }).eq("id", c.user_id);
      }
    }
    conflictUserIds.push(c.user_id);
  }

  if (conflictUserIds.length > 0) {
    const msg = `Votre coaching du ${when} est annulé : une session de coaching groupe a été programmée à ce créneau.`;
    await supabaseAdmin.from("notifications").insert(conflictUserIds.map((id) => ({ user_id: id, message: msg })));
    await sendPushToUsers(conflictUserIds, {
      title: "Coaching reprogrammé",
      body: msg,
      url: "/dashboard/coaching",
    });
  }

  // --- Notification de création à tous les éligibles ---
  const eligible = await getEligibleStudents();
  const eligibleIds = eligible.map((p) => p.id);
  if (eligibleIds.length > 0) {
    const msg = `Coaching groupe : ${cleanTitle} le ${when}. Rejoignez la session !`;
    await supabaseAdmin.from("notifications").insert(eligibleIds.map((id) => ({ user_id: id, message: msg })));
    await sendPushToUsers(eligibleIds, {
      title: "Nouvelle session de coaching groupe",
      body: msg,
      url: "/dashboard/coaching",
    });
  }

  return NextResponse.json({ session: normalize(session), cancelledCount: conflictUserIds.length });
}

export async function DELETE(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID manquant." }, { status: 400 });

  const { data: session } = await supabaseAdmin
    .from("group_coaching_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  if (session.status !== "scheduled") {
    return NextResponse.json({ error: "Cette session ne peut pas être annulée." }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from("group_coaching_sessions")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    console.error("group-coaching DELETE error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const when = formatWhen(session.session_date, session.session_time);
  const eligible = await getEligibleStudents();
  const eligibleIds = eligible.map((p) => p.id);
  if (eligibleIds.length > 0) {
    const msg = `La session de coaching groupe "${session.title}" du ${when} est annulée.`;
    await supabaseAdmin.from("notifications").insert(eligibleIds.map((uid) => ({ user_id: uid, message: msg })));
    await sendPushToUsers(eligibleIds, { title: "Coaching groupe annulé", body: msg, url: "/dashboard/coaching" });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Build to verify the route typechecks**

Run: `npm run build`
Expected: build réussit (pas d'erreur TS sur `app/api/admin/group-coaching/route.ts`).

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/group-coaching/route.ts
git commit -m "feat: admin group-coaching API (create with conflict-cancel, list, cancel)"
```

---

### Task 3: Route token room groupe

**Files:**
- Create: `app/api/coaching/group-room-token/route.ts`

**Interfaces:**
- Consumes: `sessionToMs`, `computeEndsAt`, `isEligibleProfile` (Task 1) ; `getAuthUser` ; `AccessToken` (`livekit-server-sdk`).
- Produces: POST body `{ id }` → `{ url, token, endsAt }` (`endsAt` epoch ms). Room name `group-coaching-${id}`.

- [ ] **Step 1: Write the route**

Create `app/api/coaching/group-room-token/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { AccessToken } from "livekit-server-sdk";
import { sessionToMs, computeEndsAt, isEligibleProfile } from "@/app/utils/groupCoaching.core.mjs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JOIN_BEFORE_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: "Visioconférence non configurée." }, { status: 503 });
  }

  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID manquant." }, { status: 400 });

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("group_coaching_sessions").select("*").eq("id", id).single(),
    supabaseAdmin.from("profiles").select("role, prenom, email, coaching_total, tag_status").eq("id", user.id).single(),
  ]);

  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const isAdmin = profile?.role === "admin";
  if (!isAdmin && !isEligibleProfile(profile ?? {})) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (session.status !== "scheduled") {
    return NextResponse.json({ error: "La séance n'est pas disponible." }, { status: 409 });
  }

  const start = sessionToMs(session.session_date, session.session_time);
  const endsAt = computeEndsAt(start, session.duration_min);
  const now = Date.now();
  if (now < start - JOIN_BEFORE_MS) {
    return NextResponse.json({ error: "La salle ouvre 15 minutes avant l'heure prévue." }, { status: 403 });
  }
  if (now > endsAt) {
    return NextResponse.json({ error: "Cette séance est terminée." }, { status: 403 });
  }

  const roomName = `group-coaching-${id}`;
  const ttlSec = Math.max(60, Math.floor((endsAt - now) / 1000));

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: profile?.prenom || profile?.email || "Participant",
    ttl: ttlSec,
  });
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

  const token = await at.toJwt();
  return NextResponse.json({ url: wsUrl, token, endsAt });
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: build réussit.

- [ ] **Step 3: Commit**

```bash
git add app/api/coaching/group-room-token/route.ts
git commit -m "feat: group coaching room token endpoint"
```

---

### Task 4: Extension du cron rappels pour le groupe

**Files:**
- Modify: `app/api/coaching/reminders/route.ts`

**Interfaces:**
- Consumes: `sessionToMs`, `reminderDueMinutes` (Task 1).
- Produces: aucune nouvelle interface ; le cron `*/5 * * * *` existant déclenche aussi les rappels groupe. Réutilise `vercel.json` tel quel (pas de modification).

- [ ] **Step 1: Ajouter l'import du core**

Dans `app/api/coaching/reminders/route.ts`, après les imports existants (ligne 4), ajouter :

```ts
import { sessionToMs, reminderDueMinutes } from "@/app/utils/groupCoaching.core.mjs";
```

- [ ] **Step 2: Ajouter le bloc rappel groupe avant le `return` final**

Dans `app/api/coaching/reminders/route.ts`, juste avant la ligne finale `return NextResponse.json({ sent, total: appointments?.length ?? 0 });`, insérer :

```ts
  // --- Rappels sessions groupe ---
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

  const { data: groupSessions } = await supabaseAdmin
    .from("group_coaching_sessions")
    .select("id, title, session_date, session_time")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("session_date", todayStr)
    .lte("session_date", tomorrowStr);

  let groupSent = 0;
  if ((groupSessions ?? []).length > 0) {
    const { data: eligibleProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, coaching_total, tag_status, role")
      .gt("coaching_total", 0);

    const eligibleIds = (eligibleProfiles ?? [])
      .filter((p) => p.role !== "admin" && p.coaching_total > 0 && p.tag_status !== "revoque" && p.tag_status !== "termine")
      .map((p) => p.id);

    for (const gs of groupSessions ?? []) {
      const start = sessionToMs(gs.session_date, gs.session_time);
      if (!reminderDueMinutes(start, Date.now())) continue;

      if (eligibleIds.length > 0) {
        const msg = `Rappel : la session de coaching groupe "${gs.title}" commence dans 15 minutes.`;
        await supabaseAdmin.from("notifications").insert(eligibleIds.map((id) => ({ user_id: id, message: msg })));
        await sendPushToUsers(eligibleIds, {
          title: "Rappel coaching groupe",
          body: msg,
          url: "/dashboard/coaching",
        });
      }

      await supabaseAdmin
        .from("group_coaching_sessions")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", gs.id);

      groupSent += 1;
    }
  }

  return NextResponse.json({ sent, total: appointments?.length ?? 0, groupSent });
```

Puis supprimer l'ancienne ligne `return NextResponse.json({ sent, total: appointments?.length ?? 0 });` qui la précédait (remplacée par le `return` ci-dessus).

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: build réussit. `sendPushToUsers` est déjà importé dans ce fichier.

- [ ] **Step 4: Commit**

```bash
git add app/api/coaching/reminders/route.ts
git commit -m "feat: 15min push reminder for group coaching sessions (cron)"
```

---

### Task 5: Composant chrono `CoachingTimer` + intégration room individuelle

**Files:**
- Create: `app/components/CoachingTimer.tsx`
- Modify: `app/dashboard/coaching/room/[id]/page.tsx`

**Interfaces:**
- Consumes: rien (composant autonome).
- Produces: `<CoachingTimer endsAt={number} />` — badge `MM:SS` restant, vire au rouge sous 5min, affiche `00:00` à l'échéance.

- [ ] **Step 1: Créer le composant**

Create `app/components/CoachingTimer.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function CoachingTimer({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, endsAt - now);
  const totalSec = Math.floor(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const urgent = remainingMs <= 5 * 60 * 1000;

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black tabular-nums ${
        urgent ? "bg-red-500/20 text-red-300" : "bg-slate-800 text-slate-200"
      }`}
      aria-label="Temps restant"
    >
      <Clock size={14} className={urgent ? "text-red-300" : "text-orange-500"} />
      {mm}:{ss}
    </div>
  );
}
```

- [ ] **Step 2: Intégrer dans la room individuelle**

Dans `app/dashboard/coaching/room/[id]/page.tsx` :

Ajouter l'import après la ligne 7 (`import { ArrowLeft, Lock, Video } from "lucide-react";`) :

```tsx
import CoachingTimer from "@/app/components/CoachingTimer";
```

Puis dans le header de la room (bloc `state === "ready" && room`), remplacer ce fragment :

```tsx
          <div className="flex items-center gap-2 text-white">
            <Video size={16} className="text-orange-500" />
            <span className="text-sm font-bold">Coaching Live</span>
          </div>
```

par :

```tsx
          <div className="flex items-center gap-3 text-white">
            <div className="flex items-center gap-2">
              <Video size={16} className="text-orange-500" />
              <span className="text-sm font-bold">Coaching Live</span>
            </div>
            <CoachingTimer endsAt={room.endsAt} />
          </div>
```

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: build réussit.

- [ ] **Step 4: Commit**

```bash
git add app/components/CoachingTimer.tsx app/dashboard/coaching/room/[id]/page.tsx
git commit -m "feat: on-screen countdown timer in individual coaching room"
```

---

### Task 6: Page room groupe

**Files:**
- Create: `app/dashboard/coaching/room/group/[id]/page.tsx`

**Interfaces:**
- Consumes: `/api/coaching/group-room-token` (Task 3) ; `CoachingTimer` (Task 5) ; `LiveKitMeeting` (`app/components/LiveKitMeeting`).
- Produces: page route `/dashboard/coaching/room/group/[id]`.

- [ ] **Step 1: Créer la page (miroir de la room individuelle)**

Create `app/dashboard/coaching/room/group/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import LiveKitMeeting from "@/app/components/LiveKitMeeting";
import CoachingTimer from "@/app/components/CoachingTimer";
import { ArrowLeft, Lock, Video } from "lucide-react";

type State = "loading" | "ready" | "error";

export default function GroupCoachingRoomPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = String(params?.id || "");

  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [room, setRoom] = useState<{ url: string; token: string; endsAt: number } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/coaching/group-room-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: sessionId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(json.error || "Impossible de rejoindre la séance.");
        setState("error");
        return;
      }

      setRoom({ url: json.url, token: json.token, endsAt: json.endsAt });
      setState("ready");
    };

    init();
  }, [router, sessionId]);

  useEffect(() => {
    if (state !== "ready" || !room) return;
    const remaining = room.endsAt - Date.now();
    if (remaining <= 0) {
      router.push("/dashboard/coaching");
      return;
    }
    const timer = setTimeout(() => router.push("/dashboard/coaching"), remaining);
    return () => clearTimeout(timer);
  }, [state, room, router]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (state === "ready" && room) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="flex items-center gap-2">
              <Video size={16} className="text-orange-500" />
              <span className="text-sm font-bold">Coaching Groupe</span>
            </div>
            <CoachingTimer endsAt={room.endsAt} />
          </div>
          <button
            onClick={() => router.push("/dashboard/coaching")}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Quitter
          </button>
        </div>
        <div className="flex-1 min-h-0 relative">
          <LiveKitMeeting
            url={room.url}
            token={room.token}
            onClose={() => router.push("/dashboard/coaching")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-xl max-w-md w-full flex flex-col items-center">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6 border border-orange-100">
          <Lock className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className="text-2xl font-black mb-3 text-slate-950">Séance indisponible</h1>
        <p className="text-slate-500 mb-8 font-medium text-sm leading-relaxed">{errorMsg}</p>
        <button
          onClick={() => router.push("/dashboard/coaching")}
          className="w-full bg-slate-950 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <ArrowLeft size={14} /> Retour au coaching
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: build réussit.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/coaching/room/group/[id]/page.tsx
git commit -m "feat: group coaching room page with countdown"
```

---

### Task 7: Bannière sessions groupe sur le dashboard étudiant

**Files:**
- Modify: `app/dashboard/coaching/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/group-coaching` n'est PAS accessible aux étudiants → ce task ajoute une lecture directe Supabase côté client (table `group_coaching_sessions`, status `scheduled`, à venir).
- Produces: bannière « Sessions de coaching groupe » avec bouton Rejoindre → `/dashboard/coaching/room/group/${id}`.

- [ ] **Step 1: Ajouter le type et l'état**

Dans `app/dashboard/coaching/page.tsx`, après le type `Appointment` (ligne 30), ajouter :

```tsx
type GroupSession = {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  session_time: string;
  duration_min: number;
  status: string;
};
```

Dans le composant, après `const [appointments, setAppointments] = useState<Appointment[]>([]);` (ligne 50), ajouter :

```tsx
  const [groupSessions, setGroupSessions] = useState<GroupSession[]>([]);
```

- [ ] **Step 2: Charger les sessions groupe**

Dans `app/dashboard/coaching/page.tsx`, dans le bloc `if (profile.coaching_total > 0 || profile.role === "admin")` (après `await fetchAppointments(session.access_token);`, ligne 111), ajouter :

```tsx
          const todayStr = new Date().toLocaleDateString("en-CA");
          const { data: groups } = await supabase
            .from("group_coaching_sessions")
            .select("id, title, description, session_date, session_time, duration_min, status")
            .eq("status", "scheduled")
            .gte("session_date", todayStr)
            .order("session_date", { ascending: true })
            .order("session_time", { ascending: true });
          setGroupSessions(groups ?? []);
```

- [ ] **Step 3: Ajouter le helper de fenêtre de jonction et le rendu de la bannière**

Dans `app/dashboard/coaching/page.tsx`, après la fonction `canJoin` (ligne 66), ajouter :

```tsx
  const groupStartMs = (g: GroupSession) =>
    new Date(`${g.session_date}T${g.session_time.slice(0, 5)}:00+01:00`).getTime();

  const canJoinGroup = (g: GroupSession) => {
    const start = groupStartMs(g);
    const end = start + g.duration_min * 60 * 1000;
    const now = Date.now();
    return now >= start - 15 * 60 * 1000 && now <= end;
  };

  const visibleGroupSessions = groupSessions.filter(
    (g) => groupStartMs(g) + g.duration_min * 60 * 1000 > Date.now()
  );
```

Puis dans le `return` de `main`, juste après l'ouverture `<main className="max-w-5xl mx-auto px-4 md:px-8 pt-8">` (ligne 298), insérer la bannière :

```tsx
        {visibleGroupSessions.length > 0 && (
          <div className="mb-8 space-y-3">
            {visibleGroupSessions.map((g) => (
              <div key={g.id} className="rounded-2xl border border-orange-200 bg-orange-50 overflow-hidden shadow-sm">
                <div className="px-5 py-3 flex items-center gap-2 border-b border-orange-100">
                  <Video className="w-4 h-4 text-orange-600 shrink-0" />
                  <p className="text-xs font-black uppercase tracking-widest text-orange-700">Session de coaching groupe</p>
                </div>
                <div className="bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-slate-950 text-base">{g.title}</p>
                    {g.description && <p className="text-xs text-slate-500 font-medium mt-1 max-w-md">{g.description}</p>}
                    <p className="text-orange-600 font-black text-sm mt-1">
                      {new Date(groupStartMs(g)).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      {" — "}
                      {new Date(groupStartMs(g)).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {" ("}{g.duration_min} min{")"}
                    </p>
                  </div>
                  {canJoinGroup(g) ? (
                    <button
                      onClick={() => router.push(`/dashboard/coaching/room/group/${g.id}`)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shrink-0"
                    >
                      <Video className="w-4 h-4" /> Rejoindre
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                      Accès 15 min avant
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: build réussit. `Video` est déjà importé dans ce fichier (ligne 11).

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/coaching/page.tsx
git commit -m "feat: group coaching banner with join button on student dashboard"
```

---

### Task 8: Carte admin « Programmer session groupe »

**Files:**
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `/api/admin/group-coaching` GET/POST/DELETE (Task 2).
- Produces: dans l'onglet `coaching`, un bloc de création + liste des sessions groupe à venir avec annulation.

- [ ] **Step 1: Ajouter type, états et fetch**

Dans `app/admin/page.tsx`, près des autres états coaching (après `const [coachingError, setCoachingError] = useState("");`, ligne ~240), ajouter :

```tsx
  const [groupSessions, setGroupSessions] = useState<any[]>([]);
  const [groupEligibleCount, setGroupEligibleCount] = useState(0);
  const [groupForm, setGroupForm] = useState({ title: "", description: "", date: "", time: "", duration_min: 60 });
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [groupCancelId, setGroupCancelId] = useState<string | null>(null);
```

Dans la fonction `fetchCoachingAppointments` (existante, déclenchée pour l'onglet coaching), après le `setCoaching...` de fin, ajouter un appel à un nouveau fetch. D'abord créer la fonction de fetch groupe — l'ajouter juste après `fetchCoachingAppointments` :

```tsx
  const fetchGroupSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/admin/group-coaching", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setGroupSessions(json.sessions ?? []);
        setGroupEligibleCount(json.eligibleCount ?? 0);
      }
    } catch {
      /* silencieux */
    }
  };
```

Puis dans le `useEffect` qui réagit à `activeTab` (ligne ~493, `if (activeTab === "coaching") fetchCoachingAppointments();`), ajouter sur la ligne suivante :

```tsx
    if (activeTab === "coaching") fetchGroupSessions();
```

- [ ] **Step 2: Ajouter les handlers create / cancel**

Dans `app/admin/page.tsx`, après `fetchGroupSessions`, ajouter :

```tsx
  const handleCreateGroupSession = async () => {
    setGroupError("");
    if (!groupForm.title.trim() || !groupForm.date || !groupForm.time) {
      setGroupError("Titre, date et heure sont requis.");
      return;
    }
    setGroupSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const scheduledAt = new Date(`${groupForm.date}T${groupForm.time}`);
      const res = await fetch("/api/admin/group-coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          title: groupForm.title.trim(),
          description: groupForm.description.trim() || null,
          scheduled_at: scheduledAt.toISOString(),
          duration_min: Number(groupForm.duration_min),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGroupError(json.error || "Erreur lors de la création.");
        return;
      }
      setGroupForm({ title: "", description: "", date: "", time: "", duration_min: 60 });
      await fetchGroupSessions();
    } finally {
      setGroupSubmitting(false);
    }
  };

  const handleCancelGroupSession = async (id: string) => {
    setGroupCancelId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/admin/group-coaching", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id }),
      });
      if (res.ok) await fetchGroupSessions();
    } finally {
      setGroupCancelId(null);
    }
  };
```

- [ ] **Step 3: Ajouter le bloc UI dans l'onglet coaching**

Repérer le rendu de l'onglet coaching (`activeTab === "coaching"`) dans le JSX. Au début de ce bloc (avant la liste des rendez-vous individuels existante), insérer la carte de programmation groupe :

```tsx
        <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Programmer une session groupe</h3>
            <span className="text-[11px] font-bold text-slate-400">{groupEligibleCount} étudiant(s) éligible(s)</span>
          </div>

          {groupError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-bold">{groupError}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              value={groupForm.title}
              onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
              placeholder="Titre (ex : Révision grammaire B1)"
              maxLength={120}
              className="bg-slate-50 border border-slate-200 focus:border-orange-400 outline-none rounded-xl px-3 py-2.5 text-sm text-slate-800"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={groupForm.date}
                onChange={(e) => setGroupForm({ ...groupForm, date: e.target.value })}
                className="bg-slate-50 border border-slate-200 focus:border-orange-400 outline-none rounded-xl px-2 py-2.5 text-sm text-slate-800"
              />
              <input
                type="time"
                value={groupForm.time}
                onChange={(e) => setGroupForm({ ...groupForm, time: e.target.value })}
                className="bg-slate-50 border border-slate-200 focus:border-orange-400 outline-none rounded-xl px-2 py-2.5 text-sm text-slate-800"
              />
              <select
                value={groupForm.duration_min}
                onChange={(e) => setGroupForm({ ...groupForm, duration_min: Number(e.target.value) })}
                className="bg-slate-50 border border-slate-200 focus:border-orange-400 outline-none rounded-xl px-2 py-2.5 text-sm text-slate-800"
              >
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </div>
          </div>

          <textarea
            value={groupForm.description}
            onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
            placeholder="Description (optionnel)"
            maxLength={1000}
            rows={2}
            className="w-full mb-3 bg-slate-50 border border-slate-200 focus:border-orange-400 outline-none rounded-xl px-3 py-2.5 text-sm text-slate-800 resize-none"
          />

          <button
            onClick={handleCreateGroupSession}
            disabled={groupSubmitting}
            className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60"
          >
            {groupSubmitting ? "Programmation..." : "Programmer + notifier tout le monde"}
          </button>

          {groupSessions.filter((g) => g.status === "scheduled").length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Sessions groupe à venir</p>
              {groupSessions
                .filter((g) => g.status === "scheduled")
                .map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{g.title}</p>
                      <p className="text-xs font-bold text-orange-600 mt-0.5">
                        {new Date(g.scheduled_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} · {g.duration_min} min
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelGroupSession(g.id)}
                      disabled={groupCancelId === g.id}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-red-300 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 shrink-0"
                    >
                      {groupCancelId === g.id ? "..." : "Annuler"}
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: build réussit.

- [ ] **Step 5: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: admin UI to schedule and cancel group coaching sessions"
```

---

## Self-Review

**Spec coverage:**
- §1 Modèle de données → table déjà créée + utilisée Tasks 2/3/4/7/8. ✓
- §2 Endpoints (admin CRUD, group-room-token, reminders) → Tasks 2, 3, 4. ✓
- §3 Annulation conflits (overlap ±30min, remboursement crédit) → Task 2 POST + Task 1 `overlapsGroupWindow`. ✓
- §4 Notifications (création, rappel 15min, annulation) → Task 2 (création + annulation), Task 4 (rappel). ✓
- §5 UI (admin, étudiant, room groupe) → Tasks 8, 7, 6. ✓
- §6 Chrono individuel + groupe → Task 5 (composant + individuel), Task 6 (groupe). ✓
- §7 Tests → Task 1 (`groupCoaching.core.test.mjs`). ✓

**Placeholder scan:** aucun TBD/TODO ; tout le code est complet.

**Type consistency:** `sessionToMs`/`computeEndsAt`/`isEligibleProfile`/`overlapsGroupWindow`/`reminderDueMinutes` définis Task 1, réutilisés à l'identique Tasks 2/3/4. Réponses API (`sessions`, `eligibleCount`, `session`, `cancelledCount`) cohérentes entre Task 2 (producteur) et Tasks 7/8 (consommateurs). `endsAt` produit Task 3, consommé Tasks 5/6. `CoachingTimer` signature `{ endsAt: number }` cohérente Tasks 5/6.

**Note d'implémentation :** la lecture étudiante des sessions groupe (Task 7) suppose que la RLS de `group_coaching_sessions` autorise le `SELECT` aux utilisateurs authentifiés. Si la table a RLS activée sans policy SELECT, ajouter une policy `select` pour `authenticated` (status `scheduled`), ou exposer une route GET publique-étudiant dédiée. À vérifier au début de Task 7.
