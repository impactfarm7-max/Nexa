# Fermeture des buckets Storage publics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fermer la fuite de données confirmée (buckets Storage `mission-files`, `course-pdfs`, `course-videos`, `community-files` marqués publics, accessibles sans authentification) sans casser le contenu déjà uploadé.

**Architecture:** Un helper serveur résout une valeur stockée (ancienne URL publique complète OU futur chemin nu) en URL signée à courte durée de vie. `course-pdfs`/`course-videos` sont déjà proxifiés (`/api/lesson-media/[id]` + `/document/[id]`) — une seule ligne à changer. `mission-files` et `community-files` reçoivent chacun une nouvelle route proxy avec vérification d'autorisation avant signature. Les 4 buckets passent `public = false`, avec des policies RLS Storage scopées en filet de sécurité supplémentaire.

**Tech Stack:** Next.js API routes, Supabase Storage (`createSignedUrl`), Postgres RLS.

**Spec:** `docs/superpowers/specs/2026-09-11-buckets-prives-storage-design.md`

## Global Constraints

- Aucune donnée existante n'est migrée (URLs déjà stockées restent telles quelles) — le helper de résolution gère les deux formats.
- Toutes les chaînes visibles utilisateur sont en français.
- Aucune régression : un fichier uploadé avant la bascule doit rester accessible aux utilisateurs autorisés après.
- Ne pas toucher aux buckets `avatars`, `certificates`, `center-logos`, `room-photos`, `support-attachments` (restent publics par design).

---

## File Structure

- Create: `academie-langues/app/utils/storage-signed-url.server.ts` — helper de résolution de chemin + génération d'URL signée.
- Modify: `academie-langues/app/api/lesson-media/[id]/route.ts` — utilise le helper au lieu de `fetch(media.url)` direct.
- Create: `academie-langues/app/api/missions/attachment/route.ts` — proxy authentifié pour les pièces jointes de devoirs.
- Modify: `academie-langues/app/centre/cours/devoirs/page.tsx` — bouton téléchargement via fetch+blob au lieu de `<a href>` direct.
- Modify: `academie-langues/app/tcf-canada/missions/page.tsx` — idem côté étudiant.
- Create: `academie-langues/app/api/communaute/signed-urls/route.ts` — résolution batch d'URLs signées pour le chat communauté.
- Modify: `academie-langues/app/communaute/page.tsx` — substitue les URLs signées avant rendu.
- Modify: `academie-langues/app/centre/communaute/page.tsx` — idem côté centre.
- Create: `academie-langues/supabase-storage-buckets-private-2026-09-11.sql` — bascule `public=false` + policies RLS Storage scopées.

---

### Task 1: Helper de résolution + signature d'URL Storage

**Files:**
- Create: `academie-langues/app/utils/storage-signed-url.server.ts`

**Interfaces:**
- Produces: `resolveStoragePath(bucket: string, stored: string): string`, `getSignedStorageUrl(bucket: string, stored: string, expiresIn?: number): Promise<string | null>`.
- Consumed by: Task 2 (lesson-media), Task 3 (missions attachment), Task 6 (communauté signed-urls).

- [ ] **Step 1: Écrire le helper**

`academie-langues/app/utils/storage-signed-url.server.ts` :

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Extrait le chemin (bucket-relative) d'une valeur stockée en base : soit
 * une ancienne URL publique complète (.../storage/v1/object/public/<bucket>/<path>),
 * soit déjà un chemin nu. Ne migre rien, permet de rester compatible avec
 * les lignes existantes sans les réécrire.
 */
export function resolveStoragePath(bucket: string, stored: string): string {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = stored.indexOf(marker);
  if (idx === -1) return stored;
  return decodeURIComponent(stored.slice(idx + marker.length));
}

/**
 * Génère une URL signée à courte durée de vie pour un objet Storage, à
 * partir d'une valeur stockée (URL complète historique ou chemin nu).
 * Retourne null si le fichier n'existe plus / erreur Storage.
 */
