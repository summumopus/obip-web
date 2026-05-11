import { createClient } from '@supabase/supabase-js'

// Safe fallbacks so Next.js static build never crashes
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://placeholder.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder_key_for_build_time_only_replace_in_env'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type DataSource =
  | 'manual' | 'csv' | 'apple_health' | 'google_health'
  | 'garmin' | 'fitbit' | 'oura' | 'whoop' | 'polar'
  | 'samsung' | 'withings' | 'dexcom' | 'abbott' | 'fhir' | 'hl7' | 'plugin'

export type DataQuality = 'low' | 'medium' | 'high' | 'clinical'

export type SubscriptionTier = 'free' | 'pro' | 'business'

export type GrantedToType = 'doctor' | 'company' | 'research' | 'api_key'

export interface Profile {
  id: string
  display_name: string | null
  date_of_birth: string | null
  sex: 'male' | 'female' | 'intersex' | 'prefer_not_to_say' | null
  height_cm: number | null
  timezone: string
  subscription_tier: SubscriptionTier
  created_at: string
  updated_at: string
}

export interface BiometricRecord {
  id: string
  user_id: string
  timestamp: string
  recorded_at: string
  source: DataSource
  quality: DataQuality
  device_model: string | null
  plugin_id: string | null
  raw_metadata: Record<string, unknown> | null

  // Cardiovascular
  heart_rate?: number | null
  heart_rate_avg?: number | null
  heart_rate_max?: number | null
  heart_rate_min?: number | null
  resting_heart_rate?: number | null
  hrv_rmssd?: number | null
  hrv_sdnn?: number | null
  hrv_lf_hf_ratio?: number | null
  spo2?: number | null
  respiratory_rate?: number | null
  vo2_max?: number | null
  systolic_bp?: number | null
  diastolic_bp?: number | null
  pulse_wave_velocity?: number | null
  cardiac_output?: number | null
  afib_detected?: boolean | null
  stroke_volume?: number | null

  // Sleep
  sleep_total?: number | null
  sleep_deep?: number | null
  sleep_rem?: number | null
  sleep_light?: number | null
  sleep_awake?: number | null
  sleep_efficiency?: number | null
  sleep_onset_latency?: number | null
  sleep_disturbances?: number | null
  sleep_start?: string | null
  sleep_end?: string | null
  snoring_detected?: boolean | null
  ahi_score?: number | null
  circadian_phase_offset?: number | null

  // Activity
  steps?: number | null
  distance_m?: number | null
  active_calories?: number | null
  total_calories?: number | null
  active_minutes?: number | null
  floors_climbed?: number | null
  exercise_load?: number | null
  activity_type?: string | null
  running_cadence?: number | null
  running_power?: number | null
  ground_contact_time?: number | null
  vertical_oscillation?: number | null
  swimming_strokes?: number | null
  cycling_power?: number | null
  gait_symmetry?: number | null
  balance_score?: number | null
  fall_detected?: boolean | null

  // Metabolic
  glucose_mg_dl?: number | null
  glucose_avg_mg_dl?: number | null
  glucose_variability_cv?: number | null
  hba1c?: number | null
  ketones_mmol?: number | null
  lactate_mmol?: number | null
  lactate_sweat_mmol?: number | null
  alcohol_bac?: number | null
  cholesterol_total?: number | null
  cholesterol_ldl?: number | null
  cholesterol_hdl?: number | null
  triglycerides?: number | null

  // Body composition
  weight_kg?: number | null
  height_cm?: number | null
  bmi?: number | null
  body_fat_pct?: number | null
  muscle_mass_kg?: number | null
  bone_mass_kg?: number | null
  water_pct?: number | null
  visceral_fat_score?: number | null
  waist_cm?: number | null
  hydration_status?: string | null

  // Biochemical / Lab
  ferritin_ug?: number | null
  crp_mg?: number | null
  vitamin_d_nmol?: number | null
  testosterone_nmol?: number | null
  tsh_miu?: number | null
  cortisol_nmol?: number | null

  // Sweat
  sweat_sodium_mmol?: number | null
  sweat_potassium_mmol?: number | null
  sweat_cortisol_ng?: number | null
  sweat_lactate_mmol?: number | null
  sweat_uric_acid_umol?: number | null

  // Thermal
  skin_temp_c?: number | null
  core_temp_c?: number | null
  wrist_temp_c?: number | null
  ambient_temp_c?: number | null
  altitude_m?: number | null

  // Neurological
  eda_us?: number | null
  stress_score?: number | null
  eeg_alpha?: number | null
  eeg_beta?: number | null
  eeg_theta?: number | null
  emg_uv?: number | null
  cognitive_load?: number | null
  attention_score?: number | null
  reaction_time_ms?: number | null

  // Environmental
  uv_index?: number | null
  air_quality_pm25?: number | null
  co2_ppm?: number | null
  noise_db?: number | null
  light_lux?: number | null
  humidity_pct?: number | null

  // Genomic
  biological_age?: number | null
  telomere_length?: number | null
  microbiome_diversity?: number | null

  // Subjective
  mood_score?: number | null
  energy_score?: number | null
  pain_score?: number | null
  rpe_score?: number | null
  hunger_score?: number | null
  menstrual_cycle_day?: number | null
  alcohol_units?: number | null
  caffeine_mg?: number | null
  water_ml?: number | null
  notes?: string | null
}

export interface RawSignal {
  id: string
  user_id: string
  timestamp: string
  sensor_type: 'ppg' | 'ecg' | 'accelerometer' | 'rr_intervals' | 'eeg' | 'emg' | 'gsr' | 'temperature' | 'pressure'
  sampling_rate_hz: number | null
  duration_seconds: number | null
  data_format: 'binary' | 'json' | 'csv' | 'float32_le'
  processed: boolean
  source: string | null
  device_model: string | null
  created_at: string
}

export interface ComputedInsights {
  id: string
  user_id: string
  window_days: number
  metrics: {
    readiness: number
    recovery: number
    sleep_score: number
    fatigue: number
    consistency: number
  } | null
  trends: Record<string, { direction: 'improving' | 'stable' | 'worsening'; slope: number; r2: number }> | null
  anomalies: Array<{ field: string; timestamp: string; value: number; z_score: number }> | null
  baselines: Record<string, number> | null
  computed_at: string
}

export interface ConsentGrant {
  id: string
  owner_id: string
  granted_to: string | null
  granted_to_type: GrantedToType | null
  fields: string[]
  from_date: string | null
  to_date: string | null
  expires_at: string | null
  revoked_at: string | null
  token: string
  created_at: string
}

// ─────────────────────────────────────────────
// Query helpers
// ─────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function getBiometricRecords(
  userId: string,
  days: number = 30
): Promise<BiometricRecord[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await supabase
    .from('biometric_records')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', since.toISOString())
    .order('timestamp', { ascending: true })

  return data ?? []
}

export async function insertBiometricRecord(
  record: Omit<BiometricRecord, 'id' | 'recorded_at'>
): Promise<BiometricRecord | null> {
  const { data } = await supabase
    .from('biometric_records')
    .insert(record)
    .select()
    .single()
  return data
}

export async function upsertComputedInsights(
  insights: Omit<ComputedInsights, 'id' | 'computed_at'>
): Promise<void> {
  await supabase
    .from('computed_insights')
    .upsert(insights, { onConflict: 'user_id,window_days' })
}

export async function getComputedInsights(
  userId: string,
  windowDays: number
): Promise<ComputedInsights | null> {
  const { data } = await supabase
    .from('computed_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('window_days', windowDays)
    .single()
  return data
}
