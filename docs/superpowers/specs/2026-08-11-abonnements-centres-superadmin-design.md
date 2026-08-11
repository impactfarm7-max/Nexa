# Abonnements Centres — Design Spec

> Date: 2026-08-11
> Statut: Validé (brainstorming)

---

## 1. Objectif

Remplacer le système Access/Lite/Advance/Ultra par 4 offres commerciales (Découverte, Croissance, Pro, Entreprise) + custom/devis. Fusionner les pages superadmin "Centres" et "Demandes" en une page unique de gestion. Enrichir Analytics avec les KPIs réseau.

---

## 2. Catalogue des offres

### Quotas par palier (ce qui change)

| | Découverte | Croissance | Pro | Entreprise |
|---|---|---|---|---|
| Apprenants | 5–40 (min. 5) | 41–100 | 101–250 | 250+ |
| Prix / mois | Dès 12 500 FCFA · max 100 000 | Dès 102 000 · max 220 000 | Dès 221 900 · max 505 000 | Sur devis |
| Campus | 1 | 3 | 10 | Illimité |
| Comptes formateur/admin | 2 | 4 | 10 | Illimité |
| Tuteur privé | 15 / apprenant / mois | 25 / apprenant / mois | 30 / apprenant / mois | Illimité |
| Sessions live | 2 h / apprenant / mois | 3 h / apprenant / mois | 4 h / apprenant / mois | Illimité |
| Correction intelligente | 5 / apprenant / mois | 10 / apprenant / mois | 15 / apprenant / mois | Sur devis |
| Constructeur de cours | 5 / mois | 10 / mois | 15 / mois | Sur devis |
| Rapports | Standard | Standard | Personnalisés + export | + API |
| Marque blanche | Non (Nexa visible) | Non (Nexa visible) | Option | Incluse |
| Support | WhatsApp + email | WhatsApp prioritaire | Ligne dédiée | Chargé de compte + SLA |
| Overrides libres | Non | Non | Optionnels | Oui |

### Inclus dans toutes les offres (cœur fonctionnel)

- Tableau de bord
- Planificateur / notifications & rappels
- Classes / cohortes
- Cours & ressources (illimités)
- Devoirs (illimités)
- Quiz / examens (illimités)
- Suivi individuel
- Communauté / groupes d'étude
- Bibliothèque numérique (+ contrôle téléchargements)
- Mes notes / to-do
- Finance / suivi des inscriptions
- Session live & cours à distance (dans la limite du palier)
- Interface centre + formateur + apprenant

---

## 3. Statuts centre

| Statut | Condition technique | Accès produit |
|---|---|---|
| En demande | `pending` + `trial_ends_at` > now | Complet sauf IA (visible, grisé) |
| Actif | `active` + `renewal_at` > now (ou null) | Complet selon offre |
| En pause | `suspended` | Lecture seule · message "contacte responsable" |
| Essai expiré | `pending` + `trial_ends_at` ≤ now | Lecture seule · message "contacte responsable" |
| Abonnement expiré | `active` + `renewal_at` ≤ now | Lecture seule · message "contacte responsable" |
| Révoqué | `rejected` | Bloqué complet |

### Essai (7 jours)

- Tout inclus **sauf features IA** (tuteur privé, correction intelligente, constructeur de cours).
- IA visible mais grisée, message "disponible après activation".
- Après 7j sans activation → lecture seule.

### Lecture seule (pause / essai expiré / abo expiré)

- Navigation OK, consultation des données OK.
- Toute action de création / modification → interceptée, message "contacte responsable".
- Étudiants/staff → "Contactez votre centre."
- Centre (admin) → "Contactez l'équipe Nexa."

---

## 4. Migration DB

### 4.1 Enum nexa_offer

