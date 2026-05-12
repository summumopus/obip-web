import type { BiometricRecord, DataSource } from './supabase'

// ── Column alias map ──────────────────────────────────────────
const COLUMN_MAP: Record<string, keyof BiometricRecord> = {
  // Timestamp
  timestamp: 'timestamp', date: 'timestamp', datetime: 'timestamp',
  time: 'timestamp', starttime: 'timestamp', 'start time': 'timestamp',
  'activity date': 'timestamp',

  // Cardiovascular
  heart_rate: 'heart_rate', heartrate: 'heart_rate', hr: 'heart_rate',
  bpm: 'heart_rate', 'avg hr': 'heart_rate', 'average heart rate': 'heart_rate',
  'heart rate': 'heart_rate',
  resting_heart_rate: 'resting_heart_rate', restinghr: 'resting_heart_rate',
  'resting heart rate': 'resting_heart_rate', rhr: 'resting_heart_rate',
  hrv: 'hrv_rmssd', hrv_rmssd: 'hrv_rmssd', rmssd: 'hrv_rmssd',
  heart_rate_variability: 'hrv_rmssd', 'heart rate variability': 'hrv_rmssd',
  hrv_sdnn: 'hrv_sdnn', sdnn: 'hrv_sdnn',
  spo2: 'spo2', oxygen_saturation: 'spo2', 'blood oxygen': 'spo2',
  'spo2 (%)': 'spo2', 'oxygen saturation': 'spo2',
  respiratory_rate: 'respiratory_rate', 'breathing rate': 'respiratory_rate',
  vo2_max: 'vo2_max', vo2max: 'vo2_max', 'vo2 max': 'vo2_max',
  systolic_bp: 'systolic_bp', systolic: 'systolic_bp',
  diastolic_bp: 'diastolic_bp', diastolic: 'diastolic_bp',

  // Sleep
  sleep_total: 'sleep_total', sleep: 'sleep_total', sleep_duration: 'sleep_total',
  'hours of sleep': 'sleep_total', 'sleep duration': 'sleep_total',
  total_sleep: 'sleep_total', 'total sleep': 'sleep_total',
  sleep_deep: 'sleep_deep', 'deep sleep': 'sleep_deep', deep_sleep: 'sleep_deep',
  sleep_rem: 'sleep_rem', rem: 'sleep_rem', 'rem sleep': 'sleep_rem',
  sleep_light: 'sleep_light', 'light sleep': 'sleep_light',
  sleep_efficiency: 'sleep_efficiency', 'sleep efficiency': 'sleep_efficiency',
  sleep_onset_latency: 'sleep_onset_latency', 'sleep latency': 'sleep_onset_latency',
  sleep_awake: 'sleep_awake', 'time awake': 'sleep_awake', awake: 'sleep_awake',

  // Activity
  steps: 'steps', step_count: 'steps', total_steps: 'steps', 'step count': 'steps',
  distance_m: 'distance_m', distance: 'distance_m',
  active_calories: 'active_calories', calories: 'active_calories',
  'active calories': 'active_calories', 'calories burned': 'active_calories',
  energy_burned: 'active_calories', 'active energy burned (kcal)': 'active_calories',
  total_calories: 'total_calories', 'total calories': 'total_calories',
  active_minutes: 'active_minutes', 'active minutes': 'active_minutes',
  floors_climbed: 'floors_climbed', floors: 'floors_climbed',
  exercise_load: 'exercise_load', load: 'exercise_load', 'training load': 'exercise_load',
  activity_type: 'activity_type', 'activity type': 'activity_type', type: 'activity_type',

  // Body composition
  weight_kg: 'weight_kg', weight: 'weight_kg', 'body weight': 'weight_kg',
  mass: 'weight_kg', 'weight (kg)': 'weight_kg', 'weight (lbs)': 'weight_kg',
  bmi: 'bmi',
  body_fat_pct: 'body_fat_pct', 'body fat': 'body_fat_pct', 'fat %': 'body_fat_pct',
  'body fat (%)': 'body_fat_pct',
  muscle_mass_kg: 'muscle_mass_kg', 'muscle mass': 'muscle_mass_kg',
  waist_cm: 'waist_cm', waist: 'waist_cm',

  // Metabolic
  glucose_mg_dl: 'glucose_mg_dl', glucose: 'glucose_mg_dl',
  'blood glucose': 'glucose_mg_dl', 'glucose (mg/dl)': 'glucose_mg_dl',
  hba1c: 'hba1c', 'hba1c (%)': 'hba1c',
  ketones_mmol: 'ketones_mmol', ketones: 'ketones_mmol',
  cholesterol_total: 'cholesterol_total', 'total cholesterol': 'cholesterol_total',
  cholesterol_ldl: 'cholesterol_ldl', ldl: 'cholesterol_ldl',
  cholesterol_hdl: 'cholesterol_hdl', hdl: 'cholesterol_hdl',
  triglycerides: 'triglycerides',

  // Thermal
  skin_temp_c: 'skin_temp_c', 'skin temperature': 'skin_temp_c',
  wrist_temp_c: 'wrist_temp_c', 'wrist temperature': 'wrist_temp_c',

  // Subjective
  mood_score: 'mood_score', mood: 'mood_score',
  energy_score: 'energy_score', energy: 'energy_score',
  stress_score: 'stress_score', stress: 'stress_score',
  pain_score: 'pain_score', pain: 'pain_score',
  caffeine_mg: 'caffeine_mg', caffeine: 'caffeine_mg',
  water_ml: 'water_ml', water: 'water_ml', 'water intake': 'water_ml',
  alcohol_units: 'alcohol_units', alcohol: 'alcohol_units',
  notes: 'notes', note: 'notes', comment: 'notes',
}

