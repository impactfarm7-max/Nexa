# Chiffrement des messages en base — Design

Date : 2026-06-02
Statut : Validé (en attente de revue spec)

## Objectif

Rendre tous les messages **illisibles en clair dans la base de données** (dumps, backups,
staff infra Supabase, clé service-role fuitée, faille RLS), tout en restant lisibles par
les destinataires légitimes — `{expéditeur, destinataire(s), admin}` — via l'application.

Modèle retenu : **chiffrement au repos, côté client** (Approche B), avec des **clés
dérivées par conversation** (HKDF). Ce n'est PAS un E2EE zéro-connaissance : l'admin est
traité comme un destinataire légitime partout et le serveur détient la clé maître.

### Ce que ça protège / ne protège pas

- Protège : lecture d'un dump BD, backups, accès infra/staff, clé service-role volée,
  contournement RLS.
- Ne protège pas (et ne vise pas) : un admin légitime lisant les conversations ; le
  contenu à l'écran d'un destinataire autorisé ; le transit (déjà couvert par HTTPS/TLS).
- RLS reste la barrière qui empêche un user d'**obtenir** les lignes des autres.
  Chiffrement + RLS ensemble = « seul le destinataire voit ». Le chiffrement ne remplace
  pas RLS.

## Périmètre

4 tables de messages :

- `community_messages {id, user_id, message, channel, edited, created_at}` — écrit direct navigateur
- `private_messages {from_user_id, to_user_id, message, ...}` — direct navigateur
- `support_messages {from_user_id, to_user_id, message, image_url, ...}` — direct navigateur + route API guest
- `guest_support_messages {guest_token, sender, sender_user_id, message, image_url, ...}` — route API guest (service-role)

Le filtre realtime porte sur `channel` (non chiffré) → inchangé. Aucune recherche
full-text sur `message` → rien à casser.

## Section 1 — Primitive crypto + format

- **AES-256-GCM** via Web Crypto API (`crypto.subtle`), dispo navigateur + Node 20.
  GCM = chiffrement authentifié (détecte toute altération).
- On **réutilise la colonne `message text` existante**. Aucun changement de colonne.
- Format stocké dans `message` :

  ```
  enc:v1:<iv_base64>:<ciphertext_et_tag_base64>
  ```

  - IV aléatoire 12 octets par message.
  - Préfixe `enc:v1:` = marqueur de version. Permet migration progressive et rotation
    future (`v2`).
  - Si le préfixe est absent → message legacy en clair, lu tel quel (passe-plat).

- Module `app/utils/messageCrypto.ts` (client) : `encrypt(text, key)`,
  `decrypt(stored, key)`. `decrypt` est un passe-plat si pas de préfixe `enc:`.
- Module serveur équivalent (route guest) : même format, même dérivation.

## Section 2 — Gestion & livraison des clés

- **Clé maître** `MESSAGE_ENC_KEY` (32 octets, base64) dans `env`, **serveur uniquement**,
  jamais envoyée au navigateur.
