import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import NotificationOverlay from '@/components/common/NotificationOverlay'
import PageTransition from '@/components/common/PageTransition'
import ServiceWorkerRegister from '@/components/common/ServiceWorkerRegister'
import HapticProvider from '@/components/common/HapticProvider'
import InstallPrompt from '@/components/common/InstallPrompt'
import BetaBadge from '@/components/common/BetaBadge'

export const metadata: Metadata = {
  title: {
    default: '쓱싹 - 청소 맡기고, 청소로 돈 벌고',
    template: '%s | 쓱싹',
  },
  description:
    '청소 맡기고, 청소로 돈 벌고. 공간 운영자와 클린 파트너를 연결하는 청소 매칭 플랫폼. 원하는 시간·지역에서 부업 수익 만들고, 공간은 원클릭으로 청소 요청하세요.',
  keywords: [
    '쓱싹', '청소 매칭', '청소 부업', '청소 알바', '홈클리닝', '주말 부업',
    '파티룸 청소', '에어비앤비 청소', '무인매장 청소', '스튜디오 청소',
    '공간 운영', '청소 요청 앱', '청소 대행', 'Space Operations',
  ],
  authors: [{ name: '쓱싹' }],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '쓱싹' },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: '쓱싹 - 청소 맡기고, 청소로 돈 벌고',
    description: '공간 운영자와 클린 파트너를 연결하는 청소 매칭 플랫폼.',
    siteName: '쓱싹',
  },
  twitter: {
    card: 'summary_large_image',
    title: '쓱싹 - 청소 맡기고, 청소로 돈 벌고',
    description: '공간 운영자와 클린 파트너를 연결합니다.',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00C896',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const naverId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        {naverId && (
          <Script
            strategy="beforeInteractive"
            src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${naverId}&submodules=geocoder`}
          />
        )}
      </head>
      <body>
        <ServiceWorkerRegister />
        <HapticProvider />
        <BetaBadge />
        <NotificationOverlay />
        <PageTransition>{children}</PageTransition>
        <InstallPrompt />
      </body>
    </html>
  )
}
