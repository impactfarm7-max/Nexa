# Nouveaux types de centre : École, Université, Entreprise — design

Date : 2026-09-11

## Contexte

NEXA distingue aujourd'hui deux types de centre via la colonne
`centers.center_type` : `"tcf_canada"` (Centre TCF) et `"generic"`
(Centre Libre). Toute la logique métier (quotas, mode étudiant, shell
staff) passe par une fonction centrale, `normalizeCenterType()`
(`app/data/center-types.ts`), qui traite **toute valeur autre que
`"tcf_canada"` comme `"generic"`**.

Objectif : ajouter École, Université et Entreprise comme nouveaux
types de centre sélectionnables à l'inscription, avec un comportement
**strictement identique à Centre Libre pour l'instant** ("on ajustera
plus tard"). L'utilisateur a explicitement anticipé que ces types
auront des fonctionnalités différentes, potentiellement opposées, dans
le futur.

## Principe directeur : pas de duplication de code

Centre TCF et Centre Libre ne sont pas deux bases de code séparées —
un seul jeu de pages/routes, qui branche sur `center_type` à quelques
points précis (`CenterSidebar`, `resolveStudentExperienceMode`, etc.).
École/Université/Entreprise suivent le même principe : ils démarrent
identiques à Centre Libre parce que `normalizeCenterType()` les
traite comme `"generic"`, sans dupliquer un seul fichier de pages.
Toute divergence future se fait en ajoutant un `case` dans
`center-types.ts` et dans les quelques fonctions qui en dépendent —
jamais en forkant un dossier de pages par type. C'est la contrainte
structurante de ce design : elle garantit qu'ajouter un 3e, 4e, 5e
type de centre reste un coût constant, pas un coût qui grossit avec
chaque type.

## Architecture

### 1. `app/data/center-types.ts` — modèle central

```ts
export const CENTER_TYPES = [
  "tcf_canada", "generic", "ecole", "universite", "entreprise",
] as const;
```

- `normalizeCenterType()` : **inchangé**. Continue de renvoyer
  `"generic"` pour toute valeur autre que `"tcf_canada"` — c'est ce
  qui donne le clone comportemental gratuit.
