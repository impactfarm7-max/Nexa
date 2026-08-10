-- A executer dans Supabase SQL Editor
-- Permet d'associer une periode de bulletin (grade_periods) a un campus et/ou
-- une filiere specifique, au lieu de s'appliquer forcement a tout le centre.
-- NULL = s'applique a tout le centre (comportement actuel, inchange).

alter table grade_periods add column if not exists campus_id uuid references campuses(id) on delete set null;
alter table grade_periods add column if not exists filiere_id uuid references filieres(id) on delete set null;

create index if not exists grade_periods_campus_id_idx on grade_periods(campus_id);
create index if not exists grade_periods_filiere_id_idx on grade_periods(filiere_id);
