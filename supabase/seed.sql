-- =====================================================================
-- HWR seed — question bank from HWR_v3.pdf (framework: H 3 · W 3 · R 4 = 10)
-- Run AFTER schema.sql. Safe to re-run only on an empty question bank.
-- Option order = Tier 1 → Tier 4  →  score_fraction 1, 0.667, 0.333, 0
-- =====================================================================

insert into public.areas (slug, name, title, emoji, tagline, color, sort_order) values
  ('health',       'Health',        'Health Foundation',          '🏃', 'Your body is your temple, but even temples need a good cleaning crew!',              '#5E9C76', 1),
  ('wealth',       'Wealth',        'Wealth & Work',              '💰', 'Money can''t buy happiness, but poverty can definitely rent you some stress!',      '#C9973F', 2),
  ('relationship', 'Relationships', 'Relationships & Inner World','💕', 'We''re only as healthy as our relationships — including the one with ourselves!',   '#C46B78', 3)
on conflict (slug) do nothing;

insert into public.score_bands (min_score, label, emoji, message) values
  (8.5, 'Radiant & Thriving',   '🌟', 'You''re living it. Now it''s about protecting what works.'),
  (7.0, 'Flourishing',          '🌈', 'Strong foundations with a few threads worth pulling.'),
  (5.5, 'Building Momentum',    '🌱', 'You''re not starting from zero — you''re building from strength.'),
  (4.0, 'Finding Your Footing', '🧭', 'The picture is clearer now, and clarity is the first step.'),
  (0.0, 'Ready to Awaken',      '🕯️', 'Every journey starts somewhere. This is a beautiful place to begin.')
on conflict (min_score) do nothing;

insert into public.app_settings (key, value) values
  ('coach_whatsapp', jsonb_build_object(
     'number',  '91XXXXXXXXXX',
     'message', 'Hi! I just took the HWR assessment and scored {score}/10 ({band}). Health {health}, Wealth {wealth}, Relationships {relationship}. I''d love to talk to a coach.'))
on conflict (key) do nothing;

-- temporary helper ----------------------------------------------------
create or replace function public._seed_q(
  p_area text, p_order int, p_title text, p_label text, p_emoji text,
  p_fact text, p_prompt text, p_weight numeric, p_opt_emoji text[], p_opt_label text[]
) returns void language plpgsql as $$
declare v_q uuid; v_frac numeric[] := array[1, 0.667, 0.333, 0]; i int;
begin
  insert into public.questions (area_id, sort_order, title, short_label, emoji, fact, prompt, weight)
  select id, p_order, p_title, p_label, p_emoji, p_fact, p_prompt, p_weight
    from public.areas where slug = p_area
  returning id into v_q;
  for i in 1..array_length(p_opt_label, 1) loop
    insert into public.options (question_id, sort_order, emoji, label, score_fraction)
    values (v_q, i, p_opt_emoji[i], p_opt_label[i], v_frac[i]);
  end loop;
end $$;

-- 🏃 HEALTH — 3.0 -----------------------------------------------------
select public._seed_q('health', 1, 'Plant Power Diversity', 'Plant Diversity', '🌈',
  'Research shows you need a minimum of 35 different plant-based foods weekly for optimal gut microbiome diversity (American Gut Project, 2018)!',
  'How many different plant-based foods do you eat weekly? (fruits, vegetables, nuts, seeds, legumes, herbs)', 0.4,
  array['🎨','🌈','🟡','⚪'],
  array['Plant goddess (50+ varieties)','Great diversity (35–49 varieties)','Getting there (20–34 varieties)','Plant beginner (under 20 varieties)']);

select public._seed_q('health', 2, 'Gut Health Reality Check', 'Gut Health', '💩',
  'Bristol Stool Chart — yes, we''re going there! Your poop is basically your gut''s report card.',
  'What''s your usual bathroom situation?', 0.2,
  array['🥒','🌰','🌊','🤷'],
  array['Type 3–4: Perfect sausages (Bristol Chart gold standard)','Type 1–2: Hard nuggets (need more fibre, friend!)','Type 5–7: Too loose/liquid (time for some gut love)','I don''t pay attention (ignorance isn''t bliss here!)']);

select public._seed_q('health', 3, 'Move It or Lose It', 'Movement', '🏋️',
  'Complete fitness needs 3 pillars: Stamina (cardio), Stretching (flexibility), and Strength (resistance). Your ancestors got all 3 naturally!',
  'Weekly exercise including all 3 types:', 0.4,
  array['💪','🚶','😅','🛋️'],
  array['7+ hours with stamina + stretching + strength combo (Triple threat!)','4–6 hours, covering 2–3 exercise types','1–3 hours, mostly one type of exercise','What''s exercise? (Time to design your 3-pillar routine!)']);

