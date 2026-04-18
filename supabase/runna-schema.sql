-- Runna clone tables.
--
-- Keyed by runner_id (plain text, matches the existing app's localStorage
-- user_name). No RLS — this is the same trust model as the rest of the app.
-- Tighten later when real auth lands.

create table if not exists runner_profiles (
  id text primary key,
  profile jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists training_plans (
  id text primary key,
  runner_id text not null references runner_profiles(id) on delete cascade,
  plan jsonb not null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists training_plans_runner_idx
  on training_plans (runner_id, active);

-- OAuth tokens per provider per runner. Refresh tokens are long-lived, so
-- keep them secret — do not expose via NEXT_PUBLIC_*.
create table if not exists runna_integrations (
  runner_id text not null,
  provider text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  extra jsonb,
  updated_at timestamptz default now(),
  primary key (runner_id, provider)
);

-- Strava activities we've imported, keyed by their Strava id. matched_workout_id
-- is the Runna workout we matched this activity to (if any).
create table if not exists runna_activities (
  id text primary key,
  runner_id text not null,
  start_date timestamptz not null,
  distance_m double precision,
  moving_time_sec integer,
  avg_pace_sec_per_km integer,
  activity_type text,
  matched_workout_id text,
  raw jsonb,
  created_at timestamptz default now()
);

create index if not exists runna_activities_runner_idx
  on runna_activities (runner_id, start_date desc);