- `centerTypeLabel(centerType, locale)` : étendu avec un `switch` sur
  la valeur **brute** (pas normalisée) pour renvoyer le bon libellé :
  - `"ecole"` → "École" / "School"
  - `"universite"` → "Université" / "University"
  - `"entreprise"` → "Entreprise" / "Company"
  - défaut (`"generic"` et valeurs inconnues) : libellé actuel
    inchangé ("Centre de formation libre" / "Independent training
    center").
  - `"tcf_canada"` : inchangé.

Aucune migration SQL : `center_type` est une colonne texte libre sans
contrainte `CHECK` en base (confirmé par grep sur les fichiers
`supabase-*.sql` du repo) — les nouvelles valeurs s'écrivent
directement, aucune modification de schéma requise.

### 2. Correctif des chemins d'écriture

Note (trouvé pendant la rédaction du plan d'implémentation) : il existe
en réalité **4** endroits qui créent un centre, pas 3 — un 4e sélecteur
binaire existe dans `app/superadmin/_components/CreateCenterModal.tsx`
(création de centre depuis le superadmin, poste vers la même route
`/api/centre/creer`). Il est traité au même titre que les 3 autres dans
le plan d'implémentation.

**Bug existant, bloquant pour cette feature** : deux routes
collapsent la sélection utilisateur vers `"generic"`/`"tcf_canada"`
*avant* l'insertion en base, via `normalizeCenterType(centerType)`
appliqué directement au champ stocké. Résultat : même si le frontend
envoyait `"universite"`, la valeur stockée serait `"generic"` — les
nouveaux types ne persisteraient jamais correctement sans ce
correctif.

- **`app/api/centre/creer/route.ts`** (inscription principale) :
  - Valider `centerType` reçu contre `CENTER_TYPES` (400 si invalide).
  - Stocker la valeur brute validée dans `center_type` (pas la
    normalisée).
  - Garder `normalizeCenterType(type)` **uniquement** pour la
    branche offre : `type === "tcf_canada" ? plan_type : nexa_offer`
    — cette logique reste binaire (TCF vs tout le reste) et est
    correcte telle quelle pour les 3 nouveaux types (ils suivent le
    modèle d'offre Centre Libre, `nexa_offer`).

- **`app/api/center/create/route.ts`** (création de filiale/branche
  depuis `CenterSidebar`) : même correctif — valider contre
  `CENTER_TYPES`, stocker la valeur brute.

### 3. `CenterSidebar.tsx` — sélecteur "créer une filiale" (~ligne 784-823)

Actuellement : état `centerType` initialisé à `"generic"` (string
brute, pas typée `CenterTypeCode`), dropdown codé en dur avec 2
options et libellés français en dur (`"Centre libre"` / `"Centre TCF
Canada"`), hors du système i18n/`centerTypeLabel`.

Correctif :
- Étendre le tableau d'options du dropdown aux 5 valeurs de
  `CENTER_TYPES`, libellé via `centerTypeLabel(value, locale)` au
  lieu du texte en dur.
- Le texte de confirmation ("Créer X à Y comme...") utilise aussi
  `centerTypeLabel()` au lieu du ternaire `tcf_canada ? ... : ...`
  en dur.
- Typer l'état `centerType` en `CenterTypeCode` (actuellement `string`
  nu à cet endroit précis, ligne 784).

### 4. `/ouvrir-centre` — page d'inscription

`PROGRAMS` a aujourd'hui 2 entrées : `"native"` (ouvre une sous-carte
de sélection TCF Canada) et `"generic"` (sélection directe, une
carte). La carte unique `"generic"` est remplacée par **4 cartes au
même niveau** que `"native"` — Formation libre, École, Université,
Entreprise — chacune sélectionnant directement son `centerType`
(`"generic"`/`"ecole"`/`"universite"`/`"entreprise"`), exactement
comme le fait la carte `"generic"` actuelle. Pas de sous-carte : ce
sont des choix de même niveau que la fiche TCF Canada, pas une
variante de "Formation libre".

Nouvelles clés i18n (FR + EN), texte marketing distinct par type
(rédigé par Claude, à valider/ajuster par l'utilisateur après
implémentation) :
- `ouvrirCentreProgramEcoleTitle/Subtitle/Blurb/Point1-3`
- `ouvrirCentreProgramUniversiteTitle/Subtitle/Blurb/Point1-3`
- `ouvrirCentreProgramEntrepriseTitle/Subtitle/Blurb/Point1-3`

Icônes (lucide-react, à choisir parmi celles déjà importées dans le
fichier ou à ajouter) : École → `School` ou équivalent, Université →
`GraduationCap` (déjà utilisé pour "generic" — le réattribuer à
Université et choisir une autre icône pour Formation libre pour
éviter la collision visuelle), Entreprise → `Building2` (déjà
importé, actuellement utilisé pour le logo NEXA en haut de page —
vérifier qu'il n'y a pas de conflit, sinon `Briefcase`).

### 5. Superadmin — `app/superadmin/centres/page.tsx`

Le filtre actuel est un dropdown binaire (`tcf` / `native` = "tout ce
qui n'est pas tcf"). Étendu à un filtre détaillé sur les 5 valeurs de
`CENTER_TYPES`, libellés via `centerTypeLabel()`. La logique de
filtrage `c.center_type !== value` remplace les deux comparaisons
actuelles (`typeFilter === "tcf"` / `"native"`).

Les badges/fiches détail (`CenterDetailPanel`, liste des centres)
utilisent déjà `centerTypeLabel()` indirectement ou une comparaison
`isTcf` — pas de changement nécessaire au-delà de la mise à jour de
`centerTypeLabel()` elle-même (section 1) : le bon libellé s'affiche
automatiquement partout où la fonction est déjà appelée.

## Hors scope

- Toute divergence de comportement réelle entre École/Université/
  Entreprise/Centre Libre (quotas différents, UI différente,
  fonctionnement opposé mentionné par l'utilisateur) — prévue pour un
  futur chantier séparé, une fois le besoin précis connu.
- Migration des centres `"generic"` existants vers un des 3 nouveaux
  types — aucun centre existant n'est retype.
- Changement du modèle d'offre/tarification (`nexa_offer`) — les 3
  nouveaux types suivent le même modèle que Centre Libre.

## Tests

- `npx tsc --noEmit` clean.
- Nouveau fichier de test unitaire (mirroring le pattern existant
  `app/utils/visit-mode.test.mjs`) pour `center-types.ts` :
  `normalizeCenterType()` renvoie `"generic"` pour les 3 nouvelles
  valeurs ; `centerTypeLabel()` renvoie le bon libellé FR/EN pour
  chacune ; `CENTER_TYPES` contient bien les 5 valeurs.
- Vérification manuelle (Playwright ou navigateur) : parcours complet
  `/ouvrir-centre` pour chacun des 3 nouveaux types → centre créé
  avec le bon `center_type` en base (pas `"generic"`) → dashboard
  centre identique à un Centre Libre existant → libellé correct dans
  superadmin (liste + filtre + fiche détail).
- Vérification que la création de filiale depuis `CenterSidebar`
  propose et applique correctement les 5 types.
