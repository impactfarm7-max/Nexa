# Matricule étudiant — design

Date : 2026-09-14

## Contexte

Chaque étudiant doit avoir un matricule unique, visible partout (profil,
liste, recherche, bulletins, certificats). Le centre choisit une fois,
dans ses paramètres, s'il utilise le format NEXA par défaut ou définit
son propre préfixe — décision qui ne nécessite plus d'y retoucher
ensuite. Certains centres migrent depuis un système existant avec leurs
propres matricules : l'import CSV en masse doit pouvoir les reprendre
tels quels plutôt que d'en générer de nouveaux.

## Format

Toujours `{PREFIXE}-{ANNÉE}-{SEQ}` :
- `PREFIXE` : `"ETU"` par défaut, ou un préfixe libre défini par le
  centre (ex. `"UNIV-DKR"`).
- `ANNÉE` : année civile de création du compte étudiant, 4 chiffres.
- `SEQ` : compteur séquentiel sur 4 chiffres (`0001`, `0002`...),
  **remis à zéro chaque nouvelle année**, par centre.

Exemples : `ETU-2026-0001`, `UNIV-DKR-2026-0047`.

Le format n'est pas un gabarit à jetons composables : c'est ce format
fixe, avec seulement le préfixe et l'année personnalisables (l'année
étant toujours l'année réelle de création, jamais un choix libre).

## Modèle de données

### `centers`
Nouvelle colonne :
- `student_id_prefix text` (nullable — `null` signifie "ETU", le
  défaut NEXA).

### `center_student_counters` (nouvelle table)
Un compteur par centre et par année civile, pour permettre le reset
annuel sans jamais perdre le dernier numéro attribué :
```sql
create table public.center_student_counters (
  center_id uuid not null references public.centers(id) on delete cascade,
  year integer not null,
  counter integer not null default 0,
  primary key (center_id, year)
);
```

### `profiles`
Nouvelle colonne :
- `matricule text` (nullable — nullable uniquement pour permettre une
  migration progressive avant le backfill, jamais nul après ce chantier).
- Contrainte d'unicité **par centre**, pas globale :
```sql
create unique index profiles_matricule_center_unique
  on public.profiles (center_id, matricule)
  where matricule is not null;
```
(index partiel : les lignes `matricule is null` — profils staff,
non-étudiants — ne sont jamais concernées par l'unicité.)

## Génération atomique

`/api/etudiants` (route POST) est le point d'entrée **unique** pour la
création d'étudiant — création manuelle (`CreateStudentModal.tsx`) et
import CSV en masse (`ImportStudentsCsvModal.tsx`) appellent tous les
deux cette même route. C'est là, et uniquement là, que la génération de
matricule est branchée.

Un import CSV peut créer plusieurs dizaines de lignes en séquence
rapide : lire le compteur puis l'incrémenter en deux temps (lecture
JS, puis écriture) risquerait d'attribuer deux fois le même numéro.
Nouvelle fonction Postgres, appelée via RPC, qui lit-incrémente en une
seule opération atomique côté base (même principe que le correctif
anti-race déjà appliqué à la consommation de quotas dans
`checkAndConsumeQuota`) :

```sql
create or replace function public.next_student_counter(p_center_id uuid, p_year integer)
returns integer
language plpgsql
security definer
as $$
declare
  v_counter integer;
begin
  insert into public.center_student_counters (center_id, year, counter)
  values (p_center_id, p_year, 1)
  on conflict (center_id, year)
  do update set counter = center_student_counters.counter + 1
  returning counter into v_counter;
  return v_counter;
end;
$$;
```

Une seconde fonction, pour synchroniser le compteur quand un matricule
importé "rentre dans le rang" du format courant du centre (voir règle 1
ci-dessous) : fait avancer le compteur d'une année à au moins une
valeur donnée, sans jamais le faire reculer (deux imports contenant
`0050` puis `0030` pour la même année ne doivent pas faire redescendre
le compteur) :

```sql
create or replace function public.bump_student_counter(p_center_id uuid, p_year integer, p_min_value integer)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.center_student_counters (center_id, year, counter)
  values (p_center_id, p_year, p_min_value)
  on conflict (center_id, year)
  do update set counter = greatest(center_student_counters.counter, p_min_value);
end;
$$;
```

