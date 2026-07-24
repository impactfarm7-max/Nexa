-- A executer dans Supabase SQL Editor
-- Verrouillage tuteur IA : 10 jours apres creation ou activation

alter table public.profiles
  add column if not exists tutor_unlock_at timestamptz;

-- Etudiants centre deja actifs : date d'activation + 10 jours
update public.profiles p
set tutor_unlock_at = sub.unlock_at
from (
  select
    p2.id as student_id,
    (
      coalesce(
        (
          select e.enrolled_at + interval '10 days'
          from public.enrollments e
          where e.student_id = p2.id
            and e.status = 'active'
          order by e.enrolled_at desc nulls last
          limit 1
        ),
        p2.created_at + interval '10 days'
      )
    ) as unlock_at
  from public.profiles p2
  where p2.center_id is not null
    and p2.role = 'student'
    and p2.tutor_unlock_at is null
) sub
where p.id = sub.student_id;

notify pgrst, 'reload schema';
