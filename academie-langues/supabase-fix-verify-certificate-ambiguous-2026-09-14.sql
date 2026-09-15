-- Fix: verify_certificate throws "column reference certificate_code is ambiguous" (42702) live.
-- Cause: RETURNS TABLE(certificate_code text, ...) creates an implicit PL/pgSQL variable named
-- certificate_code inside the function body, which collides with the bare column reference in
-- the UPDATE ... WHERE clause. Fix: qualify with the table name.
-- Discovered during a live audit on 2026-09-14 after the matricule migration
-- (supabase-student-matricule-2026-09-14.sql) was executed.

begin;

drop function if exists public.verify_certificate(p_code text);

create or replace function public.verify_certificate(p_code text)
returns table(
  certificate_code text,
  discipline_code text,
  score_summary jsonb,
  issued_at timestamp with time zone,
  student_prenom text,
  student_matricule text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.exam_certificates
  set verified_count = verified_count + 1
  where exam_certificates.certificate_code = p_code;

  return query
  select c.certificate_code, c.discipline_code, c.score_summary, c.issued_at, p.prenom, p.matricule
  from public.exam_certificates c
  join public.profiles p on p.id = c.user_id
  where c.certificate_code = p_code;
end;
$function$;

grant execute on function public.verify_certificate(text) to anon, authenticated;

commit;
