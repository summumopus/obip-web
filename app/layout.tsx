import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OBIP — Open Biometric Intelligence Platform',
  description: 'The universal OS for human biometric data. You own the key.',
  openGraph: {
    title: 'OBIP',
    description: 'Universal biometric data platform. Privacy-first. User owns everything.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-white antialiased font-mono">{children}</body>
    </html>
  )
}
