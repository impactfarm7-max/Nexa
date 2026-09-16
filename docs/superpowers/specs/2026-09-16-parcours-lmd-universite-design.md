# Parcours LMD pour les centres université

Date: 2026-09-16
Statut: validé en brainstorming, en attente de revue finale avant plan d'implémentation

## Contexte

Aujourd'hui, un centre de type `universite` se comporte comme un simple clone
comportemental de `generic` (`app/data/center-types.ts`) : mêmes règles
d'offre, de normalisation et d'expérience étudiante, aucune spécialisation
académique. Une filière `cursus` y a des `niveaux` numérotés par année
(1, 2, 3...), chaque niveau ayant ses `groupes` (classes) et ses
`filiere_matieres` (matières/UE avec coefficient + barème), sans notion de
semestre ni de crédit ECTS.

Le centre veut un vrai parcours LMD (Licence-Master-Doctorat) pour les
centres université : filière → niveau (L1 à M2) → semestre → UE, avec
crédits ECTS, validation UE par UE (sans compensation) et session de
rattrapage.

## Périmètre

- **Uniquement les centres de type `universite`.** École / entreprise /
  libre / TCF gardent le modèle actuel (niveau = année, sans semestre ni
  crédit).
- **Uniquement les nouvelles filières université**, créées après ce
  chantier. Les filières université déjà existantes ne sont pas migrées et
  continuent de fonctionner exactement comme avant (aucun risque sur les
  données déjà en place — étudiants inscrits, notes, paiements).
