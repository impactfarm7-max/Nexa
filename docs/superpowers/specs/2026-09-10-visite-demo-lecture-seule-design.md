# Visite démo en lecture seule — design

Date: 2026-09-10
Statut: validé par l'utilisateur en chat, en attente de revue du fichier.

## Contexte

Le site marketing (`academie-langues/app/page.tsx`) n'a aucun moyen pour un
visiteur anonyme d'explorer un vrai dashboard (centre ou étudiant) sans créer
de compte. Objectif : un bouton « Visiter » qui laisse choisir un type de
centre (Libre / TCF Canada) puis un rôle (Centre / Étudiant), connecte le
visiteur à un vrai compte démo correspondant, et garantit qu'aucune écriture
n'est possible pendant la visite — sur l'ensemble de l'app, pas juste la page
d'entrée.

## Hors scope

- Garantie d'écriture bloquée au niveau RLS/Postgres (chantier séparé, gros
  volume de policies à auditer). Ce design s'appuie sur un blocage centralisé
  côté middleware Next.js + client Supabase partagé, suffisant pour l'usage
  normal de l'UI.
- Contenu réel des 4 comptes démo (nombre d'étudiants, notes, montants...) :
  le script de seed pose une structure minimale plausible ; le contenu fin
  peut être enrichi après coup sans changer l'architecture.

## Architecture

### 1. Comptes démo

Deux centres réels, un manager + un étudiant chacun (4 profils au total) :

- **Centre Libre Démo** (`center_type` hors `tcf_canada`) — manager +
  étudiant.
- **Centre TCF Démo** (`center_type = 'tcf_canada'`) — manager + étudiant.

Nouvelle colonne `profiles.is_demo_account boolean not null default false`.
Les 4 profils démo ont `is_demo_account = true`, `pin_hash` pré-rempli (ou
contourné comme le fait déjà `/view-as/enter` avec `is_unlocked`), et des
données minimales réalistes (filière(s), 2-3 étudiants supplémentaires visibles
dans les listes, un paiement, un créneau de planning) insérées par un script
de seed (SQL idempotent, exécutable plusieurs fois sans dupliquer).

### 2. Entrée publique

- Bouton **Visiter** dans le header de `app/page.tsx` (à côté des CTA
  existants), ouvre `VisitModal` (nouveau composant `app/components/landing/VisitModal.tsx`).
- Étape 1 : Centre Libre / Centre TCF. Étape 2 : Centre / Étudiant.
- Sélection → `POST /api/demo/enter` (nouvelle route publique, pas
  d'authentification requise) avec `{ centerKind: "libre" | "tcf", viewAs: "center" | "student" }`.
  - Route résout le profil démo correspondant : jointure `profiles` (
    `is_demo_account = true`, `role = 'center_manager'` si `viewAs = "center"`
    sinon `role = 'student'`) → `centers` (`center_type = 'tcf_canada'` si
    `centerKind = "tcf"` sinon `center_type` différent de `tcf_canada`) sur
    `profiles.center_id = centers.id`. Le seed garantit exactement un profil
    par combinaison (contrainte logique, pas de contrainte SQL dédiée — si
    plusieurs matchent, prend le plus récent). Génère un magic-link
    via `supabaseAdmin.auth.admin.generateLink` (même mécanisme que
    `app/api/superadmin/centers/[id]/view-as/route.ts`), retourne
    `token_hash`.
  - Rate-limiting réutilisant `fixed-window-rate-limit` (déjà utilisé par
    `/api/pin/verify`) pour éviter le spam de cette route publique.
- Nouvelle page `app/visite/enter/page.tsx` (variante de
  `app/view-as/enter/page.tsx`, sans session à restaurer au retour) : consomme
  le `token_hash` via `supabase.auth.verifyOtp`, force
  `sessionStorage.setItem("is_unlocked", "true")`, écrit un flag
  `nexa_visit_mode` (nouvel util `app/utils/visit-mode.ts`, même forme que
  `sa-view-as.ts`), redirige vers `/centre/dashboard` ou `/dashboard` selon le
  rôle.

### 3. Garantie lecture seule (le cœur du design)

Deux couches, toutes deux déclenchées par **qui est connecté** (le profil
`is_demo_account`), pas par un flag client contournable :

- **`academie-langues/app/middleware.ts`** (intercepte déjà tout `/api/*`) :
  après résolution de `user`, si la méthode n'est pas
  `GET`/`HEAD`/`OPTIONS`, lookup léger `profiles.is_demo_account` pour
  `user.id` ; si `true`, réponse `403 { error: "Lecture seule (mode visite)." }`
  avant d'atteindre la route. Couvre toutes les routes API existantes
  (centre + étudiant) sans les modifier une par une.
- **`app/utils/supabase.ts`** (client partagé, importé partout) : wrapper
  léger autour du client qui, si `nexa_visit_mode` est actif en
  sessionStorage, intercepte `.insert/.update/.delete/.upsert()` sur
  `from()` et retourne immédiatement `{ data: null, error: { message: "Lecture seule (mode visite)." } }`
  sans requête réseau. Confort UX (pas d'attente/flicker avant le 403
  serveur) ; le middleware reste la garantie réelle.

### 4. Bandeau + sortie

`app/components/VisitModeBanner.tsx` (calque de `SaViewAsBanner.tsx`) :
bandeau persistant « Vous visitez [Centre Libre/TCF] en tant que
[Centre/Étudiant] — lecture seule », bouton **Quitter** → `supabase.auth.signOut()`
+ `sessionStorage.clear()` du flag + `router.replace("/")`.

## Erreurs & cas limites

- Compte démo introuvable (seed pas encore exécuté) → `/api/demo/enter`
  retourne 404, modal affiche un message d'erreur au lieu de rediriger.
- Visiteur qui recharge la page en plein milieu du dashboard : le flag
  `nexa_visit_mode` (sessionStorage) est reconstruit au chargement en lisant
  `profiles.is_demo_account` du profil courant (pas seulement à l'entrée),
  pour que le bandeau/word blocage restent actifs même après un refresh.
- Écriture tentée via une route API non couverte par un cas prévu (ex.
  upload de fichier) : le check middleware s'applique à toute méthode non-GET
  sur `/api/*`, donc couvert par construction.

## Tests

- Script de seed exécuté deux fois de suite ne doit pas dupliquer les 4
  comptes (upsert par email).
- `POST /api/demo/enter` pour chacune des 4 combinaisons retourne un
  `token_hash` valide.
- Middleware : requête `PATCH /api/etudiants` avec le token d'un compte démo
  → 403. Même requête en `GET` → passe.
- Client Supabase : `.update()` en mode visite ne part jamais en réseau
  (vérifiable via mock/spy en test, ou en observant l'absence de requête
  réseau en usage manuel).
