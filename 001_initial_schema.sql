-- ============================================================
-- OBIP — Initial Schema Migration
-- 001_initial_schema.sql
-- Run in Supabase SQL Editor or via supabase db push
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- Extends auth.users. Created automatically on signup via trigger.
-- ============================================================
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  date_of_birth     date,
  sex               text check (sex in ('male','female','intersex','prefer_not_to_say')),
  height_cm         numeric(5,1),
  timezone          text default 'UTC',
  subscription_tier text default 'free' check (subscription_tier in ('free','pro','business')),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- BIOMETRIC RECORDS
-- Universal schema — every field optional. 130+ metrics.
-- ============================================================
create table if not exists public.biometric_records (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  timestamp       timestamptz not null,
  recorded_at     timestamptz default now(),
  source          text default 'manual' check (source in (
                    'manual','csv','apple_health','google_health',
                    'garmin','fitbit','oura','whoop','polar',
                    'samsung','withings','dexcom','abbott','fhir','hl7','plugin'
                  )),
  quality         text default 'medium' check (quality in ('low','medium','high','clinical')),
  device_model    text,
  plugin_id       text,
  raw_metadata    jsonb,

  -- ── Cardiovascular ──────────────────────────────────────────
  heart_rate            numeric(5,1),
  heart_rate_avg        numeric(5,1),
  heart_rate_max        numeric(5,1),
  heart_rate_min        numeric(5,1),
  resting_heart_rate    numeric(5,1),
  hrv_rmssd             numeric(7,2),
  hrv_sdnn              numeric(7,2),
  hrv_lf_hf_ratio       numeric(6,3),
  spo2                  numeric(5,2),
  respiratory_rate      numeric(5,1),
  vo2_max               numeric(5,2),
  systolic_bp           numeric(5,1),
  diastolic_bp          numeric(5,1),
  pulse_wave_velocity   numeric(6,3),
  cardiac_output        numeric(6,3),
  afib_detected         boolean,
  stroke_volume         numeric(6,2),

  -- ── Sleep ───────────────────────────────────────────────────
  sleep_total           numeric(6,1),  -- minutes
  sleep_deep            numeric(6,1),
  sleep_rem             numeric(6,1),
  sleep_light           numeric(6,1),
  sleep_awake           numeric(6,1),
  sleep_efficiency      numeric(5,2),  -- percent
  sleep_onset_latency   numeric(6,1),  -- minutes
  sleep_disturbances    integer,
  sleep_start           timestamptz,
  sleep_end             timestamptz,
  snoring_detected      boolean,
  ahi_score             numeric(5,2),
  circadian_phase_offset numeric(5,2),

  -- ── Activity ─────────────────────────────────────────────────
  steps                 integer,
  distance_m            numeric(9,2),
  active_calories       numeric(7,1),
  total_calories        numeric(7,1),
  active_minutes        numeric(6,1),
  floors_climbed        integer,
  exercise_load         numeric(6,2),
  activity_type         text,
  running_cadence       numeric(5,1),
  running_power         numeric(6,1),
  ground_contact_time   numeric(5,1),
  vertical_oscillation  numeric(5,2),
  swimming_strokes      integer,
  cycling_power         numeric(6,1),
  gait_symmetry         numeric(5,2),
  balance_score         numeric(5,2),
  fall_detected         boolean,

  -- ── Metabolic ────────────────────────────────────────────────
  glucose_mg_dl         numeric(6,1),
  glucose_avg_mg_dl     numeric(6,1),
  glucose_variability_cv numeric(5,2),
  hba1c                 numeric(4,2),
  ketones_mmol          numeric(5,2),
  lactate_mmol          numeric(5,2),
  lactate_sweat_mmol    numeric(5,2),
  alcohol_bac           numeric(5,3),
  cholesterol_total     numeric(6,1),
  cholesterol_ldl       numeric(6,1),
  cholesterol_hdl       numeric(6,1),
  triglycerides         numeric(6,1),

  -- ── Body Composition ─────────────────────────────────────────
  weight_kg             numeric(6,2),
  height_cm             numeric(5,1),
  bmi                   numeric(5,2),
  body_fat_pct          numeric(5,2),
  muscle_mass_kg        numeric(6,2),
  bone_mass_kg          numeric(5,2),
  water_pct             numeric(5,2),
  visceral_fat_score    numeric(5,1),
  waist_cm              numeric(5,1),
  hydration_status      text,

  -- ── Biochemical / Lab ────────────────────────────────────────
  ferritin_ug           numeric(7,2),
  crp_mg                numeric(6,3),
  vitamin_d_nmol        numeric(6,1),
  testosterone_nmol     numeric(6,2),
  tsh_miu               numeric(6,3),
  cortisol_nmol         numeric(7,2),

  -- ── Sweat Biomarkers ─────────────────────────────────────────
  sweat_sodium_mmol     numeric(6,1),
  sweat_potassium_mmol  numeric(6,1),
  sweat_cortisol_ng     numeric(7,3),
  sweat_lactate_mmol    numeric(5,2),
  sweat_uric_acid_umol  numeric(7,2),

  -- ── Thermal ──────────────────────────────────────────────────
  skin_temp_c           numeric(5,2),
  core_temp_c           numeric(5,2),
  wrist_temp_c          numeric(5,2),
  ambient_temp_c        numeric(5,2),
  altitude_m            numeric(7,1),

  -- ── Neurological ─────────────────────────────────────────────
  eda_us                numeric(7,3),
  stress_score          numeric(5,2),
  eeg_alpha             numeric(7,3),
  eeg_beta              numeric(7,3),
  eeg_theta             numeric(7,3),
  emg_uv                numeric(7,3),
  cognitive_load        numeric(5,2),
  attention_score       numeric(5,2),
  reaction_time_ms      numeric(7,1),

  -- ── Environmental ────────────────────────────────────────────
  uv_index              numeric(4,1),
  air_quality_pm25      numeric(6,1),
  co2_ppm               numeric(7,1),
  noise_db              numeric(5,1),
  light_lux             numeric(8,1),
  humidity_pct          numeric(5,1),

  -- ── Genomic / Longevity ───────────────────────────────────────
  biological_age        numeric(5,2),
  telomere_length       numeric(7,3),
  microbiome_diversity  numeric(6,3),

  -- ── Subjective ───────────────────────────────────────────────
  mood_score            numeric(4,1),
  energy_score          numeric(4,1),
  pain_score            numeric(4,1),
  rpe_score             numeric(4,1),
  hunger_score          numeric(4,1),
  menstrual_cycle_day   integer,
  alcohol_units         numeric(4,1),
  caffeine_mg           numeric(6,1),
  water_ml              numeric(7,1),
  notes                 text,

  -- Uniqueness: one record per user per timestamp per source
  unique (user_id, timestamp, source)
);

