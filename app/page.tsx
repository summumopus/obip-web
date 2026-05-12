'use client'
export const dynamic = 'force-dynamic'

import Link from 'next/link'

const FEATURES = [
  { icon: '⚡', title: 'Every device, one platform', desc: 'Apple Health, Garmin, Oura, Whoop, Polar, CGM — all signals unified.' },
  { icon: '🔐', title: 'You hold the key', desc: 'Technically impossible for us to read your data without your consent. Not a policy — a guarantee.' },
  { icon: '🧬', title: 'Raw signal processing', desc: 'Compute HRV from raw RR intervals, not from device-calculated numbers. Metrics no single wearable can produce.' },
  { icon: '📊', title: 'Personalised baselines', desc: 'After 30 days, scores are measured against YOUR normal — not population averages.' },
  { icon: '🩺', title: 'Doctor-ready exports', desc: 'One click to generate a FHIR R4 bundle your GP can open in any EHR system.' },
  { icon: '🌐', title: 'Open standard', desc: 'Plugin SDK lets any hardware maker connect. OBIP becomes the layer everyone speaks.' },
]

const DEVICES = [
  'Apple Health', 'Garmin', 'Oura', 'Whoop', 'Polar', 'Fitbit',
  'Withings', 'Dexcom', 'Abbott', 'Samsung',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm font-medium" style={{ background: '#1D9E75' }}>
            OB
          </div>
          <span className="text-sm font-medium tracking-widest text-white/90">
            <span style={{ color: '#1D9E75' }}>OBIP</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth" className="text-sm text-white/50 hover:text-white/80 transition-colors">
            Sign in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{ background: '#1D9E75', color: '#fff' }}
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div
          className="inline-block text-xs px-3 py-1 rounded-full mb-8 tracking-widest"
          style={{ background: 'rgba(29,158,117,0.12)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.3)' }}
        >
          OPEN BIOMETRIC INTELLIGENCE PLATFORM
        </div>

        <h1 className="text-5xl font-medium leading-tight mb-6 max-w-3xl mx-auto">
          The operating system<br />
          <span style={{ color: '#1D9E75' }}>for your body&apos;s data</span>
        </h1>

        <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: '#7A8C82', lineHeight: 1.7 }}>
          Every wearable. Every lab test. Every sensor. Unified in one place — encrypted with a key only you hold. Not medical advice. Just clarity.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/auth?mode=signup"
            className="px-6 py-3 rounded-lg font-medium text-sm transition-opacity hover:opacity-90"
            style={{ background: '#1D9E75', color: '#fff' }}
          >
            Start for free — no card needed
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg text-sm transition-colors"
            style={{ border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          >
            View demo dashboard →
          </Link>
        </div>

        {/* Score preview */}
        <div
          className="mt-16 rounded-2xl p-8 mx-auto max-w-2xl"
          style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-around">
            {[
              { label: 'Readiness', value: 76, color: '#1D9E75' },
              { label: 'Recovery', value: 68, color: '#1D9E75' },
              { label: 'Sleep', value: 75, color: '#378ADD' },
              { label: 'Fatigue', value: 40, color: '#EF9F27' },
              { label: 'Consistency', value: 85, color: '#1D9E75' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <ScoreRingSmall value={s.value} color={s.color} />
                <span className="text-xs tracking-widest uppercase" style={{ color: '#7A8C82' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-6 tracking-wider" style={{ color: '#7A8C82' }}>
            Computed by the C++ analytics engine against your personal 30-day baseline
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-5"
              style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-sm font-medium mb-2">{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#7A8C82' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Devices */}
      <section className="max-w-6xl mx-auto px-6 pb-20 text-center">
        <p className="text-xs tracking-widest mb-6" style={{ color: '#7A8C82' }}>
          WORKS WITH EVERY DEVICE YOU ALREADY OWN
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {DEVICES.map((d) => (
            <span
              key={d}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: '#1C2420', border: '0.5px solid rgba(255,255,255,0.08)', color: '#7A8C82' }}
            >
              {d}
            </span>
          ))}
          <span
            className="text-xs px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(29,158,117,0.1)', border: '0.5px solid rgba(29,158,117,0.3)', color: '#1D9E75' }}
          >
            + any plugin →
          </span>
        </div>
      </section>

      {/* CTA */}
      <section
        className="max-w-6xl mx-auto mx-6 mb-20 rounded-2xl p-12 text-center"
        style={{ background: '#161C19', border: '0.5px solid rgba(29,158,117,0.2)' }}
      >
        <h2 className="text-3xl font-medium mb-4">Own your health data.<br />Actually own it.</h2>
        <p className="text-sm mb-8" style={{ color: '#7A8C82' }}>
          Free tier includes 90 days of data, 5 score metrics, CSV import, and basic charts.
        </p>
        <Link
          href="/auth?mode=signup"
          className="inline-block px-8 py-3 rounded-lg font-medium text-sm"
          style={{ background: '#1D9E75', color: '#fff' }}
        >
          Create free account
        </Link>
        <p className="text-xs mt-4" style={{ color: '#7A8C82' }}>
          Built in Portugal · GDPR compliant · EU data residency · Open source core
        </p>
      </section>
    </div>
  )
}

// Tiny SVG ring for the hero preview
function ScoreRingSmall({ value, color }: { value: number; color: string }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - value / 100)
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle
        cx="35" cy="35" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 35 35)"
      />
      <text x="35" y="40" textAnchor="middle" fontSize="14" fontWeight="500" fill={color} fontFamily="DM Mono, monospace">
        {value}
      </text>
    </svg>
  )
}
