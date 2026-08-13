# Cursus — tarification par niveau d’abord

## Décision
En mode **Par niveau**, le centre saisit le prix de chaque niveau individuellement. Le **prix de référence global** (`filieres.default_tuition_fee`) est la **somme** des prix de formation des niveaux (hors frais annexes), calculée automatiquement (lecture seule).

## UX
1. Choix Par niveau / Uniforme
2. Si Par niveau : onglets niveaux → prix / frais / échéancier par niveau (obligatoire)
3. Bandeau bas : détail par niveau + total « Prix de référence global (somme des niveaux) »
4. Plus d’héritage depuis un prix global éditable
5. Mode Uniforme inchangé

## Validation
Chaque niveau doit avoir `tuition_fee` ≥ 1 avant sauvegarde.

## Inscription
Toujours le prix du niveau choisi, pas la somme globale.
