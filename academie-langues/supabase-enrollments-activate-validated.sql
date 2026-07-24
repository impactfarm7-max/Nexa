-- A executer dans Supabase SQL Editor
-- Passe en actif les inscriptions TCF deja validees (profil actif) mais restees en draft.

update public.enrollments e
set status = 'active'
from public.profiles p
where e.student_id = p.id
  and e.status = 'draft'
  and p.center_status = 'active'
  and p.role = 'student';

notify pgrst, 'reload schema';
