import type { BiometricRecord } from './supabase'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Scores {
  readiness: number
  recovery: number
  sleep_score: number
  fatigue: number
  consistency: number
}

export type TrendDirection = 'improving' | 'stable' | 'worsening'

export interface Trend {
  direction: TrendDirection
  slope: number
  r2: number
  higher_is_better: boolean
}

export interface Anomaly {
  field: string
  timestamp: string
  value: number
  z_score: number
}

export interface AnalyticsResult {
  scores: Scores
  trends: Record<string, Trend>
  anomalies: Anomaly[]
  baselines: Record<string, number>
  data_points: number
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v))
}

function mean(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const variance = arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1)
  return Math.sqrt(variance)
}

function cv(arr: number[]): number {
  const m = mean(arr)
  if (m === 0) return 0
  return stddev(arr) / m
}

// Linear regression — returns { slope, intercept, r2 }
function linearRegression(y: number[]): { slope: number; intercept: number; r2: number } {
  const n = y.length
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0, r2: 0 }

  const x = y.map((_, i) => i)
  const mx = mean(x)
  const my = mean(y)

  let ssXY = 0, ssXX = 0, ssYY = 0
  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - mx) * (y[i] - my)
    ssXX += (x[i] - mx) ** 2
    ssYY += (y[i] - my) ** 2
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX
  const intercept = my - slope * mx
  const r2 = ssYY === 0 ? 0 : (ssXY ** 2) / (ssXX * ssYY)

  return { slope, intercept, r2 }
}

// Extract numeric values for a field from records, sorted by timestamp
function extract(records: BiometricRecord[], field: keyof BiometricRecord): { values: number[]; timestamps: string[] } {
  const pairs = records
    .filter(r => r[field] != null && typeof r[field] === 'number')
    .map(r => ({ v: r[field] as number, t: r.timestamp }))
    .sort((a, b) => a.t.localeCompare(b.t))

  return {
    values: pairs.map(p => p.v),
    timestamps: pairs.map(p => p.t),
  }
}

// ─────────────────────────────────────────────────────────────
// Score algorithms
// ─────────────────────────────────────────────────────────────

// HRV normalised to 15–80ms range → 0–100
function normaliseHRV(rmssd: number): number {
  return clamp(((rmssd - 15) / (80 - 15)) * 100)
}

// Recovery Score (0–100)
// HRV RMSSD normalised 45%, RHR trend 30%, sleep quality 25%
function computeRecovery(records: BiometricRecord[]): number {
  const { values: hrv } = extract(records, 'hrv_rmssd')
  const { values: rhr } = extract(records, 'resting_heart_rate')
  const { values: sleepEff } = extract(records, 'sleep_efficiency')

  // HRV component — latest vs personal mean
  let hrvScore = 50
  if (hrv.length >= 1) {
    const latest = hrv[hrv.length - 1]
    const normalised = normaliseHRV(latest)
    // Bonus if trending up
    const reg = linearRegression(hrv)
    const trendBonus = reg.r2 > 0.15 && reg.slope > 0 ? 10 : 0
    hrvScore = clamp(normalised + trendBonus)
  }

  // RHR component — lower is better, target 40–70 bpm range
  let rhrScore = 50
  if (rhr.length >= 1) {
    const latest = rhr[rhr.length - 1]
    rhrScore = clamp(((70 - latest) / (70 - 40)) * 100)
  }

  // Sleep component — efficiency 0–100%
  let sleepScore = 50
  if (sleepEff.length >= 1) {
    sleepScore = clamp(sleepEff[sleepEff.length - 1])
  }

  return Math.round(clamp(hrvScore * 0.45 + rhrScore * 0.30 + sleepScore * 0.25))
}

