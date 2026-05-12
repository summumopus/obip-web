'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>(
    params.get('mode') === 'signup' ? 'signup' : 'login'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      })
      if (error) { setError(error.message); setLoading(false); return }
      setMessage('Check your email to confirm your account, then sign in.')
      setLoading(false)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.replace('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium" style={{ background: '#1D9E75' }}>
          OB
        </div>
        <span className="text-sm font-medium tracking-widest" style={{ color: '#1D9E75' }}>OBIP</span>
      </div>

      <div className="w-full max-w-sm">
        {/* Toggle */}
        <div className="flex rounded-lg p-1 mb-8" style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setMessage(null) }}
              className="flex-1 py-2 rounded-md text-xs tracking-widest uppercase transition-all"
              style={mode === m
                ? { background: '#1D9E75', color: '#fff' }
                : { color: '#7A8C82' }}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div>
              <label className="text-xs tracking-widest mb-2 block" style={{ color: '#7A8C82' }}>NAME</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="João Silva"
                required
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors"
                style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.08)', color: '#E8EDE9' }}
                onFocus={e => e.target.style.borderColor = '#1D9E75'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
          )}

          <div>
            <label className="text-xs tracking-widest mb-2 block" style={{ color: '#7A8C82' }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-lg text-sm outline-none"
              style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.08)', color: '#E8EDE9' }}
              onFocus={e => e.target.style.borderColor = '#1D9E75'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          <div>
            <label className="text-xs tracking-widest mb-2 block" style={{ color: '#7A8C82' }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none"
              style={{ background: '#161C19', border: '0.5px solid rgba(255,255,255,0.08)', color: '#E8EDE9' }}
              onFocus={e => e.target.style.borderColor = '#1D9E75'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {error && (
            <div className="text-xs px-4 py-3 rounded-lg" style={{ background: 'rgba(226,75,74,0.1)', border: '0.5px solid rgba(226,75,74,0.3)', color: '#E24B4A' }}>
              {error}
            </div>
          )}
          {message && (
            <div className="text-xs px-4 py-3 rounded-lg" style={{ background: 'rgba(29,158,117,0.1)', border: '0.5px solid rgba(29,158,117,0.3)', color: '#1D9E75' }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium transition-opacity mt-2"
            style={{ background: '#1D9E75', color: '#fff', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-center mt-8" style={{ color: '#7A8C82' }}>
          Built in Portugal · GDPR compliant · Your data, your key
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs" style={{ color: '#7A8C82' }}>Loading…</div>}>
      <AuthForm />
    </Suspense>
  )
}