select public._seed_q('health', 4, 'Breathe Like You Mean It', 'Breathing', '🫁',
  'Most people use only 30% of their lung capacity — you''re missing out!',
  'How deep do you breathe?', 0.3,
  array['🧘','🌬️','😤','🤷'],
  array['Down till belly','Occasional belly breathing','Till chest','Breathing is automatic, right?']);

select public._seed_q('health', 5, 'Hydration Station', 'Hydration', '💧',
  'Your brain is 75% water — dehydration literally makes you less smart!',
  'Active water intake + quality awareness:', 0.3,
  array['🌊','💧','🥤','🏜️'],
  array['Actively sipping water through the day + I''m grateful for it','Decent quality','<1.5 litres, taking mostly other beverages','Under 1 litre daily (Please drink more!)']);

select public._seed_q('health', 6, 'Sunshine Vitamin', 'Sunlight', '☀️',
  'Vitamin D deficiency affects 1 billion people globally — don''t be a statistic!',
  'Daily sun exposure (without sunscreen, for vitamin D synthesis):', 0.3,
  array['🌞','☀️','🌤️','🧛'],
  array['20+ minutes daily (Optimal!)','15–20 minutes most days','10–15 minutes occasionally','Under 10 minutes (Vitamin D deficient zone)']);

select public._seed_q('health', 7, 'Sleep Like a Baby', 'Sleep Quality', '😴',
  'Fun fact: Sleep literally cleans your brain — like a dishwasher for your neurons!',
  'Average nightly sleep + quality:', 0.5,
  array['🛌','😴','⏰','🦉'],
  array['7–9 hours of blissful sleep','7–9 hours, but restless','5–7 hours (surviving on fumes)','What is sleep?']);

select public._seed_q('health', 8, 'Fresh Air Enthusiast', 'Fresh Air', '🌬️',
  'Indoor air can be 5x more polluted than outdoor air. Step outside!',
  'Weekly outdoor time in nature:', 0.4,
  array['🏞️','🌳','🌿','🏢'],
  array['10+ hours (Nature child)','5–10 hours (Good balance)','1–4 hours (Could do better)','What''s outside?']);

select public._seed_q('health', 9, 'Oral Care Superstar', 'Oral Care', '🦷',
  'Your mouth is the gateway to your body — 90% of diseases show oral symptoms first!',
  'Oral hygiene routine:', 0.2,
  array['✨','🦷','😬','🤫'],
  array['Brush twice after meals + floss / oil pulling regularly (Dentist''s dream patient)','Brush twice after meals + floss / oil pulling occasionally','Brush twice after meals, never floss / oil pulling','Basic morning brushing only (once a day)']);

-- 💰 WEALTH & WORK — 3.0 ----------------------------------------------
select public._seed_q('wealth', 1, 'Money Mindset', 'Money Mindset', '💭',
  'Your relationship with money affects every financial decision you make!',
  'When you think about money, you feel:', 0.7,
  array['🌟','😌','😰','😵‍💫'],
  array['Abundant (Money flows easily)','Secure (I''ve got this handled)','Anxious (Always worrying)','Avoidant (La la la, can''t hear you)']);

select public._seed_q('wealth', 2, 'Financial Safety Net', 'Safety Net', '🏦',
  'Financial stress literally rewires your brain for anxiety!',
  'Emergency fund reality:', 0.5,
  array['💎','💳','💸','🤡'],
  array['12+ months expenses saved (Financial fortress!)','6–12 months covered','3–6 months saved','Under 3 months (Time to build that safety net!)']);

select public._seed_q('wealth', 3, 'Income Diversity', 'Income Streams', '🎯',
  'The average millionaire has 7 income streams. How''s your portfolio?',
  'Number of income sources:', 0.3,
  array['🌊','💼','💰','🔍'],
  array['3+ streams (Diversification rocks!)','2 sources (Smart move)','1 main source (All eggs, one basket)','Currently seeking income']);

select public._seed_q('wealth', 4, 'Workplace Vibes', 'Work Life', '🏢',
  'You spend 1/3 of your life working — better make it count!',
  'At work, I feel:', 0.5,
  array['🚀','🤝','😐','😩'],
  array['Ownership + autonomy (Dream job territory)','Trusted team member','It pays the bills','Stressed and undervalued']);

select public._seed_q('wealth', 5, 'Creative Flow', 'Creativity', '🎨',
  'Creativity isn''t just for artists — it''s brain food for everyone!',
  'Weekly creative time:', 0.4,
  array['🎭','🖌️','✏️','📺'],
  array['10+ hours (Renaissance soul)','5–10 hours (Nice balance)','1–4 hours (Could use more)','Does watching Netflix count?']);