Logique dans `/api/etudiants` POST, avant l'upsert du profil :
1. Si le body de la requête fournit un `matricule` non vide (cas CSV
   avec colonne déjà remplie) → utiliser tel quel. Si collision avec
   un matricule existant du centre (violation de la contrainte
   d'unicité), retourner une erreur pour cette ligne — même traitement
   que les doublons d'email déjà gérés par cette route. Ensuite, tenter
   de parser ce matricule contre le format courant du centre
   (`^{préfixe échappé}-(\d{4})-(\d{4})$`, préfixe = `student_id_prefix`
   ou `"ETU"`) : si ça correspond, appeler
   `bump_student_counter(center_id, année_extraite, seq_extrait)` pour
   que les prochains matricules générés automatiquement continuent
   après celui-ci plutôt que de repartir à `0001`. Si ça ne correspond
   pas au format (ancien système, formule différente), le matricule est
   stocké tel quel sans toucher au compteur — rien à en déduire d'un
   format qui n'est pas le sien.
2. Sinon → résoudre le préfixe (`center.student_id_prefix` ou `"ETU"`),
   appeler `next_student_counter(center_id, année_courante)`, composer
   `{PREFIXE}-{ANNÉE}-{SEQ}` (SEQ paddé à 4 chiffres), assigner à
   `profilePayload.matricule`.

## Import CSV

`ImportStudentsCsvModal.tsx` : `TEMPLATE_HEADERS` gagne une colonne
`matricule` optionnelle (dernière position, pour ne pas perturber les
imports existants qui suivent l'ordre actuel des colonnes). Une ligne
avec `matricule` vide suit la génération automatique (règle 2
ci-dessus) ; une ligne avec `matricule` rempli est prise telle quelle
(règle 1). Le fichier gabarit téléchargeable (`Download` bouton déjà
présent dans ce composant) est mis à jour pour inclure la colonne.

## Réglages centre

Nouvelle section "Matricules étudiants" dans
`/centre/parametres/entreprise` (page.tsx), au même niveau que les
autres sections de ce formulaire :
- Toggle "Généré automatiquement" (défaut, `student_id_prefix = null`)
  vs "Préfixe personnalisé".
- Si personnalisé : champ texte pour le préfixe, aperçu live du format
  complet avec l'année courante (ex. en tapant "UNIV-DKR" →
  `Aperçu : UNIV-DKR-2026-0001`).
- Sauvegardé avec le reste du formulaire de cette page (bouton
  "Enregistrer" existant, pas de bouton dédié). Changer le préfixe
  n'affecte que les étudiants créés après — aucune renumérotation
  rétroactive (les matricules déjà imprimés sur des documents
  resteraient valides).

## Étudiants existants (backfill)

Script one-shot (`scripts/backfill-student-matricules.mjs`, même
convention que `seed-demo-accounts.mjs`), exécuté une fois au
déploiement :
- Pour chaque centre, liste ses étudiants (`role = 'student'`) sans
  matricule, triés par `created_at` croissant.
- Pour chacun, résout l'année à partir de son **`created_at` réel**
  (pas l'année du script), incrémente
  `center_student_counters(center_id, année_du_created_at)` via la
  même fonction `next_student_counter`, assigne le matricule résultant.
- Idempotent : un étudiant qui a déjà un matricule est ignoré (rejouable
  sans risque).

Un centre avec des étudiants créés sur plusieurs années obtient donc
des matricules cohérents par année (`ETU-2024-0001`... `ETU-2024-0037`,
puis `ETU-2025-0001`...), pas une seule séquence continue.

## Affichage

- **Liste étudiants** (`app/centre/etudiants/page.tsx`) : nouvelle
  colonne matricule dans le tableau ; la recherche existante
  (`matchSearch`, ligne ~503) inclut le matricule dans les champs
  comparés.
- **Profil étudiant côté centre** (`StudentIdentityTab.tsx` ou
  équivalent) et **profil étudiant lui-même** : champ matricule affiché
  en lecture seule (jamais éditable manuellement par un utilisateur —
  seul le réglage de préfixe centre influence les *futurs* matricules).
- **Bulletins** (`BulletinDynamique.tsx`) et **certificats**
  (`CertificatView.tsx`) : matricule ajouté aux informations d'identité
  déjà affichées sur ces documents.

## Hors scope

- Détection/inférence d'un format à partir de valeurs CSV importées
  suivant un format inconnu (décision explicite : colonne optionnelle
  prise telle quelle, pas de "magie" de reconnaissance de pattern). La
  synchronisation du compteur décrite plus haut est différente : elle
  ne fait que comparer au format *déjà connu* du centre (exact match),
  jamais une déduction à partir de valeurs arbitraires.
- Jetons de gabarit supplémentaires (campus, filière) — seuls préfixe
  et année, toujours dans cet ordre fixe.
- Modification manuelle d'un matricule après coup via l'interface (à
  faire au cas par cas en base si un centre a une vraie erreur —
  suffisamment rare pour ne pas justifier une UI dédiée dans cette
  première version).
- Renumérotation rétroactive quand un centre change son préfixe.

## Tests

- Génération sans préfixe personnalisé → `ETU-<année courante>-0001`
  pour le premier étudiant d'un centre neuf.
- Deux créations consécutives dans le même centre/année → suffixes
  `0001` puis `0002`, jamais de collision même en cas d'import CSV
  concurrent (vérifier via plusieurs appels rapprochés à la route).
- Changement d'année (simulé) → le compteur repart à `0001` pour la
  nouvelle année, le centre garde son historique de l'année précédente
  intact dans `center_student_counters`.
- Import CSV avec une ligne `matricule` rempli et une ligne vide dans le
  même fichier → la première est reprise telle quelle, la seconde est
  générée automatiquement.
- Import CSV avec un `matricule` qui existe déjà dans ce centre → la
  ligne est rejetée avec une erreur explicite, les autres lignes du
  fichier ne sont pas affectées.
- Import CSV avec un `matricule` fourni qui correspond au format
  courant du centre (ex. `ETU-2026-0050`) → un étudiant créé juste
  après, sans matricule fourni, obtient `ETU-2026-0051`, pas
  `ETU-2026-0001`.
- Import CSV avec un `matricule` fourni qui ne correspond PAS au format
  courant du centre (ex. `STU2019-4521` alors que le centre est en
  `ETU-{année}-{seq}`) → stocké tel quel, le compteur de l'année en
  cours n'est pas modifié.
- Backfill : rejouer le script deux fois ne duplique rien et
  n'écrase pas les matricules déjà attribués au premier passage.
- Recherche dans la liste étudiants par matricule (partiel ou complet)
  retourne le bon étudiant.