export async function getSignedStorageUrl(
  bucket: string,
  stored: string,
  expiresIn = 60,
): Promise<string | null> {
  const path = resolveStoragePath(bucket, stored);
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
```

- [ ] **Step 2: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit`
Expected: aucune erreur liée à ce fichier.

- [ ] **Step 3: Commit**

```bash
git add app/utils/storage-signed-url.server.ts
git commit -m "feat: helper de resolution/signature d'URL Storage"
```

---

### Task 2: course-pdfs / course-videos — brancher le proxy existant sur une URL signée

**Files:**
- Modify: `academie-langues/app/api/lesson-media/[id]/route.ts`

**Interfaces:**
- Consumes: `getSignedStorageUrl(bucket, stored, expiresIn)` (Task 1).
- Produces: comportement inchangé pour l'appelant (même réponse streamée) — seule la source interne du fetch change.

Contexte : ce fichier existe déjà et fait tout le travail d'autorisation
(vérifie que l'appelant appartient au centre du cours ou y a accès en tant
qu'étudiant). Le seul problème : il fait `fetch(media.url)` sur l'URL
Storage publique brute stockée en base, ce qui cassera dès que le bucket
passera en privé (Task 8). `media.type` vaut `"pdf"` ou `"video_upload"`
(jamais `"video_link"` à ce point du code, déjà filtré plus haut) — le
bucket correspondant est `course-pdfs` pour `"pdf"`, `course-videos` pour
`"video_upload"`.

- [ ] **Step 1: Écrire le test (pas de framework de route existant dans ce repo — vérification manuelle documentée au Step 3)**

Ce repo n'a pas de harness de test pour les routes Next.js (`package.json`
`"test"` ne couvre que `app/**/*.test.mjs`, des scripts Node purs). Ne pas
en inventer un pour cette seule route — suivre le Step 3 (vérification
manuelle scriptée) comme le reste des tâches de ce plan.

- [ ] **Step 2: Modifier la route**

Dans `academie-langues/app/api/lesson-media/[id]/route.ts`, ajouter l'import :

```ts
import { getSignedStorageUrl } from "@/app/utils/storage-signed-url.server";
```

Remplacer :

```ts
  const upstream = await fetch(media.url);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Impossible de charger le fichier." }, { status: 502 });
  }
```

par :

```ts
  const bucket = media.type === "video_upload" ? "course-videos" : "course-pdfs";
  const signedUrl = await getSignedStorageUrl(bucket, media.url, 60);
  if (!signedUrl) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const upstream = await fetch(signedUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Impossible de charger le fichier." }, { status: 502 });
  }
```

- [ ] **Step 3: Vérifier manuellement**

Run: `cd academie-langues && npx tsc --noEmit` — doit rester clean.

Avec le serveur dev lancé et un cours existant ayant un média `pdf` ou
`video_upload` (chercher un `lesson_media.id` réel via un script Node
`service_role` si besoin, ou en créer un via l'UI `gestion-cours`) :

```bash
curl -s "http://localhost:3000/api/lesson-media/<id>?meta=1" -H "Authorization: Bearer <token_d_un_compte_du_bon_centre>"
```
Expected: `200` avec les métadonnées (comme avant — comportement inchangé, la route continue de fonctionner puisque le bucket est encore public à ce stade du plan).

- [ ] **Step 4: Commit**

```bash
git add app/api/lesson-media/\[id\]/route.ts
git commit -m "fix: lesson-media utilise une URL signee au lieu du fetch direct"
```

---

### Task 3: Proxy authentifié pour les pièces jointes de devoirs (mission-files)

**Files:**
- Create: `academie-langues/app/api/missions/attachment/route.ts`

**Interfaces:**
- Consumes: `getSignedStorageUrl` (Task 1), `getAuthUser` (`@/app/utils/auth-server`), `isStudentEligibleForMission` (`@/app/utils/missionTargeting`, signature `(supabaseAdmin, mission, userId): Promise<boolean>`, déjà utilisée dans `app/api/missions/submit/route.ts:63`).
- Produces: `GET /api/missions/attachment?missionId=<uuid>` → stream du fichier (200) avec `Content-Type`/`Content-Disposition`, ou `401`/`403`/`404`.
- Consumed by: Task 4 (devoirs/page.tsx), Task 5 (missions/page.tsx).

- [ ] **Step 1: Écrire la route**

`academie-langues/app/api/missions/attachment/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { isStudentEligibleForMission } from "@/app/utils/missionTargeting";
import { getSignedStorageUrl } from "@/app/utils/storage-signed-url.server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const missionId = req.nextUrl.searchParams.get("missionId");
  if (!missionId) return NextResponse.json({ error: "missionId requis." }, { status: 400 });

  const { data: mission } = await supabaseAdmin
    .from("missions")
    .select("id, center_id, target_user_id, groupe_id, filiere_matiere_id, attachment_url, attachment_name")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission?.attachment_url) {
    return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", user.id)
    .maybeSingle();

  const isStaff =
    !!profile &&
    STAFF_ROLES.includes(profile.role || "") &&
    profile.center_id === mission.center_id;
  const isTargetStudent =
    !isStaff && (await isStudentEligibleForMission(supabaseAdmin, mission, user.id));

  if (!isStaff && !isTargetStudent) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const signedUrl = await getSignedStorageUrl("mission-files", mission.attachment_url, 60);
  if (!signedUrl) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const upstream = await fetch(signedUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Impossible de charger le fichier." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const filename = (mission.attachment_name || "piece-jointe").replace(/[^\w.\-À-ÿ ]+/g, "_");
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

- [ ] **Step 2: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit` — clean.

- [ ] **Step 3: Commit**

```bash
git add app/api/missions/attachment/route.ts
git commit -m "feat: proxy authentifie pour les pieces jointes de devoirs"
```

---

### Task 4: Centre — bouton téléchargement pièce jointe via le proxy

**Files:**
- Modify: `academie-langues/app/centre/cours/devoirs/page.tsx`

**Interfaces:**
- Consumes: `GET /api/missions/attachment?missionId=<id>` (Task 3).

Contexte : ligne ~895-897, le code actuel est (à confirmer en lisant le
fichier avant d'éditer, la ligne exacte a pu bouger) :

```tsx
{d.attachment_url && (
  <a href={d.attachment_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
```

- [ ] **Step 1: Lire le contexte exact**

Read: `academie-langues/app/centre/cours/devoirs/page.tsx` autour de la ligne 895 pour voir le JSX complet du lien (texte affiché, classes CSS) avant de le remplacer — préserver le style, changer uniquement le mécanisme de récupération.

- [ ] **Step 2: Remplacer le lien direct par un bouton avec fetch authentifié**

Remplacer le `<a href={d.attachment_url} ...>...</a>` par un `<button>` de
même apparence visuelle (mêmes classes CSS que le `<a>` existant), avec :

```tsx
onClick={async (e) => {
  e.stopPropagation();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const res = await fetch(`/api/missions/attachment?missionId=${d.id}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}}
```

(`supabase` est déjà importé dans ce fichier — vérifier l'import exact en
lisant le haut du fichier avant d'éditer ; s'il n'est pas déjà importé,
ajouter `import { supabase } from "@/app/utils/supabase";`.)

- [ ] **Step 3: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit` — clean.

- [ ] **Step 4: Commit**

```bash
git add app/centre/cours/devoirs/page.tsx
git commit -m "fix: telechargement piece jointe devoir via proxy authentifie"
```

---

### Task 5: Étudiant — même correctif côté vue mission

**Files:**
- Modify: `academie-langues/app/tcf-canada/missions/page.tsx`

**Interfaces:**
- Consumes: `GET /api/missions/attachment?missionId=<id>` (Task 3).

- [ ] **Step 1: Lire le fichier pour localiser le rendu de `attachment_url`**

Read: `academie-langues/app/tcf-canada/missions/page.tsx`, chercher
`attachment_url` (vu ligne 31 et 118 lors de l'audit — confirmer le rendu
JSX exact, probablement aussi un `<a href={...}>`).

- [ ] **Step 2: Appliquer le même correctif qu'à la Task 4**

Même mécanisme (bouton + fetch authentifié + blob + `window.open`),
adapté au style JSX de ce fichier. Vérifier l'import de `supabase` en haut
du fichier (probablement déjà présent, ce fichier fait déjà des appels
authentifiés ailleurs).

- [ ] **Step 3: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit` — clean.

- [ ] **Step 4: Commit**

```bash
git add app/tcf-canada/missions/page.tsx
git commit -m "fix: telechargement piece jointe mission (etudiant) via proxy authentifie"
```

---

### Task 6: Résolution batch d'URLs signées pour la communauté

**Files:**
- Create: `academie-langues/app/api/communaute/signed-urls/route.ts`

**Interfaces:**
- Consumes: `getSignedStorageUrl` (Task 1), `getAuthUser`.
- Produces: `POST /api/communaute/signed-urls` body `{ urls: string[] }` → `200 { signed: Record<string, string | null> }` (clé = URL originale, valeur = URL signée ou `null` si non autorisé/introuvable).
- Consumed par : Task 7, Task 8.

Contexte : le chemin Storage de `community-files` est
`${centerId}/${activeRoom.id}/${timestamp}_${rand}.${ext}` (vu dans
`app/centre/communaute/page.tsx:449`). L'autorisation doit vérifier que
l'appelant est bien membre du salon `activeRoom.id` (table
`community_room_members`) OU staff du centre `centerId`.

- [ ] **Step 1: Écrire la route**

`academie-langues/app/api/communaute/signed-urls/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { getSignedStorageUrl, resolveStoragePath } from "@/app/utils/storage-signed-url.server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const urls = Array.isArray(body.urls) ? (body.urls as string[]).slice(0, 100) : [];
  if (urls.length === 0) return NextResponse.json({ signed: {} });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", user.id)
    .maybeSingle();
  const isStaff = !!profile && STAFF_ROLES.includes(profile.role || "");

  const { data: memberships } = await supabaseAdmin
    .from("community_room_members")
    .select("room_id")
    .eq("user_id", user.id);
  const memberRoomIds = new Set((memberships || []).map((m) => m.room_id));

  const signed: Record<string, string | null> = {};

  for (const url of urls) {
    const path = resolveStoragePath("community-files", url);
    const [centerId, roomId] = path.split("/");
    const authorized =
      (isStaff && profile!.center_id === centerId) || memberRoomIds.has(roomId);
    signed[url] = authorized ? await getSignedStorageUrl("community-files", url, 3600) : null;
  }

  return NextResponse.json({ signed });
}
```

- [ ] **Step 2: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit` — clean. Si `community_room_members` n'a pas exactement les colonnes `room_id`/`user_id`, corriger selon le schéma réel observé dans `app/centre/communaute/page.tsx` (ligne ~447, `ensureMembership`).