select public._seed_q('wealth', 6, 'Rest & Recharge', 'Rest', '🛋️',
  'Doing nothing is actually doing something — it''s called restoration!',
  'Weekly "doing absolutely nothing" time:', 0.6,
  array['🧘','😌','⚡','🏃'],
  array['10+ hours (Zen master)','5–10 hours (Healthy balance)','1–4 hours (Go-go-go lifestyle)','Rest is for the weak! (Please rest)']);

-- 💕 RELATIONSHIPS & INNER WORLD — 4.0 -------------------------------
select public._seed_q('relationship', 1, 'Self-Relationship Status', 'Inner Dialogue', '🪞',
  'The most important relationship you''ll ever have!',
  'Your inner dialogue is mostly:', 0.4,
  array['🌅','📚','📖','🌪️'],
  array['Present moment awareness','Future planning / Past reflection mode','Regret mode','Mental chaos (thoughts everywhere!)']);

select public._seed_q('relationship', 2, 'Finding My Uniqueness', 'Uniqueness', '✨',
  'You were born to stand out, not fit in. How connected are you to your authentic self?',
  'My relationship with my uniqueness:', 0.4,
  array['🌟','🪞','👥','🎭'],
  array['I celebrate my uniqueness (Authentically me!)','I''m aware I''m unique, but still figuring it out','I often compare myself to others','I copy others more than expressing myself']);

select public._seed_q('relationship', 3, 'Judgment Detox', 'Judgment', '⚖️',
  'Holding onto judgments is like drinking poison and expecting others to suffer!',
  'Labels and judgments about others/yourself:', 0.4,
  array['🕊️','🤔','😤','👨‍⚖️'],
  array['Rarely judge (Zen level achieved)','Sometimes slip into judgment','Often judgmental (Working on it)','I''m basically a judgment factory']);

-- NOTE: Tier 4 here is "Not applicable" — see PLAN.md open question #1
select public._seed_q('relationship', 4, 'Partner Relationship', 'Partner', '💑',
  'Romantic relationships can either multiply your joy or divide your peace!',
  'If you have a partner, your relationship feels:', 0.6,
  array['💕','😊','😬','🚫'],
  array['Deeply connected & collaborative (Goals!)','Generally positive & supportive','It''s complicated (Isn''t it always?)','Not applicable / Single by choice']);

select public._seed_q('relationship', 5, 'Family Foundation', 'Family', '👪',
  'Family relationships shape our attachment patterns for life!',
  'Overall family relationships (parents, children, siblings, relatives):', 0.4,
  array['🥰','😊','😐','😔'],
  array['Grateful and connected (8–10/10)','Pretty good overall (5–7/10)','It''s complicated (3–4/10)','Challenging relationships (1–2/10)']);

select public._seed_q('relationship', 6, 'Friend Squad', 'Friends', '👯',
  'Good friends are like good wine — they get better with time and help you forget your troubles!',
  'Friend relationships:', 0.4,
  array['🎉','🤗','😕','😞'],
  array['Amazing support system (8–10/10)','Solid friendships (5–7/10)','Few but okay friends (3–4/10)','Struggling with friendships (1–2/10)']);

select public._seed_q('relationship', 7, 'Life Flow State', 'Life Flow', '🌊',
  'When you''re in flow, time disappears and magic happens. How often do you experience this?',
  'Overall life flow experience (1–10, where 10 = constantly in flow):', 0.7,
  array['🌊','😌','😅','🌪️'],
  array['8–10 (Life flows like a river)','6–7 (Good rhythm most days)','4–5 (Some flow, some friction)','1–3 (Fighting upstream constantly)']);

select public._seed_q('relationship', 8, 'Universal Connection', 'Oneness', '🌌',
  'Feeling connected to something bigger than yourself is linked to better mental health and life satisfaction!',
  'Sense of universal oneness:', 0.7,
  array['✨','🙏','🤷','🌀'],
  array['Strong universal connection all the time','Sometimes feel connected to something greater','Questioning/exploring my unknown side','Feeling disconnected from all']);

drop function public._seed_q(text, int, text, text, text, text, text, numeric, text[], text[]);

-- sanity check: expect health 3.00 / wealth 3.00 / relationship 4.00, 23 questions, 92 options
select a.slug, count(q.*) as questions, sum(q.weight) as max_points
  from public.areas a join public.questions q on q.area_id = a.id
 group by a.slug, a.sort_order order by a.sort_order;
