-- Journal d'audit des notes (scolarité) — append-only.
-- À exécuter dans le SQL Editor Supabase.
-- ORDRE 2/3 — après supabase-grades-deliberation-status-2026-09-23.sql
-- Requis avant toute écriture de notes (ensureAuditTableReady).

create table if not exists public.grade_audit_events (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action text not null
    check (action in ('create', 'update', 'delete', 'validate_session', 'reopen_session', 'import')),
  grade_id uuid,
  enrollment_id uuid,
  filiere_matiere_id uuid,
  period_id uuid,
  groupe_id uuid,
  batch_id uuid,
  before jsonb,
  after jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.grade_audit_events is
  'Journal append-only : qui a créé/modifié/supprimé quelle note, validations/rouvertures de session, imports Excel.';

create index if not exists grade_audit_events_center_created_idx
  on public.grade_audit_events (center_id, created_at desc);

create index if not exists grade_audit_events_grade_idx
  on public.grade_audit_events (grade_id, created_at desc)
  where grade_id is not null;

create index if not exists grade_audit_events_ue_period_idx
  on public.grade_audit_events (filiere_matiere_id, period_id, created_at desc);

create index if not exists grade_audit_events_groupe_idx
  on public.grade_audit_events (groupe_id, created_at desc)
  where groupe_id is not null;

create index if not exists grade_audit_events_actor_idx
  on public.grade_audit_events (actor_id, created_at desc);

create index if not exists grade_audit_events_batch_idx
  on public.grade_audit_events (batch_id)
  where batch_id is not null;

alter table public.grade_audit_events enable row level security;

revoke all on public.grade_audit_events from anon, authenticated;
grant all on public.grade_audit_events to service_role;