- [ ] **Step 3: Commit**

```bash
git add app/api/communaute/signed-urls/route.ts
git commit -m "feat: resolution batch d'URLs signees pour la communaute"
```

---

### Task 7: Communauté (vue étudiant) — substituer les URLs signées

**Files:**
- Modify: `academie-langues/app/communaute/page.tsx`

**Interfaces:**
- Consumes: `POST /api/communaute/signed-urls` (Task 6).

- [ ] **Step 1: Lire le fichier pour localiser le chargement et le rendu des messages**

Read: `academie-langues/app/communaute/page.tsx`, chercher le pattern
`__img__:`/`__file__:` (parsing du contenu message) et l'endroit où les
messages sont chargés (fetch/subscribe).

- [ ] **Step 2: Ajouter la résolution des URLs signées après chargement des messages**

Après avoir chargé/reçu une liste de messages, extraire toutes les URLs
`community-files` présentes (regex sur `__img__:(.+)` et
`__file__:(.+?)::`), les envoyer en un seul `POST
/api/communaute/signed-urls` avec le token de session, et construire une
map `url -> signedUrl` utilisée au rendu (remplacer l'URL brute par la
signée dans le `<img src>`/lien de téléchargement ; si `signed[url]` est
`null`, ne pas afficher l'image/lien plutôt que de pointer vers une URL
cassée).

