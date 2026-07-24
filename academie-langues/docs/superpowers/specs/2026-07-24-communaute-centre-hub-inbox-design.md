# Design — Communauté centre libre (hub inbox)

Date: 2026-07-24  
Scope: UI/UX du hub `/centre/communaute` pour les centres génériques (non-TCF)  
Status: approved in conversation

## Problem

Le hub Communauté mélange cartes pleine largeur et grilles 2–3 colonnes, avec un arbre filière → niveau → classe à ouvrir. Résultat : beaucoup de vide, scan difficile, trop de clics pour atteindre une salle.

## Goal

Transformer le hub en **inbox** : une liste dense, filtrable, groupée, où chaque salle est une ligne scannable. La vue conversation plein écran existante est **hors scope** (inchangée fonctionnellement).

## Non-goals

- Refonte des bulles / composer / pièces jointes / pin
- Split view Slack (liste + chat côte à côte)
- Changement du modèle de données rooms / membres / Realtime
- Variante TCF spécifique (même page OK si le hub s’adapte aux rooms présentes)

## Information architecture

### Header (conservé)

- Titre `Communauté`
- Sous-titre : nom du centre · compteur non-lus global si > 0
- CTA `+ Groupe` (création de groupe libre inchangée)

### Toolbar

1. Recherche texte (placeholder du type : filière, niveau, salle…)
2. Pastilles filtre (mutuellement exclusives) :
   - `Tout`
   - `Annonces` (salles centre / announcement)
   - `Filières` (forums filière)
   - `Classes` (salles classroom)
   - `Groupes` (groupes libres)

Les onglets “card” actuels (`Tout | Pilotage | Classes | Groupes`) et le select “Toutes les filières” sont **remplacés** par cette toolbar. Un filtre filière optionnel n’est pas requis pour le v1 inbox si la recherche + groupes d’en-tête suffisent.

### Corps = liste unique

Pas de grille de cartes. Une colonne pleine largeur, scroll vertical.

#### Groupes d’en-tête (ordre fixe)

1. **Centre** — salles annonces du centre  
2. **Par filière** — pour chaque programme/filière visible :
   - en-tête sticky léger avec nom filière + résumé (ex. `Forum · N classes`) + badge non-lus agrégé
   - lignes : forum filière d’abord, puis classes
   - libellé classe : `Niveau · Nom salle` (ou nom salle + meta niveau)
   - **pas d’accordéon niveau** : toutes les classes de la filière visibles sous l’en-tête
3. **Groupes libres** — salles type groupe admin/libre

Si un filtre pastille masque un bloc entier, le bloc n’apparaît pas.  
Si la recherche ne matche aucune ligne d’un bloc, le bloc n’apparaît pas.

#### Ligne de salle

| Zone | Contenu |
|------|---------|
| Gauche | Icône selon type (annonces / forum / classe / groupe) |
| Centre | Titre (nom salle) ; sous-ligne : dernier message tronqué (ou “Aucun message”) · heure relative/courte |
| Droite | Badge non-lus si > 0 ; pastille type (`Forum` / `Classe` / `Groupe`) ; chevron |

- Hover : fond léger
- Clic : ouvre la conversation existante (même `activeRoom` / plein écran)
- Compteurs membres : optionnels en v1 (peuvent rester si déjà dispo sans alourdir la ligne)

### Empty states

- Aucune salle du tout : message + invitation claire (pas de faux contenu)
- Filtre / recherche sans match : `Aucun résultat pour « … »` (ou équivalent) ; pas de faux positifs
- CTA `+ Groupe` visible depuis le header ; pas obligatoire de le dupliquer dans l’empty sauf si utile

## Visual / UX notes (centre brand)

- Rester dans le système centre existant : `BLUE` / `ORANGE`, `nexa-center-shell`, composants toolbar déjà utilisés ailleurs
- Une densité type messagerie (lignes ~56–64px), pas de cartes multi-colonnes
- Badges non-lus plus visibles que les tags actuels `FORUM` / `CLASSE`
- Respect `prefers-reduced-motion` ; pas d’animation décorative obligatoire

## Data / behavior reuse

Réutiliser tel quel :

- `useCenterRooms` + memberships
- `lastMessages`, `unreadCounts`, `memberCounts`
- helpers `formatSidebarTime` / parse message pour aperçu
- arbre programmes / niveaux / groupes déjà chargé (aplatir pour l’affichage, ne plus collapser par niveau)
- modal création groupe + RPC `create_community_room`

Changer principalement la **présentation** du hub (`!activeRoom` branch dans `app/centre/communaute/page.tsx`), idéalement en extrayant un sous-composant hub (ex. `CommunauteHubInbox`) pour ne pas grossir davantage la page.

## Acceptance criteria

1. Sur desktop et mobile, le hub montre une **liste 1 colonne** (plus de mix carte pleine largeur + grille 2 cols incohérente).
2. Les pastilles filtrent correctement Annonces / Filières / Classes / Groupes / Tout.
3. La recherche filtre sur noms de filière, niveau et salle.
4. Ouvrir une ligne mène à la même vue chat qu’aujourd’hui ; retour flèche revient au hub.
5. Non-lus par salle et total header restent cohérents.
6. Création `+ Groupe` fonctionne comme avant.
7. Aucun changement requis côté schéma Supabase / Realtime pour ce lot.

## Out of scope follow-ups (explicit)

- Split view liste + chat
- Refonte composer / bulles
- Mentions, réactions, threads