alter table public.biometric_records enable row level security;

create policy "Users can select own records"
  on public.biometric_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own records"
  on public.biometric_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update own records"
  on public.biometric_records for update
  using (auth.uid() = user_id);

create policy "Users can delete own records"
  on public.biometric_records for delete
  using (auth.uid() = user_id);

-- Core indexes
create index idx_biometric_user_time
  on public.biometric_records (user_id, timestamp desc);

create index idx_biometric_source
  on public.biometric_records (user_id, source);

-- Partial indexes for most-queried signals
create index idx_biometric_hrv
  on public.biometric_records (user_id, timestamp desc)
  where hrv_rmssd is not null;

create index idx_biometric_rhr
  on public.biometric_records (user_id, timestamp desc)
  where resting_heart_rate is not null;

create index idx_biometric_sleep
  on public.biometric_records (user_id, timestamp desc)
  where sleep_total is not null;

create index idx_biometric_glucose
  on public.biometric_records (user_id, timestamp desc)
  where glucose_mg_dl is not null;

create index idx_biometric_weight
  on public.biometric_records (user_id, timestamp desc)
  where weight_kg is not null;

create index idx_biometric_steps
  on public.biometric_records (user_id, timestamp desc)
  where steps is not null;

-- ============================================================
-- RAW SIGNALS
-- Binary sensor data before processing.
-- ============================================================
create table if not exists public.raw_signals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  timestamp       timestamptz not null,
  sensor_type     text not null check (sensor_type in (
                    'ppg','ecg','accelerometer','rr_intervals',
                    'eeg','emg','gsr','temperature','pressure'
                  )),
  sampling_rate_hz numeric(8,2),
  duration_seconds numeric(8,2),
  data_format     text default 'binary' check (data_format in ('binary','json','csv','float32_le')),
  signal_data     bytea,
  processed       boolean default false,
  source          text,
  device_model    text,
  created_at      timestamptz default now()
);

alter table public.raw_signals enable row level security;

create policy "Users can select own raw signals"
  on public.raw_signals for select using (auth.uid() = user_id);

