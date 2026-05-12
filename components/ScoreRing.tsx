'use client'

interface ScoreRingProps {
  value: number          // 0–100
  label: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  sublabel?: string
  trend?: { direction: 'up' | 'down' | 'flat'; delta: string }
}

const SIZES = {
  sm: { svg: 80,  r: 32, stroke: 7,  fontSize: 16 },
  md: { svg: 100, r: 40, stroke: 8,  fontSize: 20 },
  lg: { svg: 148, r: 58, stroke: 10, fontSize: 36 },
}

export function ScoreRing({
  value,
  label,
  color = '#1D9E75',
  size = 'md',
  sublabel,
  trend,
}: ScoreRingProps) {
  const s = SIZES[size]
  const circ = 2 * Math.PI * s.r
  const offset = circ * (1 - Math.min(Math.max(value, 0), 100) / 100)
  const cx = s.svg / 2
  const cy = s.svg / 2

  const trendColor = trend?.direction === 'up' ? '#1D9E75' : trend?.direction === 'down' ? '#E24B4A' : '#7A8C82'
  const trendArrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: s.svg, height: s.svg }}>
        <svg width={s.svg} height={s.svg} viewBox={`0 0 ${s.svg} ${s.svg}`} aria-label={`${label}: ${value} out of 100`}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={s.r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={s.stroke} />
          {/* Fill */}
          <circle
            cx={cx} cy={cy} r={s.r}
            fill="none"
            stroke={color}
            strokeWidth={s.stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: s.fontSize, fontWeight: 500, color, lineHeight: 1, fontFamily: 'DM Mono, monospace' }}>
            {value}
          </span>
          {size === 'lg' && <span className="text-xs mt-0.5" style={{ color: '#7A8C82' }}>/100</span>}
        </div>
      </div>

      <div className="text-center">
        <div className="text-xs tracking-widest uppercase" style={{ color: '#7A8C82' }}>{label}</div>
        {sublabel && <div className="text-xs mt-0.5" style={{ color: '#7A8C82' }}>{sublabel}</div>}
        {trend && (
          <div className="text-xs mt-0.5" style={{ color: trendColor }}>
            {trendArrow} {trend.delta}
          </div>
        )}
      </div>
    </div>
  )
}
