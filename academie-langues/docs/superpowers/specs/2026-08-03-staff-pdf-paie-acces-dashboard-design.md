# Design — Staff PDF, UI dossier, paie, accès académique, dashboard formateur

Date: 2026-08-03  
Statut: validé en brainstorming (PDF=A, prime=B, planning=A)

## Objectif

Corriger et aligner six points du parcours centre / staff, sans refonte globale.

## Périmètre

1. Tous les PDF exports centre adossés au modèle Paramètres → Documents  
2. Boutons Modifier / Suspendre en bas du dossier staff  
3. Chiffres numériques en filigrane (placeholder) dans le dossier staff  
4. Prime contrat capturable à la génération de période de paie (opt-in)  
5. Permissions par défaut staff académique / formateur  
6. Widget planning personnel sur le dashboard formateur  

Hors scope : certificats exam QR (`certificate.server`), refonte complète Paramètres Documents, inclusion auto mensuelle de la prime.

## Approche

Correctifs ciblés sur les fichiers existants (approche 1 validée). Pas de nouveau sous-système PDF ni de migration lourde.

---

## 1. PDF → modèle Paramètres

### Comportement

Tout export PDF centre doit utiliser `fetchDocumentExportConfig` (logo, titres document, accent, signatures, pied, identité légale RCCM/NIU selon config).

### Exports concernés

Tout générateur dans `app/utils/centerPdfExport.ts` et ses call sites, notamment :

- Reçus / statements  
- Bulletins de notes / feuilles de notes  
- Fiche de paie  
- Programmes / filières  
- Dossiers TCF  

### Règles

- Si la config documents est absente : fallback branding centre existant (comportement actuel dégradé gracieux).  
- Ne pas bloquer le téléchargement si un champ optionnel du modèle manque.  
- Les certificats exam QR restent hors scope.

### Fichiers clés

- `app/utils/documentConfig.ts`  
- `app/utils/centerPdfExport.ts`  
- Call sites : `StaffPayrollTab`, `StudentFinanceTab`, `BulletinDynamique`, pages filières / TCF, etc.

---

## 2. Dossier staff — UI actions + chiffres

### Modifier / Suspendre

- Retirer les boutons de la barre d’onglets / header du dossier (`app/centre/staff/page.tsx`).  
- Les placer en bas du dossier (zone actions footer), visibles quel que soit l’onglet actif (Dossier / Accès / Académique / Paie).  
- Comportements inchangés : Modifier → onglet RH + mode édition ; Suspendre/Réactiver → `toggleStatus`.

### Chiffres en filigrane

- `NumInput` et champs numériques RH/paie : afficher les valeurs suggérées en **placeholder**, champ éditable vide tant que l’utilisateur n’a pas saisi.  
- Champs concernés : `base_salary`, `prime`, `weekly_hours`, `seniority_years`, et équivalents paie.  
- Plus de `value={0}` / `40` collés qui empêchent la saisie libre.  
- Sauvegarde : chaîne vide → `null` (sauf contrainte métier explicite déjà existante).

---

## 3. Fiche de paie — prime contrat (opt-in)

### Contexte

`profiles.prime` est déjà saisie dans le dossier RH et affichée en lecture seule comme « Prime contrat », mais n’entre pas dans les totaux période ni le PDF.

### Comportement

À la génération / ouverture d’une période de paie :

1. Afficher le montant `contract.prime` (Prime contrat).  
2. Case **« Inclure la prime contrat »** — **décochée par défaut**.  
3. Si cochée : créer/inclure une ligne de paie du mois + l’intégrer aux totaux et au PDF.  
4. Si non cochée : absente des totaux / PDF.

Pas d’inclusion automatique récurrente.

### Fichiers clés

- `app/components/StaffPayrollTab.tsx`  
- `app/api/center/staff-payroll/route.ts`  
- PDF paie dans `centerPdfExport.ts`

---

## 4. Accès staff académique — défauts

À la création d’un **formateur** / staff académique, permissions modules par défaut :

| Clé | Libellé |
|-----|---------|
| `cours` | Cours & devoirs |
| `communaute` | Communauté (périmètre ses classes côté produit existant) |
| `examens` | Examens et notes |
| `lives` | Sessions lives |

Remplace le défaut actuel `["etudiants","filieres","communaute"]`.

### Règles

- Persister dans `center_users.permissions` à la création.  
- Persister aussi dans `staff_permissions` si le flux create le permet pour les trainers (aujourd’hui limité au rôle `staff`).  
- Toujours modifiable ensuite via l’onglet Accès.  
- Aligner UI create + API (`app/api/staff/route.ts`) + fallbacks sidebar/route si nécessaire pour éviter un écart nav vs droits stockés.

---

## 5. Dashboard formateur — widget planning

Si rôle **formateur** (`trainer`) :

- Afficher un widget **« Mon planning »** sur `/centre/dashboard` (semaine courante, navigation prev/next).  
- Source : RPC `get_weekly_schedule` avec `p_formateur_id` = utilisateur connecté (même logique que `/centre/mon-planning`).  
- Uniquement les sessions qui lui sont attribuées.  
- Lien « Voir tout » → `/centre/mon-planning`.

Managers / dashboards TCF : inchangés (pas de widget perso).

### Fichiers clés

- `app/centre/dashboard/page.tsx` + hooks/components  
- Réutiliser logique / UI de `app/centre/mon-planning/page.tsx` (extrait composant si utile)

---

## Erreurs & non-régression

- PDF : échec config documents → fallback, pas d’erreur bloquante.  
- Paie : création staff / période continue si prime non incluse.  
- Permissions : création trainer ne doit pas casser si tables permissions partielles (retry / insert ciblé comme patterns existants).  
- Dashboard formateur : si RPC échoue, widget vide + message soft, pas de crash page.

## Tests manuels

1. Télécharger reçu, bulletin, fiche paie, programme : logo/titres Paramètres présents.  
2. Dossier staff : Modifier/Suspendre uniquement en bas ; saisir salaire sans devoir effacer un 0.  
3. Générer paie sans cocher prime → PDF sans prime ; avec case cochée → prime dans total + PDF.  
4. Créer formateur → Accès pré-coché cours / communauté / examens / lives.  
5. Se connecter formateur → dashboard montre uniquement ses créneaux.

## Ordre d’implémentation suggéré

1. UI dossier staff (actions + NumInput) — rapide, isolé  
2. Défauts permissions formateur  
3. Prime contrat opt-in paie  
4. PDF → document config (tous call sites)  
5. Widget dashboard formateur  
