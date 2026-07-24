# Coaching Groupe — Design

**Date:** 2026-06-20
**Statut:** Validé, prêt pour plan d'implémentation

## Objectif

Permettre à l'admin de programmer une session de coaching **groupe** depuis le dashboard admin (onglet coaching). Tous les étudiants ayant le coaching dans leur pack peuvent rejoindre. Les séances individuelles en conflit avec le créneau groupe sont automatiquement annulées. Notifications push à 3 moments. Chrono temps-restant à l'écran pour les sessions groupe **et** individuelles.

## Décisions validées

| Sujet | Décision |
|---|---|
| Crédit pour rejoindre une session groupe | **Gratuit** — ne consomme aucun crédit coaching. Ouvert à tous ceux ayant `coaching_total > 0`. |
| Séances individuelles annulées | Celles dont le créneau **chevauche ±30min** la fenêtre de la session groupe. Crédit remboursé si la séance était confirmée. |
| Durée session groupe | **Choisie par l'admin** (champ `duration_min`). |
| Gestion après création | L'admin peut **annuler** une session groupe (push à tous). Pas d'édition (annuler + recréer). |
| Métadonnées | **Titre + description** (description optionnelle). |
| Emails groupe | Non — push + notif in-app seulement (volume). Les emails restent pour les séances individuelles. |

## 1. Modèle de données

Nouvelle table `group_coaching_sessions`, **séparée** de `coaching_sessions` pour ne pas toucher à la logique de quota individuelle existante.

```sql
create table if not exists public.group_coaching_sessions (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  session_date     date not null,
  session_time     text not null,                 -- "HH:MM"
  duration_min     int  not null default 60,
  status           text not null default 'scheduled',  -- scheduled | cancelled | done
  created_by       uuid references public.profiles(id),
  reminder_sent_at timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists group_coaching_upcoming_idx
  on public.group_coaching_sessions(session_date, session_time)
  where status = 'scheduled';

create index if not exists group_coaching_reminder_idx
  on public.group_coaching_sessions(session_date, session_time)
  where status = 'scheduled' and reminder_sent_at is null;
```

(Table déjà créée en base le 2026-06-20.)

- **Pas de table participants** : la participation est gratuite et ouverte à tous les éligibles, donc l'éligibilité est calculée à la volée (`profiles.coaching_total > 0`, non révoqué/terminé).
- Convention `session_date` / `session_time` identique à `coaching_sessions` (timezone `Africa/Douala`, offset `+01:00`).
- Room LiveKit : `group-coaching-${id}`.

## 2. Endpoints

### `/api/admin/group-coaching/route.ts` (admin-only)

Réutilise le helper `requireAdmin` de [app/api/admin/coaching/route.ts](../../../app/api/admin/coaching/route.ts).