// Sleep Score (0–100)
// Duration 40%, consistency 20%, deep% 15%, REM% 10%, efficiency 10%, onset 5%
function computeSleepScore(records: BiometricRecord[]): number {
  const { values: total } = extract(records, 'sleep_total')         // minutes
  const { values: deep } = extract(records, 'sleep_deep')
  const { values: rem } = extract(records, 'sleep_rem')
  const { values: eff } = extract(records, 'sleep_efficiency')
  const { values: onset } = extract(records, 'sleep_onset_latency') // minutes

  if (!total.length) return 50

  const latest = total[total.length - 1]

  // Duration — target 480 min (8h), penalise deviation
  const durationScore = clamp(100 - Math.abs(latest - 480) / 4.8)

  // Consistency — CV of recent sleep durations
  const consistencyScore = total.length >= 3
    ? clamp(100 - cv(total) * 200)
    : 50

  // Deep sleep — target 20% of total
  const deepPct = deep.length && total.length
    ? (deep[deep.length - 1] / latest) * 100 : 15
  const deepScore = clamp((deepPct / 20) * 100)

  // REM — target 22%
  const remPct = rem.length && total.length
    ? (rem[rem.length - 1] / latest) * 100 : 18
  const remScore = clamp((remPct / 22) * 100)

  // Efficiency
  const effScore = eff.length ? clamp(eff[eff.length - 1]) : 75

  // Onset latency — target 15 min
  const onsetLatest = onset.length ? onset[onset.length - 1] : 20
  const onsetScore = clamp(100 - Math.max(0, onsetLatest - 5) * 4)

  return Math.round(
    durationScore * 0.40 +
    consistencyScore * 0.20 +
    deepScore * 0.15 +
    remScore * 0.10 +
    effScore * 0.10 +
    onsetScore * 0.05
  )
}

// Fatigue Index (0–100, lower is better)
function computeFatigue(records: BiometricRecord[]): number {
  const { values: hrv } = extract(records, 'hrv_rmssd')
  const { values: rhr } = extract(records, 'resting_heart_rate')
  const { values: sleep } = extract(records, 'sleep_total')
  const { values: load } = extract(records, 'exercise_load')

  let fatigue = 30 // baseline

  // Declining HRV trend
  if (hrv.length >= 4) {
    const reg = linearRegression(hrv)
    if (reg.r2 > 0.15 && reg.slope < 0) fatigue += 20
  }

  // Rising RHR
  if (rhr.length >= 4) {
    const reg = linearRegression(rhr)
    if (reg.r2 > 0.15 && reg.slope > 0) fatigue += 15
  }

  // Sleep debt — deviation from 8h target, accumulated
  if (sleep.length >= 3) {
    const recent = sleep.slice(-7)
    const avgSleep = mean(recent)
    const debt = Math.max(0, 480 - avgSleep) / 60 // hours short
    fatigue += debt * 8
  }

  // High exercise load
  if (load.length >= 3) {
    const recent = load.slice(-7)
    const avg7 = mean(recent)
    const avg14 = load.length >= 7 ? mean(load.slice(-14)) : avg7
    if (avg14 > 0 && avg7 / avg14 > 1.3) fatigue += 15
  }

  return Math.round(clamp(fatigue))
}

// Consistency Score (0–100)
// Low CV across all signals = high consistency
function computeConsistency(records: BiometricRecord[]): number {
  const signals: (keyof BiometricRecord)[] = [
    'hrv_rmssd', 'resting_heart_rate', 'sleep_total', 'steps', 'weight_kg'
  ]

  const cvScores: number[] = []
  for (const field of signals) {
    const { values } = extract(records, field)
    if (values.length >= 3) {
      cvScores.push(clamp(100 - cv(values) * 200))
    }
  }

  if (!cvScores.length) return 50
  return Math.round(mean(cvScores))
}

// Readiness Score (0–100)
// Recovery 45%, Sleep 35%, inverse Fatigue 20%
function computeReadiness(recovery: number, sleepScore: number, fatigue: number): number {
  const inverseFatigue = 100 - fatigue
  return Math.round(clamp(recovery * 0.45 + sleepScore * 0.35 + inverseFatigue * 0.20))
}

// ─────────────────────────────────────────────────────────────
// Trend detection
// ─────────────────────────────────────────────────────────────

const HIGHER_IS_BETTER: Record<string, boolean> = {
  hrv_rmssd: true,
  hrv_sdnn: true,
  spo2: true,
  vo2_max: true,
  sleep_total: true,
  sleep_deep: true,
  sleep_rem: true,
  sleep_efficiency: true,
  steps: true,
  active_minutes: true,
  mood_score: true,
  energy_score: true,
  resting_heart_rate: false,
  heart_rate: false,
  sleep_onset_latency: false,
  sleep_awake: false,
  fatigue: false,
  stress_score: false,
  glucose_variability_cv: false,
  weight_kg: false,
}

