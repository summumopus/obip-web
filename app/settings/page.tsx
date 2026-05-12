'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId]     = useState<string | null>(null)
  const [name, setName]         = useState('')
  const [dob, setDob]           = useState('')
  const [sex, setSex]           = useState('')
  const [height, setHeight]     = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/auth'); return }
      const uid = data.session.user.id
      setUserId(uid)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single()
      if (profile) {
        setName(profile.display_name ?? '')
        setDob(profile.date_of_birth ?? '')
        setSex(profile.sex ?? '')
        setHeight(profile.height_cm?.toString() ?? '')
        setTimezone(profile.timezone ?? 'UTC')
      }
    })
  }, [router])

  async function saveProfile() {
    if (!userId) return
    setSaving(true)
    await supabase.from('profiles').update({
      display_name: name,
      date_of_birth: dob || null,
      sex: sex || null,
      height_cm: height ? parseFloat(height) : null,
      timezone,
    }).eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function exportData() {
    if (!userId) return
    const { data } = await supabase.from('biometric_records').select('*').eq('user_id', userId)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `obip-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  async function deleteAccount() {
    if (!userId) return
    setDeleting(true)
    // Delete all data — RLS cascade will handle the rest
    await supabase.from('biometric_records').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    await supabase.auth.signOut()
    router.replace('/')
  }

  const inputStyle = {
    background: '#161C19', border: '0.5px solid rgba(255,255,255,0.08)',
    color: '#E8EDE9', borderRadius: 8, padding: '8px 12px',
    fontSize: 13, width: '100%', outline: 'none', fontFamily: 'DM Mono, monospace',
  }

  return (
    <div className="min-h-screen" style={{ background: '#0E1210' }}>
      <div className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161C19' }}>
        <Link href="/dashboard" className="text-xs" style={{ color: '#7A8C82' }}>← Dashboard</Link>
        <span className="text-sm font-medium">Settings</span>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Profile */}
        <section className="rounded-xl p-6" style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-medium mb-5">Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs tracking-widest mb-2 block" style={{ color: '#7A8C82' }}>DISPLAY NAME</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#1D9E75')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
            </div>
            <div>
              <label className="text-xs tracking-widest mb-2 block" style={{ color: '#7A8C82' }}>DATE OF BIRTH</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#1D9E75')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
            </div>
            <div>
              <label className="text-xs tracking-widest mb-2 block" style={{ color: '#7A8C82' }}>SEX</label>
              <select value={sex} onChange={e => setSex(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="intersex">Intersex</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="text-xs tracking-widest mb-2 block" style={{ color: '#7A8C82' }}>HEIGHT (cm)</label>
              <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#1D9E75')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
            </div>
            <div>
              <label className="text-xs tracking-widest mb-2 block" style={{ color: '#7A8C82' }}>TIMEZONE</label>
              <input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="UTC" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#1D9E75')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button onClick={saveProfile} disabled={saving}
              className="px-5 py-2 rounded-lg text-xs font-medium"
              style={{ background: '#1D9E75', color: '#fff', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            {saved && <span className="text-xs" style={{ color: '#1D9E75' }}>✓ Saved</span>}
          </div>
        </section>

        {/* Data */}
        <section className="rounded-xl p-6" style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-medium mb-2">Your data</h2>
          <p className="text-xs mb-5" style={{ color: '#7A8C82' }}>Export a full copy of all your biometric records as JSON.</p>
          <button onClick={exportData}
            className="px-5 py-2 rounded-lg text-xs"
            style={{ border: '0.5px solid rgba(29,158,117,0.4)', color: '#1D9E75' }}>
            Export all data (JSON)
          </button>
        </section>

        {/* Danger zone */}
        <section className="rounded-xl p-6" style={{ background: '#161C19', border: '0.5px solid rgba(226,75,74,0.2)' }}>
          <h2 className="text-sm font-medium mb-2" style={{ color: '#E24B4A' }}>Danger zone</h2>
          <p className="text-xs mb-5" style={{ color: '#7A8C82' }}>
            Permanently delete your account and all biometric data. This cannot be undone.
          </p>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="px-5 py-2 rounded-lg text-xs"
              style={{ border: '0.5px solid rgba(226,75,74,0.4)', color: '#E24B4A' }}>
              Delete account
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={deleteAccount} disabled={deleting}
                className="px-5 py-2 rounded-lg text-xs font-medium"
                style={{ background: '#E24B4A', color: '#fff', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs" style={{ color: '#7A8C82' }}>
                Cancel
              </button>
            </div>
          )}
        </section>

        <p className="text-xs text-center" style={{ color: '#7A8C82' }}>
          OBIP v0.2 · Built in Portugal · Not medical advice
        </p>
      </div>
    </div>
  )
}
