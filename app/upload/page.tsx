'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Field groups for manual entry ─────────────────────────────
const FIELD_GROUPS = [
  {
    label: 'Cardiovascular',
    fields: [
      { key: 'resting_heart_rate', label: 'Resting HR', unit: 'bpm', placeholder: '58' },
      { key: 'hrv_rmssd', label: 'HRV RMSSD', unit: 'ms', placeholder: '52' },
      { key: 'hrv_sdnn', label: 'HRV SDNN', unit: 'ms', placeholder: '68' },
      { key: 'spo2', label: 'SpO₂', unit: '%', placeholder: '98' },
      { key: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', placeholder: '120' },
      { key: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', placeholder: '80' },
    ],
  },
  {
    label: 'Sleep',
    fields: [
      { key: 'sleep_total', label: 'Total sleep', unit: 'min', placeholder: '450' },
      { key: 'sleep_deep', label: 'Deep sleep', unit: 'min', placeholder: '90' },
      { key: 'sleep_rem', label: 'REM sleep', unit: 'min', placeholder: '110' },
      { key: 'sleep_efficiency', label: 'Efficiency', unit: '%', placeholder: '85' },
      { key: 'sleep_onset_latency', label: 'Onset latency', unit: 'min', placeholder: '12' },
    ],
  },
  {
    label: 'Activity',
    fields: [
      { key: 'steps', label: 'Steps', unit: '', placeholder: '9500' },
      { key: 'active_calories', label: 'Active calories', unit: 'cal', placeholder: '420' },
      { key: 'active_minutes', label: 'Active minutes', unit: 'min', placeholder: '45' },
      { key: 'exercise_load', label: 'Exercise load', unit: '', placeholder: '6.2' },
      { key: 'vo2_max', label: 'VO₂ max', unit: 'ml/kg/min', placeholder: '48' },
    ],
  },
  {
    label: 'Body',
    fields: [
      { key: 'weight_kg', label: 'Weight', unit: 'kg', placeholder: '74.2' },
      { key: 'body_fat_pct', label: 'Body fat', unit: '%', placeholder: '18' },
      { key: 'muscle_mass_kg', label: 'Muscle mass', unit: 'kg', placeholder: '58' },
      { key: 'waist_cm', label: 'Waist', unit: 'cm', placeholder: '82' },
    ],
  },
  {
    label: 'Metabolic',
    fields: [
      { key: 'glucose_mg_dl', label: 'Blood glucose', unit: 'mg/dL', placeholder: '95' },
      { key: 'ketones_mmol', label: 'Ketones', unit: 'mmol/L', placeholder: '0.4' },
    ],
  },
  {
    label: 'Subjective',
    fields: [
      { key: 'mood_score', label: 'Mood', unit: '/10', placeholder: '7' },
      { key: 'energy_score', label: 'Energy', unit: '/10', placeholder: '6' },
      { key: 'stress_score', label: 'Stress', unit: '/10', placeholder: '4' },
      { key: 'caffeine_mg', label: 'Caffeine', unit: 'mg', placeholder: '200' },
      { key: 'water_ml', label: 'Water', unit: 'ml', placeholder: '2000' },
      { key: 'alcohol_units', label: 'Alcohol', unit: 'units', placeholder: '0' },
    ],
  },
]

function UploadInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [tab, setTab] = useState<'manual' | 'csv'>(params.get('tab') === 'csv' ? 'csv' : 'manual')
  const [userId, setUserId] = useState<string | null>(null)
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString().slice(0, 16))
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvStatus, setCsvStatus] = useState<string | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth'); return }
      setUserId(data.session.user.id)
    })
  }, [router])

  function setValue(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  async function saveManual() {
    if (!userId) return
    setSaving(true); setError(null); setSaved(false)

    const record: Record<string, unknown> = {
      user_id: userId,
      timestamp: new Date(timestamp).toISOString(),
      source: 'manual',
      quality: 'medium',
      notes: notes || null,
    }

    for (const [key, val] of Object.entries(values)) {
      if (val.trim() !== '') record[key] = parseFloat(val)
    }

    const { error: err } = await supabase.from('biometric_records').insert(record)
    if (err) { setError(err.message); setSaving(false); return }
    setSaved(true)
    setSaving(false)
    setValues({})
    setNotes('')
    setTimeout(() => setSaved(false), 3000)
  }

  async function importCSV() {
    if (!csvFile || !userId) return
    setCsvImporting(true)
    setCsvStatus('Reading file…')

    try {
      const text = await csvFile.text()
      const { parseCSV } = await import('@/lib/csvParser')
      const rows = parseCSV(text, userId)

      if (rows.length === 0) {
        setCsvStatus('No recognisable columns found. Check the column names.')
        setCsvImporting(false)
        return
      }

      setCsvStatus(`Parsed ${rows.length} rows. Uploading…`)

      // Batch insert in chunks of 500
      const CHUNK = 500
      let inserted = 0
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        const { error } = await supabase.from('biometric_records').upsert(chunk, { onConflict: 'user_id,timestamp,source' })
        if (error) throw new Error(error.message)
        inserted += chunk.length
        setCsvStatus(`Uploading… ${inserted}/${rows.length}`)
      }

      setCsvStatus(`✓ Imported ${inserted} records successfully`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setCsvStatus(`Error: ${message}`)
    }
    setCsvImporting(false)
  }

  const inputStyle = {
    background: '#161C19',
    border: '0.5px solid rgba(255,255,255,0.08)',
    color: '#E8EDE9',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    fontFamily: 'DM Mono, monospace',
  }

  return (
    <div className="min-h-screen" style={{ background: '#0E1210' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161C19' }}>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs" style={{ color: '#7A8C82' }}>← Dashboard</Link>
          <span className="text-sm font-medium">Import data</span>
        </div>
        <div className="flex p-1 rounded-lg gap-0.5" style={{ background: '#0E1210', border: '0.5px solid rgba(255,255,255,0.07)' }}>
          {(['manual', 'csv'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-md text-xs transition-all"
              style={tab === t ? { background: '#1D9E75', color: '#fff' } : { color: '#7A8C82' }}
            >
              {t === 'manual' ? 'Manual entry' : 'CSV import'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Manual entry ── */}
        {tab === 'manual' && (
          <div>
            {/* Timestamp */}
            <div className="mb-6">
              <label className="text-xs tracking-widest mb-2 block" style={{ color: '#7A8C82' }}>DATE & TIME</label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={e => setTimestamp(e.target.value)}
                style={inputStyle}
              />
            </div>

            {FIELD_GROUPS.map(group => (
              <div key={group.label} className="mb-6">
                <div className="text-xs tracking-widest mb-3" style={{ color: '#7A8C82' }}>{group.label.toUpperCase()}</div>
                <div className="grid grid-cols-2 gap-3">
                  {group.fields.map(f => (
                    <div key={f.key}>
                      <label className="text-xs mb-1.5 block" style={{ color: '#7A8C82' }}>
                        {f.label} {f.unit && <span style={{ color: '#4A5C52' }}>({f.unit})</span>}
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder={f.placeholder}
                        value={values[f.key] ?? ''}
                        onChange={e => setValue(f.key, e.target.value)}
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = '#1D9E75')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Notes */}
            <div className="mb-6">
              <label className="text-xs tracking-widest mb-2 block" style={{ color: '#7A8C82' }}>NOTES</label>
              <textarea
                rows={3}
                placeholder="How are you feeling today? Any relevant context…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={e => (e.target.style.borderColor = '#1D9E75')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            {error && (
              <div className="text-xs px-4 py-3 rounded-lg mb-4" style={{ background: 'rgba(226,75,74,0.1)', border: '0.5px solid rgba(226,75,74,0.3)', color: '#E24B4A' }}>
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={saveManual}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg text-sm font-medium transition-opacity"
                style={{ background: '#1D9E75', color: '#fff', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save entry'}
              </button>
              {saved && <span className="text-xs" style={{ color: '#1D9E75' }}>✓ Saved</span>}
            </div>
          </div>
        )}

        {/* ── CSV import ── */}
        {tab === 'csv' && (
          <div>
            <div
              className="rounded-xl p-8 text-center mb-6 cursor-pointer transition-colors"
              style={{ border: '0.5px dashed rgba(29,158,117,0.4)', background: '#161C19' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setCsvFile(f) }}
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <div className="text-3xl mb-3">📂</div>
              <p className="text-sm mb-1">{csvFile ? csvFile.name : 'Drop your CSV file here'}</p>
              <p className="text-xs" style={{ color: '#7A8C82' }}>
                or click to browse · Garmin, Fitbit, Oura, generic CSV
              </p>
              <input
                id="csv-input"
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setCsvFile(f) }}
              />
            </div>

            {/* Column name guide */}
            <div className="rounded-xl p-5 mb-6" style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xs tracking-widest mb-3" style={{ color: '#7A8C82' }}>SUPPORTED COLUMN NAMES (auto-detected)</div>
              <div className="grid grid-cols-2 gap-y-1 text-xs" style={{ color: '#7A8C82' }}>
                {[
                  ['Timestamp', 'timestamp, date, datetime, startTime'],
                  ['Heart rate', 'heart_rate, hr, bpm, avg hr'],
                  ['HRV', 'hrv, hrv_rmssd, rmssd, heart_rate_variability'],
                  ['Sleep', 'sleep_total, sleep, sleep_duration, Hours of Sleep'],
                  ['Steps', 'steps, step_count, total_steps'],
                  ['Weight', 'weight_kg, weight, body_weight, mass'],
                  ['SpO₂', 'spo2, oxygen_saturation, blood_oxygen'],
                  ['Calories', 'active_calories, calories, energy_burned'],
                ].map(([label, aliases]) => (
                  <div key={label}>
                    <span style={{ color: '#E8EDE9' }}>{label}: </span>
                    <span>{aliases}</span>
                  </div>
                ))}
              </div>
            </div>

            {csvStatus && (
              <div className="text-xs px-4 py-3 rounded-lg mb-4" style={{ background: 'rgba(29,158,117,0.1)', border: '0.5px solid rgba(29,158,117,0.3)', color: '#1D9E75' }}>
                {csvStatus}
              </div>
            )}

            <button
              onClick={importCSV}
              disabled={!csvFile || csvImporting}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-opacity"
              style={{ background: '#1D9E75', color: '#fff', opacity: (!csvFile || csvImporting) ? 0.5 : 1 }}
            >
              {csvImporting ? 'Importing…' : 'Import CSV'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs" style={{ color: '#7A8C82' }}>Loading…</div>}>
      <UploadInner />
    </Suspense>
  )
}
