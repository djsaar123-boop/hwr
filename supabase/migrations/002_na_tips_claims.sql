-- =====================================================================
-- 002 — N/A options, growth tips, profile metadata, result claiming
-- Run in Supabase → SQL Editor after schema.sql + seed.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. "Not applicable" options: excluded from both points and max,
--    so the score is re-normalised over the questions that apply.
-- ---------------------------------------------------------------------
alter table public.options   add column if not exists is_na boolean not null default false;
alter table public.questions add column if not exists tip text;   -- one-line nudge shown in "growth areas"

create or replace function public.fill_answer_snapshot()
returns trigger language plpgsql security definer set search_path = public as $$
declare q record; o record;
begin
  select id, area_id, weight into q from public.questions where id = new.question_id;
  select id, question_id, score_fraction, is_na into o from public.options where id = new.option_id;
  if o.question_id is distinct from new.question_id then
    raise exception 'option does not belong to question';
  end if;
  new.area_id        := q.area_id;
  new.score_fraction := o.score_fraction;
  if o.is_na then
    new.weight := 0;
    new.points := 0;
  else
    new.weight := q.weight;
    new.points := round(q.weight * o.score_fraction, 3);
  end if;
  new.answered_at := now();
  return new;
end $$;

update public.options o
   set is_na = true, score_fraction = 0
  from public.questions q
 where o.question_id = q.id
   and q.title = 'Partner Relationship'
   and o.label ilike 'Not applicable%';

-- ---------------------------------------------------------------------
-- 2. Profiles pick up name/phone passed as sign-up metadata
-- ---------------------------------------------------------------------
create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email,
          nullif(new.raw_user_meta_data->>'full_name', ''),
          nullif(new.raw_user_meta_data->>'phone', ''))
  on conflict (id) do update set
    email     = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone     = coalesce(public.profiles.phone, excluded.phone);
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 3. Claiming: a guest (anonymous) who then logs into an EXISTING account
--    keeps their results. The guest mints a one-time token; after login
--    the real account redeems it and the assessments move over.
-- ---------------------------------------------------------------------
create table if not exists public.assessment_claims (
  token       uuid primary key default gen_random_uuid(),
  from_user   uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.assessment_claims enable row level security;   -- no policies: functions only

create or replace function public.create_assessment_claim()
returns uuid language plpgsql security definer set search_path = public as $$
declare v_token uuid;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is not true then
    raise exception 'only guest sessions can create a claim';
  end if;
  insert into public.assessment_claims (from_user) values (auth.uid()) returning token into v_token;
  return v_token;
end $$;

create or replace function public.redeem_assessment_claim(p_token uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_from uuid; v_count int := 0;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'log in first';
  end if;
  delete from public.assessment_claims
   where token = p_token and created_at > now() - interval '1 day'
   returning from_user into v_from;
  if v_from is null or v_from = auth.uid() then return 0; end if;
  update public.assessments set user_id = auth.uid() where user_id = v_from;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.create_assessment_claim()      to authenticated;
grant execute on function public.redeem_assessment_claim(uuid)  to authenticated;

-- ---------------------------------------------------------------------
-- 4. Growth tips (admin-editable afterwards)
-- ---------------------------------------------------------------------
update public.questions q set tip = t.tip
from (values
  ('Plant Power Diversity',    'Add one new plant to your plate each day — herbs, spices and seeds all count.'),
  ('Gut Health Reality Check', 'More fibre, more water and a steady morning routine. Your gut loves rhythm.'),
  ('Move It or Lose It',       'Pick the pillar you skip most (stamina, stretch or strength) and give it 20 minutes twice a week.'),
  ('Breathe Like You Mean It', 'Five slow belly breaths before each meal, hand on your stomach, feeling it rise.'),
  ('Hydration Station',        'Keep a bottle in sight and sip through the day — steady sips beat big gulps.'),
  ('Sunshine Vitamin',         'Take your first coffee or call outside. Fifteen minutes of morning sun goes a long way.'),
  ('Sleep Like a Baby',        'Same bedtime, screens dimmed an hour before, a cool dark room. Guard your first sleep cycle.'),
  ('Fresh Air Enthusiast',     'Swap one indoor call or errand a day for a walk outside.'),
  ('Oral Care Superstar',      'Add flossing or oil pulling three nights a week to start.'),
  ('Money Mindset',            'Notice the feeling money brings up this week. Naming it is the first step to changing it.'),
  ('Financial Safety Net',     'Automate a small transfer to a separate emergency account on payday.'),
  ('Income Diversity',         'List one skill people already ask you for — that''s the seed of a second stream.'),
  ('Workplace Vibes',          'Ask for ownership of one small project. Autonomy grows from small yeses.'),
  ('Creative Flow',            'Book 30 minutes this week to make something with no outcome attached.'),
  ('Rest & Recharge',          'Schedule "nothing" like a meeting: 20 minutes, no phone, no agenda.'),
  ('Self-Relationship Status', 'When your mind runs ahead, name three things you can see right now.'),
  ('Finding My Uniqueness',    'Write down three things you do differently from everyone you know — and keep doing them.'),
  ('Judgment Detox',           'Catch one judgment a day and swap it for curiosity: "I wonder why…"'),
  ('Partner Relationship',     'Ten undistracted minutes a day together, phones away, changes the tone of a relationship.'),
  ('Family Foundation',        'Reach out to one family member this week just to ask how they really are.'),
  ('Friend Squad',             'Message one friend you miss today. Keep it simple.'),
  ('Life Flow State',          'Notice when time disappears for you this week, and make room for more of that.'),
  ('Universal Connection',     'Spend five quiet minutes in nature or stillness and just notice what''s there.')
) as t(title, tip)
where q.title = t.title and q.tip is null;

-- check: expect 1 N/A option and 23 tips
select (select count(*) from public.options where is_na) as na_options,
       (select count(*) from public.questions where tip is not null) as questions_with_tips;
