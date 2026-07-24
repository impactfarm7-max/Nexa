-- A executer dans Supabase SQL Editor
-- Repare les anciennes missions de centre qui auraient ete creees avec center_id null.
-- Les missions IAG normales ne sont pas touchees.

update missions m
set center_id = cu.center_id
from center_users cu
where m.center_id is null
  and m.created_by_center_user_id is not null
  and cu.user_id = m.created_by_center_user_id;

-- Verification: cette requete doit retourner 0 ligne.
select id, title, created_by_center_user_id, center_id
from missions
where created_by_center_user_id is not null
  and center_id is null;