// ── Detect delimiter ──────────────────────────────────────────
function detectDelimiter(firstLine: string): string {
  const counts = { ',': 0, ';': 0, '\t': 0 }
  for (const ch of firstLine) {
    if (ch in counts) counts[ch as keyof typeof counts]++
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

// ── Parse a single CSV line respecting quoted fields ──────────
function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === delimiter && !inQuote) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

// ── Normalise timestamp to ISO 8601 ──────────────────────────
function parseTimestamp(raw: string): string | null {
  if (!raw) return null
  const cleaned = raw.trim()

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(cleaned)) return new Date(cleaned).toISOString()

  // Date only: 2024-03-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return new Date(cleaned + 'T00:00:00Z').toISOString()

  // US format: 03/15/2024
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(cleaned)) return new Date(cleaned).toISOString()

  // Excel serial number
  const serial = parseFloat(cleaned)
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const ms = (serial - 25569) * 86400 * 1000
    return new Date(ms).toISOString()
  }

  const d = new Date(cleaned)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// ── Convert lbs to kg if column name hints at lbs ────────────
function maybeConvertWeight(value: number, rawHeader: string): number {
  if (/lbs|lb|pounds/i.test(rawHeader)) return value * 0.453592
  return value
}

// ── Convert sleep hours to minutes if < 24 ───────────────────
function normaliseSleep(value: number, field: keyof BiometricRecord): number {
  const sleepFields: (keyof BiometricRecord)[] = [
    'sleep_total', 'sleep_deep', 'sleep_rem', 'sleep_light', 'sleep_awake'
  ]
  if (sleepFields.includes(field) && value > 0 && value < 24) {
    return Math.round(value * 60) // hours → minutes
  }
  return value
}

// ── Main parser ───────────────────────────────────────────────
export function parseCSV(
  text: string,
  userId: string,
  source: DataSource = 'csv'
): Partial<BiometricRecord>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const delimiter = detectDelimiter(lines[0])
  const rawHeaders = splitLine(lines[0], delimiter)

  // Map header index → BiometricRecord field
  const headerMap: Record<number, keyof BiometricRecord> = {}
  const rawHeaderByIndex: Record<number, string> = {}

  rawHeaders.forEach((h, i) => {
    const normalised = h.toLowerCase().trim().replace(/[_\s]+/g, ' ').replace(/[^a-z0-9 /%().]/g, '')
    rawHeaderByIndex[i] = h
    const mapped = COLUMN_MAP[normalised] ?? COLUMN_MAP[h.toLowerCase().trim()]
    if (mapped) headerMap[i] = mapped
  })

  const timestampIndex = Object.entries(headerMap).find(([, v]) => v === 'timestamp')?.[0]

  const records: Partial<BiometricRecord>[] = []

  for (let li = 1; li < lines.length; li++) {
    const cells = splitLine(lines[li], delimiter)
    if (cells.every(c => !c)) continue

    const record: Record<string, unknown> = {
      user_id: userId,
      source,
      quality: 'medium',
    }

    // Timestamp
    if (timestampIndex !== undefined) {
      const raw = cells[parseInt(timestampIndex)]
      const ts = parseTimestamp(raw)
      if (!ts) continue // skip rows with unparseable timestamps
      record.timestamp = ts
    } else {
      // No timestamp column — use today at midnight as fallback
      record.timestamp = new Date().toISOString()
    }

    // All other fields
    for (const [idxStr, field] of Object.entries(headerMap)) {
      const idx = parseInt(idxStr)
      if (field === 'timestamp') continue
      const raw = cells[idx]
      if (!raw || raw === '' || raw === '-' || raw === 'N/A') continue

      if (field === 'notes' || field === 'activity_type' || field === 'hydration_status') {
        record[field] = raw
        continue
      }

      let num = parseFloat(raw.replace(',', '.'))
      if (isNaN(num)) continue

      // Unit conversions
      if (field === 'weight_kg') num = maybeConvertWeight(num, rawHeaderByIndex[idx])
      num = normaliseSleep(num, field)

      record[field] = num
    }

    // Must have at least one biometric field beyond timestamp/user_id/source
    const biometricKeys = Object.keys(record).filter(
      k => !['user_id', 'source', 'quality', 'timestamp'].includes(k)
    )
    if (biometricKeys.length > 0) {
      records.push(record as Partial<BiometricRecord>)
    }
  }

  return records
}
