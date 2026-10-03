# Supabase setup (≈ 10 minutes)

1. **Create the project.** Go to [supabase.com](https://supabase.com) → New project.
   - Name: `hwr` · Region: **South Asia (Mumbai)** if most users are in India · Plan: Free
   - Save the database password in your password manager.

2. **Turn on the sign-in methods.** Go to Authentication → *Sign In / Providers*:
   - **Allow anonymous sign-ins: ON.** This lets people take the assessment without signing up.
   - **Email: ON.** Keep "Confirm email" on.
   - Google (optional, can wait until phase 4).

3. **Set the URLs.** Go to Authentication → *URL Configuration*:
   - Site URL: `http://localhost:3000` (change it to the production URL at launch)
   - Redirect URLs: add `http://localhost:3000/**`

4. **Create the tables.** Go to SQL Editor → New query:
   - Paste and run `supabase/schema.sql`
   - Then paste and run `supabase/seed.sql`. The last result should show
     **health 9 / 3.00 · wealth 6 / 3.00 · relationship 8 / 4.00**.
   - Then paste and run `supabase/migrations/002_na_tips_claims.sql`. The last result should show
     **na_options 1 · questions_with_tips 23**.

5. **Get the keys.** Go to Project Settings → *API Keys* (on older dashboards, Settings → API):
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (on older dashboards: `anon` key) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Secret key (on older dashboards: `service_role`) → `SUPABASE_SERVICE_ROLE_KEY`. This key is **server-only. Never put it in
     client code and never paste it into chat.**

   Put the keys in a file named `.env.local` at the project root yourself. I'll create `.env.example` and
   make sure `.env.local` is git-ignored.

6. **Make yourself admin** (after you sign up once in the app). Run this in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

7. **Set the coach's WhatsApp number.** You can do this later from `/admin/settings`, or now:
   ```sql
   update public.app_settings
      set value = jsonb_set(value, '{number}', '"919876543210"')
    where key = 'coach_whatsapp';
   ```
   The number goes in international format with no `+`, spaces, or leading zero.

**Email limits:** Supabase's built-in email sender only allows a few emails per hour, which is fine for testing.
Before launch, set up custom SMTP under Authentication → *Emails* → SMTP Settings. Resend's free tier
works well. Otherwise sign-up and login links will stop arriving once you have real traffic.

**Free-tier note:** the project pauses after about a week with no traffic. Unpause it from the dashboard. Before
launch, upgrade to Pro or add a keep-alive ping.