```sql
ALTER TABLE centers DROP CONSTRAINT IF EXISTS centers_nexa_offer_check;
ALTER TABLE centers ADD CONSTRAINT centers_nexa_offer_check
  CHECK (nexa_offer IN ('decouverte', 'croissance', 'pro', 'entreprise', 'custom'));

UPDATE centers SET nexa_offer = 'decouverte' WHERE nexa_offer IN ('access', 'lite');
UPDATE centers SET nexa_offer = 'croissance' WHERE nexa_offer = 'advance';
UPDATE centers SET nexa_offer = 'pro' WHERE nexa_offer = 'ultra';
```

### 4.2 Nouvelles colonnes

```sql
ALTER TABLE centers ADD COLUMN IF NOT EXISTS subscription_amount integer;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS subscription_period_months smallint DEFAULT 1;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS subscription_starts_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS renewal_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS renewal_alert_days smallint DEFAULT 7;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS quota_overrides jsonb;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS pause_reason text;
```

### 4.3 Statut étendu

```sql
ALTER TABLE centers DROP CONSTRAINT IF EXISTS centers_status_check;
ALTER TABLE centers ADD CONSTRAINT centers_status_check
  CHECK (status IN ('active', 'pending', 'suspended', 'rejected', 'expired'));
```

### 4.4 Migration essai existant (trial dynamique → colonne)

Pour les centres `pending` existants, rétrofitter `trial_ends_at` depuis `created_at + 7 days` :

```sql
UPDATE centers
SET trial_ends_at = created_at + interval '7 days'
WHERE status = 'pending' AND trial_ends_at IS NULL;
```

---

## 5. Catalogue TS (nexaOffers.ts)

Réécriture : type `NexaOfferKey = 'decouverte' | 'croissance' | 'pro' | 'entreprise' | 'custom'`.

Chaque offre expose :
- `maxStudents` (plafond haut de la tranche)
- `minStudents` (plancher, ex. 5 pour Découverte)
- `maxCampus`
- `maxStaffAccounts`
- `tutorInteractionsPerStudent`
- `liveHoursPerStudent`
- `aiCorrectionsPerStudent`
- `courseBuilderPerMonth`
- `whiteLabel: boolean | 'option'`
- `monthlyFeeMin` / `monthlyFeeMax`
- `supportLevel`

`custom` : tous les champs à `null` → utilise `quota_overrides` du centre.

---

## 6. UI Superadmin — Page Centres / Abonnements

### Navigation

Remplace `/superadmin/centres` + `/superadmin/demandes` → une seule page `/superadmin/centres`.

### Layout

1. **Header** : titre "Centres & Abonnements" + sous-titre + CTA éventuel
2. **Filtres pills** : Tous | Actifs | En pause | En demande | Essai expiré | Abo expiré | Révoqués
3. **Filtre secondaire** : Type (TCF / Natifs) + recherche nom/code
4. **Liste** (style screenshot "Étudiants") :

| Centre & Contact | Offre & Quotas | Effectif | Actions |
|---|---|---|---|
| Nom, ville, type (TCF/natif), email manager | Badge offre + pastilles quotas (campus, tuteur, live…) | Nb étudiants (actifs/total) | Boutons contextuels |

### Actions par statut

| Statut | Actions disponibles |
|---|---|
| En demande | Activer (→ assigner offre + dates), Rejeter |
| Actif | Changer offre, Mettre en pause, Révoquer |
| En pause | Reprendre, Changer offre |
| Essai expiré | Activer, Rejeter |
| Abo expiré | Reprendre (→ prolonger/renouveler), Révoquer |
| Révoqué | Réactiver |

### Modal "Activer / Changer offre"

Formulaire :
- Sélection offre (Découverte/Croissance/Pro/Entreprise/Custom)
- Montant mensuel (pré-rempli selon offre, modifiable)
- Période (mois)
- Date début
- Date renouvellement (auto-calculée)
- Overrides (si Pro option ou Entreprise/Custom) : champs libres JSON ou formulaire structuré

---

## 7. Endpoints API superadmin

