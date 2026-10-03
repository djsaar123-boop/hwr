-- =====================================================================
-- HWR — Holistic Wellbeing Report : database schema
-- Run once in Supabase → SQL Editor (then run seed.sql).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('user', 'coach', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  role        public.user_role not null default 'user',
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Keep profiles in sync with auth.users (covers anonymous users and later email linking)
create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_auth_user();

-- ---------------------------------------------------------------------
-- Question bank (admin-editable)
-- ---------------------------------------------------------------------
create table if not exists public.areas (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,               -- "Health"
  title       text,                        -- "Health Foundation"
  emoji       text,
  tagline     text,
  color       text not null default '#5E9C76',
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  area_id      uuid not null references public.areas(id) on delete restrict,
  title        text not null,              -- "Plant Power Diversity"
  short_label  text not null,              -- "Plant Diversity" (slim card / scorecard)
  emoji        text,
  fact         text,                       -- "Did you know" hook
  prompt       text not null,              -- the actual question
  weight       numeric(5,2) not null check (weight > 0),
  sort_order   int  not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists questions_area_idx on public.questions(area_id, sort_order);

create table if not exists public.options (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references public.questions(id) on delete cascade,
  label           text not null,
  emoji           text,
  score_fraction  numeric(4,3) not null check (score_fraction between 0 and 1),
  sort_order      int  not null default 0,
  is_active       boolean not null default true
);
create index if not exists options_question_idx on public.options(question_id, sort_order);

create table if not exists public.score_bands (
  id          uuid primary key default gen_random_uuid(),
  min_score   numeric(4,2) not null unique,  -- inclusive lower bound, out of 10
  label       text not null,
  emoji       text,
  message     text
);

create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------
create table if not exists public.assessments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status        text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  total_score   numeric(4,1),     -- overall, out of 10
  raw_points    numeric(6,3),
  max_points    numeric(6,3),
  band_label    text,
  band_emoji    text,
  area_scores   jsonb,            -- [{area_id, slug, name, color, score, max, pct}]
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index if not exists assessments_user_idx on public.assessments(user_id, started_at desc);

create table if not exists public.assessment_answers (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   uuid not null references public.assessments(id) on delete cascade,
  question_id     uuid not null references public.questions(id) on delete restrict,
  option_id       uuid not null references public.options(id) on delete restrict,
  -- snapshots, filled by trigger so later admin edits don't rewrite history
  area_id         uuid,
  weight          numeric(5,2),
  score_fraction  numeric(4,3),
  points          numeric(6,3),
  answered_at     timestamptz not null default now(),
  unique (assessment_id, question_id)
);

create or replace function public.fill_answer_snapshot()
returns trigger language plpgsql security definer set search_path = public as $$
declare q record; o record;
begin
  select id, area_id, weight into q from public.questions where id = new.question_id;
  select id, question_id, score_fraction into o from public.options where id = new.option_id;
  if o.question_id is distinct from new.question_id then
    raise exception 'option does not belong to question';
  end if;
  new.area_id        := q.area_id;
  new.weight         := q.weight;
  new.score_fraction := o.score_fraction;
  new.points         := round(q.weight * o.score_fraction, 3);
  new.answered_at    := now();
  return new;
end $$;

drop trigger if exists answers_snapshot on public.assessment_answers;
create trigger answers_snapshot
  before insert or update on public.assessment_answers
  for each row execute function public.fill_answer_snapshot();

-- Score an assessment (only the owner can call it; only active questions are required)
create or replace function public.complete_assessment(p_assessment_id uuid)
returns public.assessments
language plpgsql security definer set search_path = public as $$
declare
  a        public.assessments;
  v_total  numeric;
  v_max    numeric;
  v_score  numeric;
  v_areas  jsonb;
  b        record;
begin
  select * into a from public.assessments
   where id = p_assessment_id and user_id = auth.uid();
  if not found then raise exception 'assessment not found'; end if;

  if exists (
    select 1 from public.questions q
      join public.areas ar on ar.id = q.area_id
     where q.is_active and ar.is_active
       and not exists (select 1 from public.assessment_answers aa
                        where aa.assessment_id = p_assessment_id and aa.question_id = q.id)
  ) then
    raise exception 'assessment incomplete';
  end if;

  with per_area as (
    select ar.id, ar.slug, ar.name, ar.color, ar.sort_order,
           sum(aa.points) as score, sum(aa.weight) as max
      from public.assessment_answers aa
      join public.areas ar on ar.id = aa.area_id
     where aa.assessment_id = p_assessment_id
     group by ar.id
  )
  select coalesce(sum(score), 0),
         coalesce(sum(max), 0),
         jsonb_agg(jsonb_build_object(
           'area_id', id, 'slug', slug, 'name', name, 'color', color,
           'score', round(score, 2), 'max', max,
           'pct', round(score / nullif(max, 0) * 100)
         ) order by sort_order)
    into v_total, v_max, v_areas
    from per_area;

  v_score := round(v_total / nullif(v_max, 0) * 10, 1);

  select label, emoji into b from public.score_bands
   where min_score <= coalesce(v_score, 0)
   order by min_score desc limit 1;

  update public.assessments set
    status       = 'completed',
    raw_points   = v_total,
    max_points   = v_max,
    total_score  = v_score,
    band_label   = b.label,
    band_emoji   = b.emoji,
    area_scores  = v_areas,
    completed_at = now()
  where id = p_assessment_id
  returning * into a;

  return a;
end $$;

grant execute on function public.complete_assessment(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.areas               enable row level security;
alter table public.questions           enable row level security;
alter table public.options             enable row level security;
alter table public.score_bands         enable row level security;
alter table public.app_settings        enable row level security;
alter table public.assessments         enable row level security;
alter table public.assessment_answers  enable row level security;

-- Question bank: public read of active rows, admin full access
drop policy if exists "read active areas" on public.areas;
create policy "read active areas" on public.areas for select using (is_active or public.is_admin());
drop policy if exists "admin write areas" on public.areas;
create policy "admin write areas" on public.areas for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read active questions" on public.questions;
create policy "read active questions" on public.questions for select using (is_active or public.is_admin());
drop policy if exists "admin write questions" on public.questions;
create policy "admin write questions" on public.questions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read active options" on public.options;
create policy "read active options" on public.options for select using (is_active or public.is_admin());
drop policy if exists "admin write options" on public.options;
create policy "admin write options" on public.options for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read bands" on public.score_bands;
create policy "read bands" on public.score_bands for select using (true);
drop policy if exists "admin write bands" on public.score_bands;
create policy "admin write bands" on public.score_bands for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read settings" on public.app_settings;
create policy "read settings" on public.app_settings for select using (true);
drop policy if exists "admin write settings" on public.app_settings;
create policy "admin write settings" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

-- Profiles: own row (+ admin reads all). Users may edit only name/phone.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "admin profile update" on public.profiles;
create policy "admin profile update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Assessments: owner reads/creates/deletes own; scoring happens only via complete_assessment()
drop policy if exists "own assessments read" on public.assessments;
create policy "own assessments read" on public.assessments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "own assessments insert" on public.assessments;
create policy "own assessments insert" on public.assessments for insert with check (user_id = auth.uid());
drop policy if exists "own assessments delete" on public.assessments;
create policy "own assessments delete" on public.assessments for delete using (user_id = auth.uid());

revoke insert, update on public.assessments from anon, authenticated;
grant insert (id, user_id) on public.assessments to authenticated;

-- Answers: owner of an in-progress assessment can upsert; trigger fills the scoring columns
drop policy if exists "own answers read" on public.assessment_answers;
create policy "own answers read" on public.assessment_answers for select using (
  public.is_admin() or exists (select 1 from public.assessments a
                                where a.id = assessment_id and a.user_id = auth.uid()));
drop policy if exists "own answers write" on public.assessment_answers;
create policy "own answers write" on public.assessment_answers for insert with check (
  exists (select 1 from public.assessments a
           where a.id = assessment_id and a.user_id = auth.uid() and a.status = 'in_progress'));
drop policy if exists "own answers update" on public.assessment_answers;
create policy "own answers update" on public.assessment_answers for update using (
  exists (select 1 from public.assessments a
           where a.id = assessment_id and a.user_id = auth.uid() and a.status = 'in_progress'));

revoke insert, update on public.assessment_answers from anon, authenticated;
grant insert (assessment_id, question_id, option_id) on public.assessment_answers to authenticated;
-- upsert (on conflict … do update) re-sends all three columns; RLS still pins the row to the owner
grant update (assessment_id, question_id, option_id) on public.assessment_answers to authenticated;
