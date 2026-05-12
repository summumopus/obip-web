'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine
} from 'recharts'
import { supabase, getBiometricRecords } from '@/lib/supabase'
import type { BiometricRecord } from '@/lib/supabase'
import { analyzeRecords, toChartSeries } from '@/lib/analytics'
import type { AnalyticsResult } from '@/lib/analytics'
import { ScoreRing } from '@/components/ScoreRing'

// ── Nav items ─────────────────────────────────────────────────
const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: '▦' },
  { label: 'Insights', href: '/insights', icon: '◈' },
  { label: 'Import', href: '/upload', icon: '↑' },
  { label: 'Devices', href: '/devices', icon: '⌘' },
  { label: 'Share', href: '/share', icon: '⊕' },
  { label: 'Settings', href: '/settings', icon: '⚙' },
]

const WINDOWS = [7, 14, 30, 90]

// ── Chart tooltip ─────────────────────────────────────────────
type ChartTipProps = {
  active?: boolean
  payload?: Array<{ value?: number } | undefined>
  label?: string | number
}

function ChartTip({ active, payload, label }: ChartTipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#1C2420', border: '0.5px solid rgba(255,255,255,0.12)' }}>
      <div style={{ color: '#7A8C82' }}>{label}</div>
      <div style={{ color: '#E8EDE9', fontWeight: 500 }}>{payload[0]?.value}</div>
    </div>
  )
}