- Le tarif de scolarité reste au niveau de granularité **niveau** (un seul
  montant pour l'année, couvrant tous ses semestres) — aucun changement au
  module Finance.
- La promotion d'un niveau à l'autre (admis / redouble / ajourné) **réutilise
  le mécanisme générique déjà existant** sur `enrollments`
  (`passage_decision`, `previous_enrollment_id`, cf. `app/utils/cursus-passage.ts`)
  — ce n'est pas une nouveauté de ce chantier, seulement une vérification
  qu'il continue de fonctionner correctement au niveau (pas au semestre).
- Le matricule étudiant est déjà attaché au profil (`profiles.matricule`),
  pas à l'inscription — il est donc déjà stable d'une inscription à l'autre
  (réinscription en niveau supérieur, inscription tardive au milieu du
  parcours). Aucun changement nécessaire ici.
- Un étudiant peut être inscrit à **n'importe quel semestre** dès la
  création de son inscription (transfert, inscription tardive) — le
  sélecteur de semestre ne doit jamais forcer un point de départ à S1.

### Explicitement hors périmètre (ce chantier)

- Passage/promotion **automatique** (décidée par le système plutôt que
  cliquée par le manager) basée sur les crédits.
- Report de "dette" d'une UE non validée vers le semestre suivant.
- Compensation entre UE (le centre a choisi la validation UE par UE, sans
  moyenne générale qui "sauve" une UE faible).
- Migration des filières université déjà existantes vers la structure LMD.

## Section 1 — Structure Niveau → Semestre → Classe

Niveau (L1 à M2) est une entité réelle qui contient plusieurs semestres —
**le nombre de semestres par niveau est personnalisable**, pas figé à 2.
Les classes et les UE se rattachent au semestre, pas directement au niveau.

```
FILIÈRE (Licence Informatique)
  └─ NIVEAU L1
       ├─ Semestre 1
       │    └─ Classe A, Classe B...
       │         ├─ UE : Mathématiques 1 (6 crédits)
       │         └─ UE : Algorithmique 1 (5 crédits)
       └─ Semestre 2
            └─ Classe A, Classe B...
                 ├─ UE : Mathématiques 2 (6 crédits)
                 └─ UE : Algorithmique 2 (5 crédits)
  └─ NIVEAU L2
       ├─ Semestre 3
       └─ Semestre 4
  └─ NIVEAU L3 ... M1 ... M2
```

### Modèle de données

Nouvelle table `semestres` :

```sql
create table public.semestres (
  id uuid primary key default gen_random_uuid(),
  niveau_id uuid not null references public.niveaux(id) on delete cascade,
  ordre integer not null,              -- ordre d'affichage au sein du niveau (1, 2, 3...)
  nom text,                            -- optionnel, ex. "Semestre 1" ; sinon libellé "Semestre {ordre}" calculé
  credits_cible integer,               -- quota cible (suggestion 30), comparé à la somme des crédits UE — voir Section 2
  created_at timestamptz not null default now()
);
create index semestres_niveau_id_idx on public.semestres(niveau_id);
alter table public.semestres enable row level security;
```

RLS : suit le même modèle que `niveaux`/`groupes` (lecture pour le staff du
centre propriétaire de la filière, écriture pour manager/staff avec
permission `filieres`). Réutiliser exactement les policies déjà en place
sur `niveaux` en les adaptant (jointure `niveaux → filieres → center_id`
devient `semestres → niveaux → filieres → center_id`).

Colonnes ajoutées (toutes nullables — n'affectent que les filières LMD) :

- `groupes.semestre_id uuid references public.semestres(id) on delete cascade`
  — une classe se rattache à un semestre pour les filières LMD ; `niveau_id`
  reste utilisé tel quel pour les filières non-LMD.
- `filiere_matieres.semestre_id uuid references public.semestres(id) on delete cascade`
  — une UE se rattache à un semestre pour les filières LMD ; `niveau_id`
  reste utilisé tel quel pour les filières non-LMD.
  - Note : `filiere_matieres.semestre` (colonne `integer` déjà existante,
    inutilisée — 0 ligne sur 144 en production, aucune référence dans le
    code) reste en l'état, non réutilisée, hors périmètre de nettoyage pour
    ce chantier.
- `enrollments.semestre_id uuid references public.semestres(id) on delete set null`
  — le semestre courant de l'étudiant pour les filières LMD ; `niveau_id`
  reste renseigné en parallèle (dérivé du semestre choisi) pour rester
  compatible avec tout ce qui interroge déjà `enrollments.niveau_id`
  (finance, rapports, passage).

### Comment une filière devient "LMD"

Pas de nouveau champ `filieres.pedagogic_model`. Une filière `cursus` est en
mode LMD si et seulement si :
1. le centre propriétaire est de type `universite` (`centers.center_type`),
   ET
2. elle a été créée via le nouveau parcours de création LMD (donc ses
   niveaux ont des semestres — `exists(select 1 from semestres where niveau_id = niveaux.id)`).

Ce test (présence de semestres) sert de signal partout dans le code pour
choisir l'affichage/la logique LMD plutôt que l'ancien modèle niveau=année,
sans nouveau flag à synchroniser.

## Section 2 — UE, crédits, validation, rattrapage

### UE = matière + crédits

L'UE réutilise `filiere_matieres` (déjà branché sur Carnet de notes,
Planning). Un seul champ ajouté :

```sql
alter table public.filiere_matieres add column credits integer;
```

Nullable, uniquement renseigné pour les UE de filières LMD. Le coefficient
et le barème (`max_score`) existants restent utilisés pour le calcul de la
moyenne de l'UE — les crédits sont un mécanisme séparé pour la validation,
pas un remplacement du coefficient.

### Quota de crédits par semestre (indicatif, non bloquant)

`semestres.credits_cible` : nombre suggéré à la création du semestre
(pré-rempli à 30, modifiable — convention LMD standard, pas imposée en dur).
L'écran de gestion des UE d'un semestre affiche en continu
`somme(UE.credits) / credits_cible` (ex. "27 / 30 crédits") comme simple
indicateur visuel si ça ne tombe pas juste. Jamais bloquant : le centre peut
enregistrer des UE dont la somme ne correspond pas au quota.

### Seuil de validation d'une UE (par centre)

```sql
alter table public.centers add column lmd_validation_threshold_pct integer;
```

Nullable ; `null` = 50 (défaut) appliqué côté code
(`resolveLmdValidationThreshold(raw) => raw ?? 50`), pas de valeur en dur
répétée partout. Exposé dans Paramètres du centre, uniquement pour les
centres `universite` (section visible seulement si `center_type === "universite"`,
même pattern que la section matricule ajoutée précédemment dans
`app/centre/parametres/entreprise/page.tsx`).

### Calcul de la note finale et de la validation d'une UE

Pour un étudiant, une UE, un semestre donné :

1. Moyenne "normale" = moyenne pondérée des notes de titre autre que
   `"Rattrapage"` sur le barème de l'UE (réutilise
   `averageGradesOnScale` de `app/utils/gradesCalc.ts`, déjà utilisé par
   `computeMoyenneGenerale`).
2. Normaliser sur 100 : `moyenne_pct = (moyenne_normale / max_score) * 100`.
3. Si `moyenne_pct >= seuil` → UE validée, crédits acquis, note finale
   affichée = moyenne normale.
