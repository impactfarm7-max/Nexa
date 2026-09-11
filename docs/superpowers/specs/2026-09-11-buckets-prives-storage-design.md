# Fermeture des buckets Storage publics — design

Date : 2026-09-11
Contexte : suite à l'audit sécurité (point 1), confirmé empiriquement que
`mission-files`, `course-pdfs`, `course-videos`, `community-files` sont
marqués `public: true` côté Supabase Storage — n'importe qui avec l'URL
exacte (UUID dans le chemin) accède au fichier sans authentification, les
policies RLS Storage existantes ne s'appliquant pas aux buckets publics.

`avatars`, `certificates`, `center-logos`, `room-photos`, `support-attachments`
restent volontairement publics (avatars/logos/photos affichés partout sans
contexte d'auth ; certificats vérifiables publiquement par design via
`/certificat/[code]`) — hors scope de ce chantier.

## Contrainte structurante

Les URLs publiques de ces 4 buckets sont **stockées en dur** dans des
colonnes DB au moment de l'upload (`lesson_media.url`, `missions
.attachment_url`, et directement dans le texte de
`community_messages.message` sous la forme `__img__:<url>` /
`__file__:<url>::<name>`). Passer le bucket en privé sans rien d'autre
casse tout le contenu déjà uploadé (les URLs deviennent 403).

**Décision** : ne pas migrer les lignes existantes. À la place, un helper
partagé extrait le chemin objet (bucket-relative) depuis une valeur stockée,
qu'elle soit une ancienne URL publique complète (`.../storage/v1/object/
public/<bucket>/<path>`) ou un futur chemin nu — puis génère une URL signée
à la demande. Aucune donnée existante n'a besoin d'être réécrite.

## Découverte importante : course-pdfs/course-videos sont déjà proxifiés

`app/api/lesson-media/[id]/route.ts` + `app/document/[id]/page.tsx`
existent déjà et streament le fichier au client après vérification
d'autorisation (centre du cours), sans jamais exposer l'URL Storage brute.
Le seul autre point d'accès (`gestion-cours/page.tsx`) pointe déjà vers
`/document/${m.id}`, jamais vers l'URL Storage directe (sauf `video_link`,
qui n'est pas un objet Storage). **Une seule ligne à changer** dans
`lesson-media/[id]/route.ts` : remplacer le `fetch(media.url)` par un fetch
sur une URL signée générée depuis le chemin résolu.

`mission-files` et `community-files` n'ont pas d'équivalent : l'URL brute
est directement dans le DOM (`<a href={attachment_url}>`,
`<img src={url}>`). À construire.

## Architecture

### 1. Helper partagé : résolution de chemin + signature

`app/utils/storage-signed-url.server.ts` (nouveau, server-only) :
- `resolveStoragePath(bucket: string, stored: string): string` — si `stored`
  contient `/storage/v1/object/public/<bucket>/`, retourne la partie après ;
  sinon retourne `stored` tel quel (déjà un chemin).
- `getSignedStorageUrl(bucket: string, stored: string, expiresIn = 60):
  Promise<string | null>` — résout le chemin puis appelle
  `supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn)`,
  retourne `null` si échec (fichier supprimé, etc.).

### 2. course-pdfs / course-videos

Modifie `app/api/lesson-media/[id]/route.ts` : remplace
`const upstream = await fetch(media.url);` par une résolution via
`getSignedStorageUrl(bucketFromType(media.type), media.url, 60)` puis
`fetch(signedUrl)`. Le reste du fichier (autorisation, streaming,
Content-Disposition) est inchangé — c'était déjà correct.

### 3. mission-files

- Nouvelle route `app/api/missions/attachment/route.ts` (GET,
  `?missionId=<id>`) : authentifie via `getAuthUser`, charge la mission
  (`missions` table), vérifie que l'appelant est soit staff du
  `center_id` de la mission, soit un des destinataires (élève ciblé ou
  membre du `groupe_id`/`filiere` ciblée — même logique d'autorisation que
  la lecture de la mission elle-même, à réutiliser si un helper existe déjà
  dans `app/api/missions/`). Résout `attachment_url` en URL signée
  (`getSignedStorageUrl("mission-files", ...)`), fetch et streame le
  fichier avec le bon `Content-Type`/`Content-Disposition`, comme
  `lesson-media/[id]`.
- `app/centre/cours/devoirs/page.tsx` (ligne ~896) et
  `app/tcf-canada/missions/page.tsx` : remplacent le `<a href=
  {d.attachment_url}>` par un bouton dont l'`onClick` fait
  `fetch("/api/missions/attachment?missionId=" + d.id, { headers: {
  Authorization: "Bearer " + token } })`, récupère le blob, et
  `window.open(URL.createObjectURL(blob))` — même pattern que
  `app/document/[id]/page.tsx`.
- L'upload (`devoirs/page.tsx` ligne ~409) continue de stocker
  `urlData.publicUrl` dans `attachment_url` (pas de changement de schéma :
  le helper de résolution gère indifféremment URL complète ou future valeur
  simplifiée) — cohérent avec la décision de non-migration.

### 4. community-files

- Nouvelle route `app/api/communaute/signed-urls/route.ts` (POST, body
  `{ urls: string[] }`) : authentifie l'appelant, pour chaque URL extrait
  `centerId`/`roomId` du chemin (`${centerId}/${roomId}/...`), vérifie
  l'appartenance au salon (`community_room_members`, ou center staff),
  retourne un dictionnaire `{ [url]: signedUrl | null }` (URLs non
  autorisées ou invalides → `null`, filtré côté client). Expiration 1h
  (suffisant pour une session de lecture du chat ; régénéré à chaque
  chargement des messages).
- `app/communaute/page.tsx` et `app/centre/communaute/page.tsx` : après
  avoir chargé les messages, extraient les URLs `__img__:`/`__file__:`,
  appellent la route en batch, et substituent les URLs signées avant rendu
  (`<img src={signedUrl}>` / lien de téléchargement).
- L'upload (ligne ~456) continue de stocker l'URL publique complète dans le
  texte du message — même raisonnement que mission-files, pas de migration
  de données nécessaire.

### 5. Bascule des buckets + policies Storage

Nouveau fichier SQL `supabase-storage-buckets-private-2026-09-11.sql` :
- `update storage.buckets set public = false where id in ('mission-files',
  'course-pdfs', 'course-videos', 'community-files');`
- Remplace les policies SELECT actuellement `{public}`/`{anon}` sans
  scoping sur ces 4 buckets par des policies scopées :
  - `mission-files` : `authenticated`, autorisé si
    `(storage.foldername(name))[1] = current_profile_center_id()::text`
    (même pattern que `center-documents authenticated read`, le premier
    segment du chemin est déjà `${centerId}`).
  - `community-files` : `authenticated`, réutilise la condition déjà
    présente sur `community_files_insert` (centre du profil OU
    `center_users`) — la lecture doit être au moins aussi restrictive que
    l'écriture actuelle.
  - `course-pdfs`/`course-videos` : accès exclusivement via
    `service_role` (le proxy `lesson-media` utilise `supabaseAdmin`) —
    aucune policy `authenticated`/`anon`, cohérent avec le fait que
    `createSignedUrl` appelé côté serveur avec `supabaseAdmin` n'a pas
    besoin de policy RLS (service_role bypass).
  Ces nouvelles policies RLS sont une deuxième ligne de défense : même
  si un signed-URL fuit, il expire ; même si quelqu'un appelle l'API
  Storage directement avec son propre JWT (en contournant nos routes),
  RLS scope désormais correctement l'accès.

## Hors scope

- Migration des URLs déjà stockées en base vers de simples chemins
  (non nécessaire grâce au helper de résolution).
- `avatars`, `certificates`, `center-logos`, `room-photos`,
  `support-attachments` : restent publics, design intentionnel.
- Rotation/révocation des URLs signées déjà émises (elles expirent
  naturellement, pas de mécanisme de révocation anticipée).

## Tests

- Après bascule : une URL Storage publique existante (`.../object/public/
  mission-files/...`) doit retourner 400/403 en accès direct (bucket
  devenu privé).
- Un document de cours, un fichier de devoir, une image de communauté
  déjà uploadés AVANT la bascule doivent rester consultables via les
  routes proxifiées (preuve que la non-migration fonctionne).
- Un étudiant du centre A ne doit pas pouvoir récupérer une URL signée
  pour un fichier du centre B via les nouvelles routes (403).
- Test manuel : upload d'un nouveau fichier dans chacun des 3 flux
  (devoir, cours, message communauté), vérifier qu'il reste visible par
  les utilisateurs autorisés après la bascule.