| Route | Méthode | Action |
|---|---|---|
| `/api/superadmin/centers` | GET | Liste enrichie (offre, statut dérivé, effectif, dates) |
| `/api/superadmin/centers/[id]` | GET | Détail + quotas + billing |
| `/api/superadmin/centers/[id]` | PATCH | Changer offre, montant, période, overrides |
| `/api/superadmin/centers/[id]/activate` | POST | pending → active (assigner offre + dates) |
| `/api/superadmin/centers/[id]/pause` | POST | → suspended + pause_reason |
| `/api/superadmin/centers/[id]/resume` | POST | → active (reset renewal si besoin) |
| `/api/superadmin/centers/[id]/revoke` | POST | → rejected |

Tous logués dans `superadmin_audit_logs`.

---

## 8. Gate d'accès (centre + étudiants/staff)

Modifier `isCenterOperational()` / `CenterAccessGate` :

```ts
type CenterAccessState =
  | 'full'           // actif, tout OK
  | 'trial'          // essai actif (IA grisée)
  | 'readonly'       // pause / essai expiré / abo expiré
  | 'blocked';       // révoqué

function resolveCenterAccess(center): CenterAccessState {
  if (center.status === 'rejected') return 'blocked';
  if (center.status === 'suspended') return 'readonly';
  if (center.status === 'pending') {
    return center.trial_ends_at > now ? 'trial' : 'readonly';
  }
  // active
  if (center.renewal_at && center.renewal_at <= now) return 'readonly';
  return 'full';
}
```

### Messages affichés

| State | Étudiants / Staff | Centre admin |
|---|---|---|
| `trial` | IA grisée : "Disponible après activation" | — |
| `readonly` | "Votre accès est en lecture seule. Contactez votre centre." | "Votre abonnement nécessite une action. Contactez l'équipe Nexa." |
| `blocked` | "Accès révoqué. Contactez votre centre." | "Votre accès a été révoqué. Contactez l'équipe Nexa." |

---

## 9. Analytics enrichi

Ajouts dans `/superadmin/analytics` :

### KPIs réseau
- Nb centres par offre (Découverte / Croissance / Pro / Entreprise)
- Nb centres par statut
- Total étudiants réseau
- MRR estimé (somme `subscription_amount` des centres actifs)

### Graphes
- Évolution centres actifs / mois
- Top 10 centres par effectif étudiants

### Export
- CSV centres (nom, offre, statut, effectif, montant, renouvellement)

---

## 10. Hors scope V1

- Paiement en ligne / Stripe / Mobile Money (facturation manuelle)
- Notifications automatiques pré-expiration (V2 — on stocke `renewal_alert_days` pour plus tard)
- Module gating côté sidebar centre (les modules IA sont "grisés" en trial, mais pas masqués)
- Historique d'abonnements (table `center_subscriptions`) — V2

---

## 11. Fichiers impactés (estimation)

| Domaine | Fichiers |
|---|---|
| DB | Nouveau SQL migration |
| Catalogue | `app/data/nexaOffers.ts` (réécriture) |
| Superadmin UI | `app/superadmin/centres/page.tsx` (réécriture), supprimer `demandes/page.tsx`, `layout.tsx` (nav) |
| Superadmin API | `app/api/superadmin/centers/route.ts`, `[id]/route.ts`, nouveaux endpoints activate/pause/resume/revoke |
| Gate d'accès | `app/utils/center-trial.ts`, `app/components/CenterAccessGate.tsx`, `app/centre/acces-indisponible/page.tsx` |
| i18n | `app/i18n/messages/superadmin.ts` (nouveaux labels) |
| Analytics | `app/superadmin/analytics/page.tsx`, `app/api/superadmin/analytics/route.ts` |
| Centre sidebar | `app/components/CenterSidebar.tsx` (badge offre) |
| Centre abonnements | `app/centre/abonnements/page.tsx` (refléter nouveau catalogue) |
