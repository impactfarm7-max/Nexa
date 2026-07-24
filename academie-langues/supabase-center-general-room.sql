-- A executer dans Supabase SQL Editor
-- Canal « Général » du centre : une room d'annonces (type = announcement) sans
-- filiere ni groupe, qui regroupe TOUS les etudiants du centre, toutes classes
-- confondues. Seul le staff peut y ecrire (cote etudiant, les rooms announcement
-- sont en lecture seule). Cree automatiquement a la creation du centre + backfill
-- des centres existants.

create or replace function ensure_center_general_room(
  p_center_id uuid,
  p_created_by uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id     uuid;
  v_center_name text;
  v_creator     uuid;
begin
  if p_center_id is null then
    raise exception 'ensure_center_general_room: p_center_id requis';
  end if;

  -- Idempotent : renvoie la room Generale existante si elle existe deja
  select id into v_room_id
  from community_rooms
  where center_id = p_center_id
    and type = 'announcement'
    and filiere_id is null
    and groupe_id is null
  order by created_at asc
  limit 1;

  if v_room_id is not null then
    return v_room_id;
  end if;

  select name into v_center_name from centers where id = p_center_id;

  -- Createur : le manager fourni, sinon un manager du centre, sinon 1er membre staff
  v_creator := p_created_by;
  if v_creator is null then
    select user_id into v_creator
    from center_users
    where center_id = p_center_id
    order by (role = 'manager') desc, (role = 'campus_manager') desc
    limit 1;
  end if;

  if v_creator is null then
    raise exception 'ensure_center_general_room: aucun createur disponible pour le centre %', p_center_id;
  end if;

  insert into community_rooms (
    name, type, center_id, created_by, invite_code, invite_active, filiere_id, groupe_id
  ) values (
    'Général · ' || coalesce(nullif(trim(v_center_name), ''), 'Centre'),
    'announcement',
    p_center_id,
    v_creator,
    'NEXA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    true,
    null,
    null
  )
  returning id into v_room_id;

  -- Le createur devient owner (pour pouvoir ecrire les annonces).
  -- La room vient d'etre creee : aucun membre existant, insert direct.
  insert into community_room_members (room_id, user_id, role)
  values (v_room_id, v_creator, 'owner');

  return v_room_id;
end;
$$;

grant execute on function ensure_center_general_room(uuid, uuid) to authenticated, service_role;

-- ── Backfill : cree la room Generale pour les centres qui n'en ont pas encore ──
do $$
declare c record;
begin
  for c in
    select ce.id
    from centers ce
    where not exists (
      select 1 from community_rooms r
      where r.center_id = ce.id
        and r.type = 'announcement'
        and r.filiere_id is null
        and r.groupe_id is null
    )
    and exists (
      select 1 from center_users cu where cu.center_id = ce.id
    )
  loop
    begin
      perform ensure_center_general_room(c.id, null);
    exception when others then
      raise notice 'Backfill Général ignore pour le centre % : %', c.id, sqlerrm;
    end;
  end loop;
end$$;

notify pgrst, 'reload schema';
