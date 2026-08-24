-- Une formation courte est un type de filière d'un centre libre, pas un type de centre.
-- Les filières `formation_courte` et toutes leurs données restent inchangées.
update public.centers
set center_type = 'generic'
where center_type = 'formation_courte';
