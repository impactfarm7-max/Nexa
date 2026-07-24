-- Date d'activation / validation du compte étudiant (centre ou pack B2C).
-- Sert au déblocage examen complet : activated_at + 20 jours, puis anniversaires mensuels.

alter table profiles
  add column if not exists activated_at timestamptz;

comment on column profiles.activated_at is
  'Date de validation du compte (activation centre ou attribution pack). Base du délai J+20 examen complet.';

alter table exam_sessions
  add column if not exists counts_toward_quota boolean not null default true;

comment on column exam_sessions.counts_toward_quota is
  'Si true, la finalisation décrémente exam_4m_used (parcours normal). False pour convocation centre exceptionnelle.';

-- Rétrocompat : date d'inscription active si disponible
update profiles p
set activated_at = e.first_enroll
from (
  select student_id, min(created_at) as first_enroll
  from enrollments
  where status = 'active'
  group by student_id
) e
where p.id = e.student_id
  and p.activated_at is null;

-- Sinon : comptes déjà actifs avec abonnement (hors attente / révoqués)
update profiles
set activated_at = coalesce(activated_at, created_at)
where activated_at is null
  and subscription_ends_at is not null
  and (tag_status is null or tag_status not in ('pending_center_approval', 'revoque'));
