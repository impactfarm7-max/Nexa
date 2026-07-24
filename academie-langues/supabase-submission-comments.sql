alter table public.mission_submissions
  add column if not exists admin_comment text,
  add column if not exists admin_comment_at timestamptz;

create index if not exists mission_submissions_admin_comment_at_idx
  on public.mission_submissions(admin_comment_at);
