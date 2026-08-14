# Crédits IA surplus — centres TCF & libre

## Décision produit

Les quotas inclus dans l’offre / le pack restent intacts.  
Le centre peut acheter des **crédits en surplus** chez Nexa, puis les **attribuer** à un étudiant ou à un compte centre/staff (fonctionnalités IA côté centre aussi).

Valable pour centres **TCF** et **libre (natif)**.

## Flux

```
Nexa ──vend──► Centre (stock)
Centre ──attribue──► Étudiant | Staff/centre (crédits en plus)
```

### 1. Achat Nexa → Centre (mode C)

Deux modes d’achat :

| Mode | Exemple | Effet stock |
|------|---------|-------------|
| Portefeuille générique | « 100 crédits IA » | `wallet_generic += 100` |
| Pack typé | « +50 tuteur IA » | `wallet_tutor_ia += 50` |

Le centre voit : solde générique + soldes par type.

### 2. Attribution Centre → Compte

Le staff choisit :

1. **Qui** — un étudiant **ou** un compte centre/staff du même centre  
2. **Quoi** — type de crédit (voir catalogue ci-dessous)  
3. **Combien** — entier ≥ 1, ≤ stock disponible  
4. **Paiement** (option C) — case « Enregistrer un paiement »  
   - décochée → gratuit pour le bénéficiaire (redistribution)  
   - cochée → montant libre + motif → ligne finance centre  

**Règles stock :**

- Pack typé → type prérempli ; débit du solde typé  
- Portefeuille → type choisi à l’attribution ; débit du solde générique  
- Attribution = **toujours du surplus** : on incrémente le `*_total` du profil (ou compteur centre), sans reset de `*_used`

### 3. Consommation

Les features IA respectent `used < total` sur le compte concerné.  
Prérequis déjà livré pour le tuteur étudiant (`tutor_ia_total` / `tutor_ia_used`).

## Catalogue de crédits v1

| Clé | Libellé | Cible typique | Compteur |
|-----|---------|---------------|----------|
| `tutor_ia` | Tuteur IA | Étudiant (+ staff si exposé) | `profiles.tutor_ia_total` |
| `ai_corrections` | Corrections IA | Selon feature existante | compteur dédié ou override centre |
| `course_builder` | Constructeur de cours | Compte centre/staff | quota centre / compteur staff |
| `exam_sim` | Simulateur / examens | Étudiant TCF | `exam_total` ou `exam_4m_total` (préciser à l’UI) |

v1 minimale si le mapping feature n’est pas prêt partout : **`tutor_ia` + `exam_sim`** côté étudiant, **`ai_corrections` + `course_builder`** côté centre — étendre ensuite.

## Données

### Stock centre

Table (ou JSON sur `centers`) :

- `center_id`
- `wallet_generic` (int ≥ 0)
- `wallets_by_type` : `{ tutor_ia, ai_corrections, course_builder, exam_sim }`
- `updated_at`

### Achats

Historique `center_credit_purchases` :

- centre, mode (`generic` | `typed`), type nullable, quantité, montant Nexa, créé par (superadmin), `created_at`

### Attributions

Historique `center_credit_grants` :

- centre, bénéficiaire (`profile_id`), type, quantité  
- source (`generic` | `typed`)  
- paiement optionnel : `amount`, `reason`, `finance_payment_id` nullable  
- `granted_by`, `created_at`

## Surfaces UI

1. **Superadmin** — vendre / créditer le stock d’un centre (générique ou typé)  
2. **Centre** — page « Crédits IA » (ou section Finance / Abonnements) :  
   - soldes  
   - attribuer (qui / quoi / combien / paiement)  
   - historique  
3. **Profil / fiche apprenant** — raccourci « Ajouter des crédits » (préremplit le bénéficiaire)

## Hors scope v1

- Achat self-service étudiant (paiement en ligne direct)  
- Packs add-on B2C hors centre  
- Transfert de crédits entre centres  
- Remboursement automatique Nexa

## Critères d’acceptation

1. Après attribution de +N tuteur IA, l’étudiant peut envoyer N messages de plus (au-delà du pack de base).  
2. Stock centre décrémenté correctement (générique ou typé).  
3. Attribution impossible si stock insuffisant.  
4. Case paiement → ligne finance visible ; sans case → pas de ligne.  
5. Historique consultable centre + superadmin.  
6. Même mécanique dispo pour un compte centre/staff sur les types centre.
