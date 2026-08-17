# Finance / Comptabilité — Superadmin

## Décision

Nouveau menu **Finance** dans le superadmin, scopé aux **revenus perçus des centres** (abonnements NEXA). Pas de suivi des dépenses NEXA (aucune donnée de charges n'existe dans l'app — hors scope).

Objectif : un registre réel des paiements (au lieu du simple `billing_status` actuel), avec génération de factures/reçus PDF au branding NEXA.

## Pourquoi un nouveau registre de paiements

Aujourd'hui `centers` porte seulement `billing_status` + `last_payment_at` (un seul point dans le temps, pas d'historique). Impossible de :
- afficher un historique de paiements par centre,
- calculer un revenu réel encaissé dans le temps (le MRR actuel est une estimation à partir des centres actifs, pas un encaissement réel),
- émettre une facture/reçu avec un numéro unique et des données figées au moment du paiement.

→ nouvelle table `finance_payments`, une ligne = un paiement encaissé.

## Données

### Table `finance_payments`

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid pk | |
| `center_id` | uuid fk → centers | |
| `amount` | integer | FCFA |
| `method` | text | `virement` \| `mobile_money` \| `especes` \| `autre` |
| `period_label` | text nullable | ex. "Août 2026", saisie libre |
| `paid_at` | timestamptz | date du paiement |
| `note` | text nullable | |
| `document_number` | text unique | ex. `NEXA-2026-000123`, séquentiel par année |
| `source` | text | `manual` \| `auto_mark_paid` |
| `created_by` | uuid fk → profiles nullable | superadmin auteur |
| `created_at` | timestamptz | |

RLS activée, aucun accès direct anon/authenticated — lecture/écriture uniquement via service role (routes API superadmin), même convention que les tables credits-ia.

Numérotation : séquence par année civile, format `NEXA-{année}-{compteur 6 chiffres}`, calculée côté SQL (fonction ou séquence dédiée) pour éviter les collisions concurrentes.

## Flux d'enregistrement

1. **Formulaire manuel** (page Finance) : superadmin choisit un centre, saisit montant / date / période / méthode / note → POST crée la ligne `finance_payments` (source=`manual`) → propose direct le téléchargement PDF (facture ou reçu — le type est choisi au moment du téléchargement, pas stocké : les deux vues sont générées à la demande depuis la même ligne).
2. **Bouton « Marquer payé »** existant (fiche centre, déjà présent) : en plus de mettre à jour `billing_status`/`last_payment_at` sur `centers`, la requête PATCH crée maintenant aussi une ligne `finance_payments` (source=`auto_mark_paid`, amount=`subscription_amount` du centre, period=cycle courant).

## API

- `GET /api/superadmin/finance/payments?centerId=&days=` — liste paginée (défaut 90 derniers jours), triée par `paid_at` desc.
- `POST /api/superadmin/finance/payments` — crée une ligne manuelle. Body : `center_id, amount, method, period_label?, paid_at, note?`. Retourne la ligne créée + son `document_number`.
- `GET /api/superadmin/finance/summary?days=` — agrégats : total encaissé (all-time), encaissé sur la période, nombre de paiements, revenu mensuel (12 derniers mois, pour le graphique), impayés (réutilise la logique `revenueAtRisk` déjà présente dans `centers.tsx`/dashboard).
- `PATCH /api/superadmin/centers/[id]` — branche `markPaid` existante étendue pour insérer la ligne `finance_payments` dans la même transaction logique (best-effort : si l'insert échoue, le markPaid ne doit pas échouer silencieusement — logguer et renvoyer un warning dans la réponse plutôt que de bloquer le paiement).

Auth : même pattern que les autres routes superadmin (`getSuperadminContext`).

## PDF — factures / reçus

Nouveau fichier `app/utils/financePdfExport.ts`, même stack que `centerPdfExport.ts` (jsPDF + jspdf-autotable), réutilise `addPdfLogo` pour le logo NEXA (`BRAND.logo`), couleurs `BRAND.blue`/`BRAND.orange`.

Deux fonctions : `downloadInvoicePdf(payment)` et `downloadReceiptPdf(payment)` (même layout, libellé différent : "Facture" vs "Reçu").

Contenu du document :
- En-tête : logo NEXA + bloc identité légale — **placeholders explicites à compléter** (constantes en haut du fichier, commentées `// TODO: compléter avant mise en prod` : nom légal, adresse, RCCM/NIU, contact) — nom d'affichage "NEXA" utilisé en attendant.
- N° document, date, type (facture/reçu).
- Bloc "Facturé à" : nom du centre, ville, type (TCF/libre), offre/plan.
- Ligne : désignation (offre + période), montant.
- Total, méthode de paiement.
- Pied de page : mention légale générique + lien nexa-edu.com.

## UI — `/superadmin/finance`

Nouvelle entrée nav "Finance" (icône `Wallet`, déjà importée ailleurs dans le superadmin) dans `app/superadmin/layout.tsx`.

Page :
- 4 cartes KPI : Total encaissé (all-time), Encaissé (période sélectionnée), Impayés (revenue at risk), Nombre de paiements.
- Graphique barres — revenu mensuel, 12 derniers mois (même style visuel que le chart analytics : hover animé).
- Tableau historique des paiements : centre (lien vers fiche), date, montant, méthode, N° document, actions (télécharger facture / télécharger reçu — génère le PDF à la volée depuis les données de la ligne, pas de stockage de fichier).
- Bouton "Enregistrer un paiement" → modal formulaire (centre à choisir via recherche, montant, date, période, méthode, note, type de document à générer après coup).
- Filtres : période (7/30/90/365j), centre.

## Hors scope v1

- Dépenses / charges NEXA (pas de P&L).
- Envoi automatique des factures par email.
- Paiement en ligne / intégration PSP.
- Stockage persistant des PDF générés (régénérés à la demande depuis les données).
- Édition/suppression d'une ligne de paiement après création (erreurs de saisie → note + nouvelle ligne corrective, pas d'édition rétroactive, pour garder un registre fiable).

## Critères d'acceptation

1. Enregistrer un paiement manuel crée une ligne `finance_payments` avec un `document_number` unique et l'affiche dans le tableau.
2. « Marquer payé » sur une fiche centre crée aussi une ligne `finance_payments` (source `auto_mark_paid`).
3. Téléchargement facture/reçu produit un PDF avec logo NEXA, couleurs de marque, numéro de document, montant, centre, date.
4. Les KPI et le graphique reflètent les données réelles de `finance_payments`, pas une estimation.
5. Aucun accès direct à `finance_payments` hors routes superadmin (RLS + revoke).
