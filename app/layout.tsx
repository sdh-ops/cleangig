import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import NotificationOverlay from '@/components/common/NotificationOverlay'
import PageTransition from '@/components/common/PageTransition'
import ServiceWorkerRegister from '@/components/common/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: {
    default: '쓱싹 - 공간 운영의 새로운 기준',
    template: '%s | 쓱싹',
  },
  description: '한 번에 쓱싹, 공간이 살아납니다. 파티룸·에어비앤비·무인매장의 청소/점검/보충을 원클릭으로. 에스크로 결제, AI 품질 검수, 자동 정산까지.',
  keywords: [
    '쓱싹', '청소 매칭', '파티룸 청소', '에어비앤비 청소', '무인매장 청소',
    '공간 운영', '청소 부업', '청소 알바', '홈클리닝', 'Space Operations',
  ],
  authors: [{ name: '쓱싹' }],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '쓱싹' },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: '쓱싹 - 공간 운영의 새로운 기준',
    description: '한 번에 쓱싹, 공간이 살아납니다.',
    siteName: '쓱싹',
  },
  twitter: {
    card: 'summary_large_image',
    title: '쓱싹 - 공간 운영의 새로운 기준',
    description: '한 번에 쓱싹, 공간이 살아납니다.',
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
        <NotificationOverlay />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  )
}