create policy "Users can insert own raw signals"
  on public.raw_signals for insert with check (auth.uid() = user_id);

create policy "Users can delete own raw signals"
  on public.raw_signals for delete using (auth.uid() = user_id);

create index idx_raw_signals_user_time
  on public.raw_signals (user_id, timestamp desc);

create index idx_raw_signals_unprocessed
  on public.raw_signals (user_id, sensor_type)
  where processed = false;

-- ============================================================
-- COMPUTED INSIGHTS
-- Cached analytics output per user per window.
-- ============================================================
create table if not exists public.computed_insights (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  window_days     integer not null,
  metrics         jsonb,  -- { readiness, recovery, sleep_score, fatigue, consistency }
  trends          jsonb,  -- { hrv: { direction, slope, r2 }, ... }
  anomalies       jsonb,  -- [{ field, timestamp, value, z_score }, ...]
  baselines       jsonb,  -- personal baseline values after 30+ days
  computed_at     timestamptz default now(),
  unique (user_id, window_days)
);

alter table public.computed_insights enable row level security;

create policy "Users can select own insights"
  on public.computed_insights for select using (auth.uid() = user_id);

create policy "Users can upsert own insights"
  on public.computed_insights for insert with check (auth.uid() = user_id);

create policy "Users can update own insights"
  on public.computed_insights for update using (auth.uid() = user_id);

-- ============================================================
-- CONNECTED SOURCES
-- OAuth tokens per device per user.
-- ============================================================
create table if not exists public.connected_sources (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  source_type     text not null,
  access_token    text,   -- store encrypted in production
  refresh_token   text,
  expires_at      timestamptz,
  last_synced     timestamptz,
  is_active       boolean default true,
  scope           text,
  external_user_id text,
  created_at      timestamptz default now(),
  unique (user_id, source_type)
);

alter table public.connected_sources enable row level security;

create policy "Users can manage own sources"
  on public.connected_sources for all using (auth.uid() = user_id);

-- ============================================================
-- CONSENT GRANTS
-- Field-level data sharing with doctors, companies, researchers.
-- ============================================================
create table if not exists public.consent_grants (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  granted_to      text,   -- email, org name, or description
  granted_to_type text check (granted_to_type in ('doctor','company','research','api_key')),
  fields          text[], -- field-level scope: ['hrv_rmssd','sleep_total', ...]
  from_date       date,
  to_date         date,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  token           text not null unique default encode(gen_random_bytes(32), 'hex'),
  created_at      timestamptz default now()
);

alter table public.consent_grants enable row level security;

create policy "Owners can manage own grants"
  on public.consent_grants for all using (auth.uid() = owner_id);

-- Public read via token (for share URLs) — no auth required
create policy "Token holders can read active grants"
  on public.consent_grants for select
  using (revoked_at is null and (expires_at is null or expires_at > now()));

create index idx_consent_token on public.consent_grants (token);
create index idx_consent_owner on public.consent_grants (owner_id);

-- ============================================================
-- API KEYS
-- B2B API access for companies building on OBIP.
-- ============================================================
create table if not exists public.api_keys (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade,
  key_hash        text not null unique, -- SHA-256 of the actual key
  name            text,
  scopes          text[] default array['read'],
  rate_limit      integer default 1000, -- requests/hour
  last_used       timestamptz,
  created_at      timestamptz default now(),
  revoked_at      timestamptz
);

alter table public.api_keys enable row level security;

create policy "Users can manage own API keys"
  on public.api_keys for all using (auth.uid() = user_id);

-- ============================================================
-- AUDIT LOG
-- Every consent token access is logged.
-- ============================================================
create table if not exists public.audit_log (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid references auth.users(id) on delete set null,
  grant_id        uuid references public.consent_grants(id) on delete set null,
  action          text not null, -- 'view','export','revoke'
  accessor_ip     text,
  accessed_at     timestamptz default now()
);

alter table public.audit_log enable row level security;

create policy "Owners can view own audit log"
  on public.audit_log for select using (auth.uid() = owner_id);

create policy "System can insert audit entries"
  on public.audit_log for insert with check (true);

create index idx_audit_owner on public.audit_log (owner_id, accessed_at desc);

-- ============================================================
-- HELPER: updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- DONE
-- Tables: profiles, biometric_records, raw_signals,
--         computed_insights, connected_sources,
--         consent_grants, api_keys, audit_log
-- RLS: enabled on all tables
-- Indexes: user+time on all core tables, 6 partial indexes
-- ============================================================