function detectTrend(values: number[], higherIsBetter: boolean): Trend {
  const reg = linearRegression(values)
  const m = mean(values)
  const relativeSlope = m !== 0 ? Math.abs(reg.slope) / m : 0

  let direction: TrendDirection = 'stable'
  if (reg.r2 > 0.15 && relativeSlope > 0.015) {
    const improving = reg.slope > 0 ? higherIsBetter : !higherIsBetter
    direction = improving ? 'improving' : 'worsening'
  }

  return {
    direction,
    slope: Math.round(reg.slope * 100) / 100,
    r2: Math.round(reg.r2 * 100) / 100,
    higher_is_better: higherIsBetter,
  }
}

// ─────────────────────────────────────────────────────────────
// Anomaly detection — z-score, threshold 2.5σ
// ─────────────────────────────────────────────────────────────

function detectAnomalies(
  records: BiometricRecord[],
  field: keyof BiometricRecord
): Anomaly[] {
  const { values, timestamps } = extract(records, field)
  if (values.length < 4) return []

  const m = mean(values)
  const sd = stddev(values)
  if (sd === 0) return []

  return values
    .map((v, i) => ({ v, t: timestamps[i], z: Math.abs((v - m) / sd) }))
    .filter(({ z }) => z >= 2.5)
    .map(({ v, t, z }) => ({
      field: field as string,
      timestamp: t,
      value: Math.round(v * 100) / 100,
      z_score: Math.round(z * 100) / 100,
    }))
}

// ─────────────────────────────────────────────────────────────
// Main entrypoint
// ─────────────────────────────────────────────────────────────

export function analyzeRecords(records: BiometricRecord[]): AnalyticsResult {
  if (!records.length) {
    return {
      scores: { readiness: 0, recovery: 0, sleep_score: 0, fatigue: 0, consistency: 0 },
      trends: {},
      anomalies: [],
      baselines: {},
      data_points: 0,
    }
  }

  const recovery = computeRecovery(records)
  const sleep_score = computeSleepScore(records)
  const fatigue = computeFatigue(records)
  const consistency = computeConsistency(records)
  const readiness = computeReadiness(recovery, sleep_score, fatigue)

  // Trends for key signals
  const trendFields: (keyof BiometricRecord)[] = [
    'hrv_rmssd', 'resting_heart_rate', 'sleep_total', 'sleep_efficiency',
    'steps', 'weight_kg', 'spo2', 'stress_score', 'glucose_mg_dl'
  ]

  const trends: Record<string, Trend> = {}
  for (const field of trendFields) {
    const { values } = extract(records, field)
    if (values.length >= 3) {
      const hib = HIGHER_IS_BETTER[field as string] ?? true
      trends[field as string] = detectTrend(values, hib)
    }
  }

  // Anomalies
  const anomalyFields: (keyof BiometricRecord)[] = [
    'hrv_rmssd', 'resting_heart_rate', 'sleep_total', 'glucose_mg_dl', 'weight_kg'
  ]
  const anomalies: Anomaly[] = anomalyFields.flatMap(f => detectAnomalies(records, f))

  // Baselines — mean per signal over full window
  const baselineFields: (keyof BiometricRecord)[] = [
    'hrv_rmssd', 'resting_heart_rate', 'sleep_total', 'sleep_efficiency',
    'steps', 'weight_kg', 'spo2'
  ]
  const baselines: Record<string, number> = {}
  for (const field of baselineFields) {
    const { values } = extract(records, field)
    if (values.length >= 1) {
      baselines[field as string] = Math.round(mean(values) * 10) / 10
    }
  }

  return {
    scores: { readiness, recovery, sleep_score, fatigue, consistency },
    trends,
    anomalies,
    baselines,
    data_points: records.length,
  }
}

// Utility for chart data — returns [{date, value}] for a field
export function toChartSeries(
  records: BiometricRecord[],
  field: keyof BiometricRecord
): { date: string; value: number }[] {
  return records
    .filter(r => r[field] != null && typeof r[field] === 'number')
    .map(r => ({
      date: new Date(r.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      value: r[field] as number,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
