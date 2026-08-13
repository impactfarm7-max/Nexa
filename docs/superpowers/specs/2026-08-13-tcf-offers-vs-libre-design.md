# Offres TCF vs centres libres

## Décision
- **Centres libres** : catalogue NEXA actuel (`decouverte` / `croissance` / `pro` / `entreprise`) → `centers.nexa_offer`.
- **Centres TCF Canada** : catalogue plaquette NEXA TCF (paliers par effectif) → `centers.plan_type`, `nexa_offer` reste `null`.

## Catalogue TCF (plaquette)
| Clé | Effectif | Prix / étudiant | Total | Détail |
|-----|----------|-----------------|-------|--------|
| `tcf_3` | 3 | 8 500 FCFA | 25 500 | Technologie complète |
| `tcf_6` | 6 | 8 000 FCFA | 48 000 | Technologie complète |
| `tcf_10` | 10 | 7 000 FCFA | 70 000 | Technologie complète |
| `tcf_custom` | >10 | — | Sur devis | Accès personnalisé |

Technologie complète = Face Centre + Face Étudiant (dashboard, staff, étudiants, programmes, formation, examens, finance, communauté, live, pack TCF, tuteur, etc.).

## Surfaces
1. `/ouvrir-centre` — grille selon `center_type`
2. `/centre/abonnements` — idem
3. Activation / changement d’offre superadmin — grille TCF si `tcf_canada`

## Stockage
- Libre : `nexa_offer` + quotas NEXA.
- TCF : `plan_type` ∈ `tcf_3|tcf_6|tcf_10|tcf_custom` ; sièges dérivés du palier (sauf custom override).
