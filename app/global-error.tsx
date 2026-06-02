'use client'

import { useEffect } from 'react'

// 루트 레이아웃에서 발생한 오류를 잡는 최후의 경계.
// 레이아웃을 대체하므로 자체 <html>/<body>를 렌더링해야 한다.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Root layout error:', error)
  }, [error])

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#F8FAFC',
          color: '#0F172A',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>
          앱을 불러오지 못했어요
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', maxWidth: 320, lineHeight: 1.5 }}>
          일시적인 오류가 발생했습니다. 다시 시도해주세요.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: 24,
            height: 48,
            padding: '0 24px',
            borderRadius: 12,
            border: 'none',
            background: '#00C471',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  )
}
