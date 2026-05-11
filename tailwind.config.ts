import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1D9E75',
          dim:     'rgba(29,158,117,0.15)',
          glow:    'rgba(29,158,117,0.35)',
        },
        surface: {
          DEFAULT: '#161C19',
          2:       '#1C2420',
        },
        bg: '#0E1210',
      },
      fontFamily: {
        mono: ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
