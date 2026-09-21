# Extension du parcours LMD

Décisions utilisateur du 21 septembre 2026 : proposition de passage par le système,
confirmation par le responsable ; suivi complet du doctorat jusqu'au diplôme.

## Règles retenues

- Calcul unique des moyennes normales pondérées et du rattrapage, dans le carnet,
  le bulletin et le bilan. Le rattrapage réussi remplace la note finale affichée.
- Cumul par étudiant et programme sur les inscriptions actives et terminées.
  Une UE acquise compte une fois ; les tentatives de redoublement restent distinctes.
  Pas de transfert implicite de crédits entre programmes Licence et Master.
- Proposition « admis » quand toutes les UE du niveau sont acquises ; « redouble »
  quand toutes sont évaluées et certaines échouées ; pas de proposition définitive
  en présence d'UE non évaluées. Le responsable garde la décision.
- Les UE échouées des semestres antérieurs deviennent des dettes visibles. Les UE
  sans note restent à évaluer, sans être qualifiées automatiquement de dettes.
  Une note de rattrapage sur l'inscription actuelle peut solder une dette ancienne.
- Changement de semestre confirmé par le responsable, dans le même niveau et la
  même inscription : pas de nouvelle facture annuelle.
- Dossier académique par étudiant/programme : diplôme visé explicitement choisi,
  sujet de thèse, directeur, étapes datées, soutenance, jury, décision et procès-verbal.
- Licence/Master : toutes les UE acquises et validation du responsable avant émission.
  Doctorat : suivi terminé, soutenance passée, jury favorable et UE éventuelles acquises.
- Émission explicite d'un diplôme numéroté avec instantané des informations et de
  l'auteur ; téléchargement reproductible. Aucun envoi automatique à des tiers.
- Dossier versionné et historique des modifications ; un diplôme émis fige le dossier.
  Toute opération est limitée au centre/campus et aux permissions du responsable.

## Livraison

Migration additive `supabase-lmd-cycle-2026-09-21.sql` pour les dossiers et leur audit.
Les corrections de notes et le cumul utilisent les tables déjà existantes.
Validation : tests des calculs et des conditions d'émission, tests API avec faux accès
aux données, TypeScript et tests existants. Vérification réelle après application SQL.

## Vérification du 21 septembre 2026

- 119 tests réussis, dont 20 tests ajoutés pour les calculs, les diplômes et l'API.
- Compilation de production et vérification TypeScript réussies.
- Tables et fonctions SQL présentes dans Supabase, contrôlées avec
  `node --env-file=.env.local scripts/check-lmd-cycle.mjs`.
- Les tests de mutations de l'API utilisent des données simulées ; aucun diplôme
  réel n'a été émis pour vérifier cette livraison. Le parcours navigateur complet
  avec un dossier de test n'a pas été exécuté dans cette session.
- Aucune publication Git ni aucun déploiement de l'application effectué.