4. Sinon, chercher une note de titre exactement `"Rattrapage"` pour cette
   UE/cet étudiant :
   - Si elle existe et `(note_rattrapage / max_score) * 100 >= seuil` → UE
     validée avec cette note (remplace l'affichage), crédits acquis.
   - Sinon (pas de rattrapage, ou rattrapage aussi insuffisant) → UE non
     validée, note affichée = la moyenne normale (échouée), crédits non
     acquis.

Aucune moyenne pondérée entre UE n'intervient dans la validation
(pas de compensation, conformément au choix du centre) — c'est un calcul
strictement UE par UE.

### Où saisir le rattrapage

Réutilise le mécanisme de colonnes de notes supplémentaires déjà présent
dans le Carnet de notes (`suplColumns`, bouton "Ajouter note supl.",
`app/centre/examens/notes/page.tsx`). Une colonne dont le titre est
exactement `"Rattrapage"` (comparaison insensible à la casse/espaces, via
une nouvelle fonction `isRattrapageGrade(title)` à côté de la fonction
`isPrincipalGrade` déjà existante dans ce fichier) est automatiquement
reconnue par le calcul de validation ci-dessus. Aucun nouvel écran, aucune
nouvelle table de notes.

### Résumé crédits par étudiant

Nouvelle fonction pure `computeCreditsStatus()` dans
`app/utils/lmd-credits.ts` (nouveau fichier, miroir de
`cursus-passage.ts`) :

```ts
type UeCredit = { filiere_matiere_id: string; credits: number };
type UeGradeRow = { filiere_matiere_id: string; score: number; max_score: number; title: string | null };

function computeCreditsStatus(
  ues: UeCredit[],
  grades: UeGradeRow[],
  thresholdPct: number,
): {
  totalCredits: number;
  acquiredCredits: number;
  validatedUeIds: string[];
  pendingUeIds: string[]; // non validées : ni normale ni rattrapage suffisants
};
```

Consommée par : Carnet de notes (badge par UE), bulletin/relevé, profil
étudiant, liste étudiants (résumé "87/120 crédits").

## Section 3 — Écrans touchés

- **Programmes** (`app/centre/filieres/nouveau/page.tsx`) : pour un centre
  `universite` créant une filière `cursus`, le sélecteur "nombre de
  niveaux" devient un constructeur Niveau (L1..M2, nombre de niveaux
  toujours configurable comme aujourd'hui) → nombre de semestres par niveau
  (pré-rempli à 2, modifiable) → UE par semestre (nom + coefficient +
  barème existants + nouveau champ crédits). Classes créées par semestre au
  lieu de par niveau.
- **Carnet de notes** (`app/centre/examens/notes/page.tsx`) : la
  granularité de saisie devient le semestre (remplace niveau/année pour les
  filières LMD). Badge crédits + statut validé/non-validé par UE dans la
  grille. Reconnaissance de la colonne "Rattrapage" (Section 2).
- **Bulletin / relevé de notes** (`app/components/BulletinDynamique.tsx`) :
  UE + crédits + statut validé/non-validé par semestre, total crédits
  acquis en bas de bulletin.
- **Profil étudiant / liste étudiants** (`app/profil/CenterStudentProfil.tsx`,
  `app/centre/etudiants/page.tsx`) : résumé crédits acquis / total.
- **Paramètres centre** (`app/centre/parametres/entreprise/page.tsx`) :
  section "Seuil de validation LMD", visible uniquement `center_type === "universite"`.
- **Inscription étudiant** (`CreateStudentModal.tsx`) : le sélecteur niveau
  devient niveau → semestre → classe pour les filières LMD (au lieu de
  niveau → classe). Aucun semestre de départ forcé.
- **Finance** : inchangé (tarif au niveau, confirmé Section « Périmètre »).

## Auto-review

- Placeholders : aucun "TBD" — tous les seuils/quotas ont une valeur par
  défaut explicite (50 %, 30 crédits) et un mécanisme de configuration.
- Cohérence interne : le test "filière LMD ⟺ ses niveaux ont des
  semestres" (Section 1) est utilisé de façon cohérente dans toutes les
  sections suivantes (pas de flag concurrent introduit ailleurs).
- Portée : un seul chantier cohérent (structure + crédits + validation +
  rattrapage sont interdépendants, non séparables en sous-projets
  indépendants) — mais volumineux ; le plan d'implémentation (prochaine
  étape) devra le découper en tâches séquencées par dépendance (migration
  SQL → helpers purs → Programmes → Carnet de notes → bulletin/profil →
  Paramètres → inscription).
- Ambiguïté : la comparaison "quota vs somme des crédits" (Section 2) est
  précisée comme purement indicative, jamais bloquante, pour éviter toute
  lecture comme validation dure.