// ── Trend badge ───────────────────────────────────────────────
function TrendBadge({ direction }: { direction?: string }) {
  if (!direction) return null
  const map: Record<string, { label: string; color: string; bg: string }> = {
    improving: { label: '↑ improving', color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' },
    stable: { label: '→ stable', color: '#7A8C82', bg: 'rgba(255,255,255,0.06)' },
    worsening: { label: '↓ worsening', color: '#E24B4A', bg: 'rgba(226,75,74,0.12)' },
  }
  const s = map[direction] ?? map.stable
  return (
    <span className="text-xs px-2 py-0.5 rounded" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplay] = useState('')
  const [window, setWindow] = useState(14)
  const [records, setRecords] = useState<BiometricRecord[]>([])
  const [result, setResult] = useState<AnalyticsResult | null>(null)
  const [loading, setLoading] = useState(true)

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth'); return }
      setUserId(data.session.user.id)
    })
    supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace('/auth')
    })
  }, [router])

  // Load profile
  useEffect(() => {
    if (!userId) return
    supabase.from('profiles').select('display_name').eq('id', userId).single()
      .then(({ data }) => setDisplay(data?.display_name ?? 'there'))
  }, [userId])

  // Load records + compute
  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const recs = await getBiometricRecords(userId, window)
    setRecords(recs)
    setResult(analyzeRecords(recs))
    setLoading(false)
  }, [userId, window])

  useEffect(() => { load() }, [load])

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  // Chart series
  const hrvSeries = toChartSeries(records, 'hrv_rmssd')
  const rhrSeries = toChartSeries(records, 'resting_heart_rate')
  const sleepSeries = toChartSeries(records, 'sleep_total').map(d => ({ ...d, value: +(d.value / 60).toFixed(1) }))
  const stepsSeries = toChartSeries(records, 'steps')
  const weightSeries = toChartSeries(records, 'weight_kg')
  const glucoseSeries = toChartSeries(records, 'glucose_mg_dl')

  const scores = result?.scores
  const trends = result?.trends ?? {}
  const anomalies = result?.anomalies ?? []

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0E1210' }}>

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col py-5" style={{ background: '#161C19', borderRight: '0.5px solid rgba(255,255,255,0.07)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 mb-8">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-medium" style={{ background: '#1D9E75' }}>OB</div>
          <span className="text-xs font-medium tracking-widest" style={{ color: '#1D9E75' }}>OBIP</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-colors"
              style={n.href === '/dashboard'
                ? { background: 'rgba(29,158,117,0.12)', color: '#1D9E75' }
                : { color: '#7A8C82' }}
            >
              <span>{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Data sources status */}
        <div className="mt-auto px-4">
          <div className="text-xs tracking-widest mb-3" style={{ color: '#7A8C82', opacity: 0.6 }}>SOURCES</div>
          {[
            { name: 'Manual entry', status: 'active' },
            { name: 'CSV import', status: 'active' },
            { name: 'Apple Health', status: 'soon' },
          ].map(s => (
            <div key={s.name} className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.status === 'active' ? '#1D9E75' : '#7A8C82' }} />
              <span className="text-xs" style={{ color: '#7A8C82' }}>{s.name}</span>
            </div>
          ))}

          <button
            onClick={signOut}
            className="mt-4 w-full text-xs py-2 rounded-lg transition-colors text-left px-3"
            style={{ color: '#7A8C82', border: '0.5px solid rgba(255,255,255,0.06)' }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto px-6 py-5">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium">{greeting}, {displayName}</h1>
            <p className="text-xs mt-1" style={{ color: '#7A8C82' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {result && ` · ${result.data_points} data points`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Window selector */}
            <div className="flex p-1 rounded-lg gap-0.5" style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              {WINDOWS.map(w => (
                <button
                  key={w}
                  onClick={() => setWindow(w)}
                  className="px-3 py-1.5 rounded-md text-xs transition-all"
                  style={window === w
                    ? { background: '#1D9E75', color: '#fff' }
                    : { color: '#7A8C82' }}
                >
                  {w}d
                </button>
              ))}
            </div>
            <Link
              href="/upload"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: '#1D9E75', color: '#fff' }}
            >
              + Add data
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-xs" style={{ color: '#7A8C82' }}>
            Computing…
          </div>
        ) : (
          <>
            {/* No data state */}
            {records.length === 0 && (
              <div className="rounded-xl p-8 text-center mb-6" style={{ background: '#161C19', border: '0.5px dashed rgba(29,158,117,0.3)' }}>
                <div className="text-2xl mb-3">📊</div>
                <p className="text-sm mb-1">No biometric data yet</p>
                <p className="text-xs mb-5" style={{ color: '#7A8C82' }}>Add your first entry manually or import a CSV to see your scores</p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/upload" className="px-4 py-2 rounded-lg text-xs" style={{ background: '#1D9E75', color: '#fff' }}>
                    Add manually
                  </Link>
                  <Link href="/upload?tab=csv" className="px-4 py-2 rounded-lg text-xs" style={{ border: '0.5px solid rgba(255,255,255,0.1)', color: '#7A8C82' }}>
                    Import CSV
                  </Link>
                </div>
              </div>
            )}

            {/* Score rings */}
            {scores && (
              <div className="grid grid-cols-5 gap-4 mb-6 p-5 rounded-xl" style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <ScoreRing value={scores.readiness} label="Readiness" size="lg" color="#1D9E75" trend={scores.readiness > 70 ? { direction: 'up', delta: 'good' } : undefined} />
                <ScoreRing value={scores.recovery} label="Recovery" size="md" color="#1D9E75" />
                <ScoreRing value={scores.sleep_score} label="Sleep" size="md" color="#378ADD" />
                <ScoreRing value={scores.fatigue} label="Fatigue" size="md" color={scores.fatigue > 60 ? '#E24B4A' : '#EF9F27'} sublabel="lower is better" />
                <ScoreRing value={scores.consistency} label="Consistency" size="md" color="#1D9E75" />
              </div>
            )}

            {/* Anomaly alerts */}
            {anomalies.length > 0 && (
              <div className="mb-6 flex flex-col gap-2">
                {anomalies.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-lg text-xs" style={{ background: 'rgba(239,159,39,0.08)', border: '0.5px solid rgba(239,159,39,0.25)' }}>
                    <span style={{ color: '#EF9F27' }}>⚠</span>
                    <span style={{ color: '#EF9F27' }}>Anomaly in <strong>{a.field}</strong>: {a.value} ({a.z_score}σ from baseline) on {new Date(a.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Charts grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">

              {/* HRV */}
              {hrvSeries.length > 0 && (
                <ChartCard
                  title="HRV (RMSSD)"
                  value={hrvSeries[hrvSeries.length - 1]?.value}
                  unit="ms"
                  baseline={result?.baselines?.hrv_rmssd}
                  trend={<TrendBadge direction={trends.hrv_rmssd?.direction} />}
                  color="#1D9E75"
                >
                  <ResponsiveContainer width="100%" height={90}>
                    <LineChart data={hrvSeries}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip content={<ChartTip />} />
                      {result?.baselines?.hrv_rmssd && (
                        <ReferenceLine y={result.baselines.hrv_rmssd} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                      )}
                      <Line type="monotone" dataKey="value" stroke="#1D9E75" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* RHR */}
              {rhrSeries.length > 0 && (
                <ChartCard
                  title="Resting Heart Rate"
                  value={rhrSeries[rhrSeries.length - 1]?.value}
                  unit="bpm"
                  baseline={result?.baselines?.resting_heart_rate}
                  trend={<TrendBadge direction={trends.resting_heart_rate?.direction} />}
                  color="#378ADD"
                >
                  <ResponsiveContainer width="100%" height={90}>
                    <LineChart data={rhrSeries}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip content={<ChartTip />} />
                      <Line type="monotone" dataKey="value" stroke="#378ADD" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Sleep */}
              {sleepSeries.length > 0 && (
                <ChartCard
                  title="Sleep duration"
                  value={sleepSeries[sleepSeries.length - 1]?.value}
                  unit="hrs"
                  trend={<TrendBadge direction={trends.sleep_total?.direction} />}
                  color="#7F77DD"
                >
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={sleepSeries}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={[0, 10]} />
                      <Tooltip content={<ChartTip />} />
                      <ReferenceLine y={8} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                      <Bar dataKey="value" fill="#7F77DD" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Steps */}
              {stepsSeries.length > 0 && (
                <ChartCard
                  title="Steps"
                  value={stepsSeries[stepsSeries.length - 1]?.value?.toLocaleString()}
                  unit="today"
                  trend={<TrendBadge direction={trends.steps?.direction} />}
                  color="#EF9F27"
                >
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={stepsSeries}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip content={<ChartTip />} />
                      <ReferenceLine y={10000} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                      <Bar dataKey="value" fill="#EF9F27" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Weight */}
              {weightSeries.length > 0 && (
                <ChartCard
                  title="Weight"
                  value={weightSeries[weightSeries.length - 1]?.value}
                  unit="kg"
                  trend={<TrendBadge direction={trends.weight_kg?.direction} />}
                  color="#7A8C82"
                >
                  <ResponsiveContainer width="100%" height={90}>
                    <LineChart data={weightSeries}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip content={<ChartTip />} />
                      <Line type="monotone" dataKey="value" stroke="#7A8C82" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Glucose */}
              {glucoseSeries.length > 0 && (
                <ChartCard
                  title="Blood glucose"
                  value={glucoseSeries[glucoseSeries.length - 1]?.value}
                  unit="mg/dL"
                  trend={<TrendBadge direction={trends.glucose_mg_dl?.direction} />}
                  color="#E24B4A"
                >
                  <ResponsiveContainer width="100%" height={90}>
                    <LineChart data={glucoseSeries}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={[60, 180]} />
                      <Tooltip content={<ChartTip />} />
                      <ReferenceLine y={100} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="value" stroke="#E24B4A" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

            </div>

            {/* Empty charts prompt */}
            {records.length > 0 && hrvSeries.length === 0 && sleepSeries.length === 0 && (
              <div className="text-xs text-center py-6" style={{ color: '#7A8C82' }}>
                Data found but no chart fields populated yet — try importing HRV, sleep, or steps data.
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-2 pt-4" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs" style={{ color: '#7A8C82' }}>
                Computed by OBIP analytics engine · {window}d window · not medical advice
              </span>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = 'obip-export.json'; a.click()
                }}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: '#7A8C82', border: '0.5px solid rgba(255,255,255,0.07)' }}
              >
                Export JSON
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

// ── Chart card wrapper ────────────────────────────────────────
function ChartCard({
  title, value, unit, baseline, trend, color, children
}: {
  title: string
  value: number | string | undefined
  unit: string
  baseline?: number
  trend?: React.ReactNode
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs mb-1" style={{ color: '#7A8C82' }}>{title}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium" style={{ color }}>{value ?? '—'}</span>
            <span className="text-xs" style={{ color: '#7A8C82' }}>{unit}</span>
            {baseline != null && (
              <span className="text-xs" style={{ color: '#7A8C82' }}>· baseline {baseline}</span>
            )}
          </div>
        </div>
        {trend}
      </div>
      {children}
    </div>
  )
}