- [ ] **Step 3: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit` — clean.

- [ ] **Step 4: Commit**

```bash
git add app/communaute/page.tsx
git commit -m "fix: images/fichiers communaute affiches via URL signee (etudiant)"
```

---

### Task 8: Communauté (vue centre) — même correctif

**Files:**
- Modify: `academie-langues/app/centre/communaute/page.tsx`

**Interfaces:**
- Consumes: `POST /api/communaute/signed-urls` (Task 6).

- [ ] **Step 1: Appliquer le même correctif qu'à la Task 7**

Même mécanisme, adapté à la structure de ce fichier (déjà vu à la Task 6 :
c'est ici que `uploadFile`/`ensureMembership` sont définis, ligne
~435-470). Lire le fichier pour localiser précisément où les messages
sont chargés et rendus avant d'éditer.

- [ ] **Step 2: Vérifier**

Run: `cd academie-langues && npx tsc --noEmit` — clean.

- [ ] **Step 3: Commit**

```bash
git add app/centre/communaute/page.tsx
git commit -m "fix: images/fichiers communaute affiches via URL signee (centre)"
```

---

### Task 9: Bascule des 4 buckets en privé + policies RLS Storage scopées

**Files:**
- Create: `academie-langues/supabase-storage-buckets-private-2026-09-11.sql`

**Interfaces:**
- Ne produit ni ne consomme d'interface applicative — migration SQL pure,
  à exécuter manuellement dans le Supabase SQL Editor (aucun outil de ce
  plan n'a d'accès DB direct).

Contexte : policies actuelles observées sur ces buckets (voir spec) —
`"Public can read mission files"` (`{public}` sur `mission-files`, aucun
scoping), `"Voir les pdf de cours"`/`"Voir les videos de cours"`
(`{public}`, aucun scoping), `community_files_public_select` (`{anon}`,
aucun scoping). Toutes doivent être supprimées et remplacées.

- [ ] **Step 1: Écrire la migration**

`academie-langues/supabase-storage-buckets-private-2026-09-11.sql` :

```sql
-- A executer dans Supabase SQL Editor, APRES avoir merge et deploye le
-- code applicatif de ce plan (Tasks 1-8) -- sinon les fichiers deviennent
-- inaccessibles tant que les routes proxy ne sont pas en place.
--
-- Ferme la fuite confirmee empiriquement : mission-files, course-pdfs,
-- course-videos, community-files sont marques public=true, accessibles
-- sans authentification a quiconque connait/devine l'URL. Les policies
-- SELECT existantes sur ces buckets sont sans scoping ({public}/{anon}).

