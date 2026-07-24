# Montants en lettres (FCFA) — Design

**Date:** 2026-07-24  
**Statut:** Validé, prêt pour plan d'implémentation

## Objectif

Afficher l’équivalent en toutes lettres de chaque montant d’argent saisi ou des totaux importants, au format :

> En lettres : quatre-vingt-dix mille francs CFA

comme sur l’écran de création de filière / plan de paiement. Couvrir l’UI écran et les PDF / impressions.

## Décisions validées

| Sujet | Décision |
|---|---|
| Périmètre affichage | **B** — sous les champs de **saisie** d’argent **et** sous les **totaux / montants importants** |
| Documents | **B** — écran **+** PDF / impression (reçus, factures, totaux filière) |
| Plan de paiement | **A** — « en lettres » **uniquement sur le total** du plan, pas sur chaque échéance |
| Approche technique | **1** — composant réutilisable + utilitaire existant `amountInWordsFr` |

## Contexte existant

- Utilitaire : [`app/utils/amountInWordsFr.ts`](../../../app/utils/amountInWordsFr.ts)  
  Exemple : `amountInWordsFr(90000)` → `"quatre-vingt-dix mille francs CFA"`.
- Déjà branché sur [`app/centre/filieres/nouveau/page.tsx`](../../../app/centre/filieres/nouveau/page.tsx) (`TotalDisplay`) et partiellement dans [`app/utils/centerPdfExport.ts`](../../../app/utils/centerPdfExport.ts) (totaux filière).
- Pas encore branché sur finance, TCF activation, profil étudiant, paie staff, etc.

## Architecture

### 1. Composant UI `AmountInWords`

Fichier proposé : `app/components/AmountInWords.tsx` (ou `app/components/finance/AmountInWords.tsx` si un dossier finance UI existe déjà).

```tsx
type AmountInWordsProps = {
  amount: number | string | null | undefined;
  className?: string;
};

// Affiche : "En lettres : {amountInWordsFr(n)}"
// Masqué si n <= 0 ou non numérique
```

**Style** (aligné sur `TotalDisplay` filière) :
- `text-[11px] text-neutral-500 italic mt-1.5 leading-snug`
- Préfixe fixe `En lettres : `

Pas de logique métier dans le composant : il délègue à `amountInWordsFr`.

### 2. Règles d’affichage

| Contexte | Afficher « en lettres » ? |
|---|---|
| Input montant FCFA (pendant la saisie) | Oui, dès que montant > 0 |
| Total à payer / reste à payer / montant encaissé (confirmation) | Oui |
| Total d’un plan de paiement | Oui |
| Lignes d’échéances (lecture ou saisie) | Non |
| Cellules de tableaux denses / listes étudiants | Non |
| KPI dashboard finance (CA, encaissé, impayés agrégés) | Non |
| Totaux principaux PDF / facture / reçu | Oui |
| Chaque ligne de détail PDF | Non (sauf si déjà un total de section) |

### 3. Zones d’intégration prioritaires

1. **Centre → Finances** (`app/centre/finance/page.tsx`)  
   - Modal encaissement : sous l’input montant + sous le reste / confirmation  
   - Facture / reçu imprimable : total / solde en lettres  
2. **Filières** (`app/centre/filieres/nouveau/page.tsx`)  
   - Remplacer le markup inline de `TotalDisplay` par `AmountInWords`  
   - Garder les totaux PDF déjà alimentés via `amountInWordsFr`  
3. **TCF étudiants** (`app/centre/tcf/etudiants/page.tsx`)  
   - Saisie tarif / échéances : lettres sous inputs et sous total final  
4. **Autres saisies argent centre** (si présentes dans le même sprint)  
   - Coupons montant fixe, paie staff, frais ponctuels — même pattern  
5. **PDF** (`app/utils/centerPdfExport.ts` + impressions finance)  
   - Une ligne `En lettres : …` sous chaque total principal manquant

### 4. Hors scope (volontaire)

- Conversion multi-devises (FCFA uniquement).
- Affichage sous chaque cellule de tableau / KPI.
- Refacto global de tous les `fmtFCFA` en un seul composant `MoneyTotal` (approche 2 reportée).
- Bibliothèque externe (`n2words`, etc.) — l’utilitaire maison suffit.

## Flux de données

```
montant (number | string)
    → amountInWordsFr(montant)
    → "… francs CFA"
    → UI: <AmountInWords />  |  PDF: doc.text(`En lettres : ${…}`)
```

Aucun stockage DB : calcul dérivé à l’affichage / export.

## Erreurs / cas limites

| Cas | Comportement |
|---|---|
| `0`, vide, `NaN`, négatif | Ne rien afficher (composant retourne `null`) |
| Décimales | Entier via `Math.floor` (déjà dans l’utilitaire) — FCFA sans centimes |
| Très grands montants | Supporté jusqu’aux milliards par l’utilitaire existant |

## Tests

- Unitaires légers sur `amountInWordsFr` pour les cas déjà critiques (90000, 1, 0, 80, 71, 1000000) si un fichier de test existe ou est créé à côté.
- Vérif manuelle : saisie encaissement finance, total filière, export PDF filière, activation TCF.

## Critères de succès

1. Tout champ de saisie d’argent FCFA des zones prioritaires affiche « En lettres » en live.  
2. Totaux importants (UI + PDF) affichent la même ligne.  
3. Plans de paiement : lettres **seulement** sur le total.  
4. Style cohérent avec l’écran filière existant.  
5. Aucune régression sur les flux de paiement / export PDF.
