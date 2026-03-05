import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CleanGig — 공간 청소 매칭 플랫폼',
  description: '에어비앤비·파티룸·무인매장 공간파트너와 클린파트너를 실시간으로 연결합니다. AI 품질 검수, 자동 정산, 에스크로 결제.',
  keywords: ['청소 대행', '파티룸 청소', '에어비앤비 청소', '청소 부업', '청소 알바'],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'CleanGig' },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: 'CleanGig — 공간 청소 매칭 플랫폼',
    description: '청소 걱정 없이 공간을 운영하세요',
    siteName: 'CleanGig',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00C471',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>{children}</body>
    </html>
  )
}