- **GET** — liste sessions groupe (à venir + passées) pour l'onglet coaching admin. Renvoie aussi le nombre d'étudiants éligibles.
- **POST** — créer. Body `{ title, description, scheduled_at, duration_min }`. Validation : créneau ≥30min dans le futur (comme l'individuel). Déclenche annulation conflits (§3) + notifications (§4).
- **DELETE** — annuler une session groupe `scheduled`. `status='cancelled'`, push d'annulation à tous les éligibles.

### `/api/coaching/group-room-token/route.ts` (étudiant éligible ou admin)

Miroir de [app/api/coaching/room-token/route.ts](../../../app/api/coaching/room-token/route.ts) :
- Auth : `coaching_total > 0` OU admin.
- Session doit être `scheduled`.
- Fenêtre d'accès : `[start - 15min, start + duration_min]`.
- Renvoie `{ url, token, endsAt }` avec `endsAt = start + duration_min`.
- Room name `group-coaching-${id}`, grant `roomJoin/canPublish/canSubscribe`.

### `/api/coaching/reminders/route.ts` (cron existant, `*/5 * * * *`)

Étendre : scanner aussi `group_coaching_sessions` (status `scheduled`, `reminder_sent_at` null, départ dans 0–15min) → push rappel à tous les éligibles → stamper `reminder_sent_at`. Réutilise le cron Vercel existant (pas de nouveau cron dans `vercel.json`).

## 3. Annulation des conflits (au POST groupe)

Fenêtre groupe = `[start, start + duration_min]`. Séance individuelle ≈ 30min.

1. Query `coaching_sessions` status `in (en_attente, confirme)` dans la plage de dates concernée.
2. Test de chevauchement : individuelle annulée si `indiv_start < group_end` ET `indiv_start + 30min > group_start`.
3. Pour chaque conflit :
   - `status='annule'`, `cancel_reason="Annulé : session de coaching groupe programmée"`.
   - Si elle était `confirme` et `coaching_total != 9999` → remboursement `coaching_used = max(0, coaching_used - 1)` (même logique que [appointments DELETE](../../../app/api/coaching/appointments/route.ts)).
   - Push + ligne `notifications` à l'étudiant : « Votre coaching du {when} est annulé : une session de coaching groupe a été programmée à ce créneau. »

## 4. Notifications (3 déclencheurs)

Toutes via `sendPushToUsers` ([app/utils/push-server.ts](../../../app/utils/push-server.ts)) + lignes `notifications`.

1. **Création groupe** → push à TOUS les éligibles : « Coaching groupe : {title} le {when}. Rejoignez ! ». Les étudiants en conflit reçoivent en plus la notif d'annulation du §3.
2. **Rappel 15min** → cron, push à tous les éligibles : « Rappel : coaching groupe {title} dans 15 min. »
3. **Annulation par l'admin** → push à tous les éligibles : « Coaching groupe {title} du {when} annulé. »

Pas d'email pour le groupe.

## 5. UI

### Admin — [app/admin/page.tsx](../../../app/admin/page.tsx) onglet coaching
Carte « Programmer session groupe » : champs titre, description, date, heure, durée → POST. Liste des sessions groupe à venir avec bouton annuler + compteur d'éligibles.

### Étudiant — [app/dashboard/coaching/page.tsx](../../../app/dashboard/coaching/page.tsx)
Bannière au-dessus de la réservation individuelle : sessions groupe à venir (titre, date/heure, bouton « Rejoindre » actif dans `[start-15min, start+duration]`). Route vers la room groupe.

### Room groupe — `app/dashboard/coaching/room/group/[id]/page.tsx`
Miroir de la room individuelle [room/[id]/page.tsx](../../../app/dashboard/coaching/room/[id]/page.tsx), fetch `group-room-token`, même composant [LiveKitMeeting](../../../app/components/LiveKitMeeting.tsx).

## 6. Chrono (compte à rebours à l'écran)

Nouveau composant `CoachingTimer` :
- Props : `endsAt` (epoch ms).
- Tick chaque seconde, affiche `MM:SS` restant dans le header de la room.
- Couleur orange → rouge sous 5min.
- Intégré aux **deux** rooms :
  - individuelle [room/[id]/page.tsx](../../../app/dashboard/coaching/room/[id]/page.tsx) (a déjà `endsAt`).
  - groupe (nouvelle).
- L'auto-fermeture à 0 est déjà câblée côté individuel ; même comportement côté groupe.

## 7. Tests

Fichiers `*.test.mjs` (`node --test`, conforme à `npm test`) :
- Logique de chevauchement conflit (overlap ±30min).
- Filtre d'éligibilité (`coaching_total > 0`, non révoqué/terminé).
- Calcul fenêtre rappel (0–15min).
- Calcul `endsAt = start + duration_min`.

UI testée manuellement.

## Hors périmètre (YAGNI)

- Édition d'une session groupe (annuler + recréer à la place).
- Liste/comptage des participants présents.
- Consommation/quota de crédits pour le groupe.
- Emails pour le groupe.