begin;

update storage.buckets
set public = false
where id in ('mission-files', 'course-pdfs', 'course-videos', 'community-files');

-- mission-files : lecture reservee aux membres authentifies du meme
-- centre (le premier segment du chemin est toujours center_id, voir
-- app/centre/cours/devoirs/page.tsx). Les routes proxy (service_role)
-- bypassent RLS et ne dependent pas de cette policy -- elle sert de
-- filet de securite si l'API Storage est appelee directement.
drop policy if exists "Public can read mission files" on storage.objects;
create policy "mission_files_select_scoped" on storage.objects
for select to authenticated
using (
  bucket_id = 'mission-files'
  and (storage.foldername(name))[1] = (select center_id::text from public.profiles where id = auth.uid())
);

-- course-pdfs / course-videos : aucun acces client direct legitime (tout
-- passe par /api/lesson-media/[id] en service_role) -- policies
-- supprimees, pas remplacees.
drop policy if exists "Voir les pdf de cours" on storage.objects;
drop policy if exists "Voir les videos de cours" on storage.objects;

-- community-files : lecture au moins aussi restrictive que l'ecriture
-- deja en place (community_files_insert) -- centre du profil OU
-- appartenance via center_users.
drop policy if exists "community_files_public_select" on storage.objects;
drop policy if exists "community_files_select" on storage.objects;
create policy "community_files_select_scoped" on storage.objects
for select to authenticated
using (
  bucket_id = 'community-files'
  and (
    (storage.foldername(name))[1] in (
      select center_id::text from public.profiles where id = auth.uid() and center_id is not null
    )
    or (storage.foldername(name))[1] in (
      select center_id::text from public.center_users where user_id = auth.uid()
    )
  )
);

commit;
```

- [ ] **Step 2: Documenter la vérification manuelle post-exécution**

(Ce step ne peut pas être exécuté par l'implémenteur — il n'a pas accès à
la base. Documenter dans le report ce que l'utilisateur doit vérifier
après avoir lui-même lancé le script :)

1. Une ancienne URL publique complète (`.../storage/v1/object/public/mission-files/...`)
   copiée depuis une pièce jointe existante doit retourner une erreur en accès direct (bucket privé).
2. Le même fichier reste téléchargeable via l'app (bouton pièce jointe → Task 4/5).
3. Un cours vidéo/PDF existant reste visible via `/document/[id]`.
4. Une image de communauté déjà postée reste visible dans le chat.

- [ ] **Step 3: Commit**

```bash
git add supabase-storage-buckets-private-2026-09-11.sql
git commit -m "docs: migration SQL bascule buckets prives (a executer manuellement)"
```

---

## Self-Review

- **Couverture spec** : helper (Task 1), course-media (Task 2), mission-files (Task 3-5), community-files (Task 6-8), bascule buckets + RLS (Task 9) — toutes les sections de la spec sont couvertes.
- **Placeholders** : aucun. Les Tasks 4/5/7/8 demandent explicitement de lire le fichier réel avant d'éditer (lignes exactes non garanties stables) plutôt que d'inventer un diff sur du texte non vérifié — c'est volontaire, pas un TODO déguisé.
- **Cohérence des types** : `getSignedStorageUrl(bucket, stored, expiresIn)` et `resolveStoragePath(bucket, stored)` (Task 1) réutilisés à l'identique dans les Tasks 2, 3, 6.
- **Ordre** : Task 9 (bascule bucket) est délibérément la dernière — exécuter le SQL avant que le code proxy soit en place casserait tout le contenu existant en production.