- **Sous-clés** dérivées par **HKDF-SHA256(maître, info=contexte)** :
  - Communauté : `info = "community:<channel>"`
  - Privé : `info = "private:<idMin>:<idMax>"` (paire d'UUID triée → déterministe)
  - Support : `info = "support:<studentId>"`
  - Guest : `info = "guest:<guest_token>"`
- Endpoint `app/api/messages/keys` :
  - `GET ?scope=community` → renvoie les sous-clés de tous les canaux (tout user
    authentifié est membre de la communauté).
  - `POST { type, peerId }` → le serveur **vérifie que le demandeur est participant OU
    admin** avant de renvoyer la sous-clé dérivée. Admin → autorisé sur toute conversation.
  - Autorisation :
    - `private` : `convId = sorted(requester.id, peerId)` ; requester.id ∈ paire OU admin.
    - `support` : keyé par `studentId` ; requester.id == studentId OU admin.
- Le navigateur cache les sous-clés en mémoire (Map, durée de session). Pas de stockage
  des clés en BD (dérivation déterministe à partir de la maître).
- **Avantage vs E2EE classique** : aucune clé privée détenue par le user → pas de perte
  de clé possible, multi-appareil natif (chaque appareil re-dérive via le serveur).

## Section 3 — Changements par table

| Table | Écriture | Lecture | Sous-clé |
|---|---|---|---|
| `community_messages` | navigateur chiffre avant insert/update | navigateur + realtime déchiffrent | `community:<channel>` |
| `private_messages` | navigateur chiffre | navigateur + realtime | `private:<idMin>:<idMax>` |
| `support_messages` | navigateur chiffre (page support) **et** serveur chiffre (route guest) | navigateur (admin/student) + realtime | `support:<studentId>` |
| `guest_support_messages` | **serveur** chiffre (route guest) | **serveur** déchiffre pour le guest ; admin déchiffre côté navigateur | `guest:<guest_token>` |

- Le support utilise la **même** sous-clé `support:<studentId>` que l'écriture soit
  côté navigateur (page support) ou côté serveur (route guest matchée par email).
- Guest : tout passe par `/api/support/guest` → serveur chiffre au POST, déchiffre au GET.
  Le guest ne touche jamais une clé.
- `image_url` **non chiffré** (URL vers bucket public). Hors scope v1.

### Points de code touchés (référence)

- `app/communaute/page.tsx` : `fetchMessages`, `handleSubmit` (insert + update),
  envoi DM/PM `private_messages`, handlers realtime INSERT/UPDATE.
- `app/support/page.tsx` : lecture/écriture `support_messages`.
- `app/admin/page.tsx` : lecture des 4 tables (admin déchiffre).
- `app/dashboard/page.tsx`, `app/components/BottomNav.tsx` : aperçus/compteurs.
- `app/api/support/guest/route.ts` : chiffrer au POST, déchiffrer au GET (serveur).

## Section 4 — Migration des messages existants

- Script `scripts/encrypt-existing-messages.mjs` (Node, service-role + clé maître).
- Itère chaque table ; pour chaque ligne sans préfixe `enc:` → dérive la bonne sous-clé
  selon le contexte de la ligne → chiffre → update.
- **Idempotent** : saute les lignes déjà `enc:`. Rejouable sans risque.
- Les lecteurs gèrent les deux formats (préfixe ou non) → aucune fenêtre de casse
  pendant la migration.

## Section 5 — Cas limites

- **Déchiffrement échoué** → afficher `[message illisible]`, pas de crash.
- **Rotation de clé** : bump `v2` ; garder l'ancienne maître pour lire `v1`. Documenté.
- **Édition** (community) → re-chiffre avec la même sous-clé.
- **Suppression** → aucun crypto.
- **Perte de clé user** → impossible (dérivée serveur, non détenue).
- **Notifications push** : n'incluent aucun contenu de message chat aujourd'hui
  (uniquement coaching/rappels génériques) → aucun conflit. Si un aperçu de message est
  ajouté plus tard, le serveur ne pourra pas déchiffrer → texte générique obligatoire.

## Section 6 — Tests

- Unit : `encrypt`→`decrypt` round-trip ; passe-plat sur legacy ; HKDF déterministe
  (même `info` ⇒ même clé) ; altération du ciphertext (GCM) ⇒ rejet.
- Endpoint clés : non-participant refusé ; participant/admin autorisés.
- Intégration : envoyer un message → BD contient `enc:` (illisible) → relecture via app
  = clair.
- Migration : seed en clair → run script → BD chiffrée → app lit clair → re-run = no-op.

## Variables d'environnement

- `MESSAGE_ENC_KEY` — 32 octets base64, serveur uniquement. À ajouter aux env Vercel +
  `.env.local`.

## Hors scope (v1)

- Chiffrement des pièces jointes (`image_url` / fichiers du bucket).
- E2EE zéro-connaissance (Approche C) : écarté car l'admin doit lire partout.
- Rotation automatique des clés (procédure manuelle documentée seulement).
