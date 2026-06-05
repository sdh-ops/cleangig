import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default async function Icon() {
  // Noto Sans KR 900 — 한글 쓱싹 렌더링
  // Google Fonts CSS → woff2 URL 파싱 → 폰트 데이터 로드
  let fontData: ArrayBuffer | null = null
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36' } }
    ).then(r => r.text())
    const woff2Url = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1]
    if (woff2Url) fontData = await fetch(woff2Url).then(r => r.arrayBuffer())
  } catch { /* fallback to geometric design */ }

  // 폰트 없으면 이모지/심볼 기반 디자인
  if (!fontData) {
    return new ImageResponse(
      (
        <div
          style={{
            width: 512, height: 512,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(145deg, #38BDF8 0%, #0EA5E9 45%, #0369A1 100%)',
            borderRadius: 108,
          }}
        >
          {/* 외부 링 */}
          <div style={{
            position: 'absolute', width: 370, height: 370, borderRadius: 185,
            border: '5px solid rgba(255,255,255,0.15)',
            top: 71, left: 71, display: 'flex',
          }} />
          {/* 내부 글로우 */}
          <div style={{
            position: 'absolute', width: 260, height: 260, borderRadius: 130,
            background: 'rgba(255,255,255,0.1)',
            top: 126, left: 126, display: 'flex',
          }} />
          {/* 중앙 스파클 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <span style={{ fontSize: 200, lineHeight: 1 }}>✦</span>
            <div style={{
              fontSize: 56, fontWeight: 900, color: 'rgba(255,255,255,0.75)',
              fontFamily: 'sans-serif', letterSpacing: 4, marginTop: 4,
            }}>SSEUKSAK</div>
          </div>
        </div>
      ),
      { width: 512, height: 512 }
    )
  }

  // 폰트 로드 성공 → 쓱싹✦ 텍스트 아이콘
  return new ImageResponse(
    (
      <div
        style={{
          width: 512, height: 512,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(145deg, #38BDF8 0%, #0EA5E9 45%, #0369A1 100%)',
          borderRadius: 108,
          position: 'relative',
        }}
      >
        {/* 글로우 원 */}
        <div style={{
          position: 'absolute', width: 340, height: 340, borderRadius: 170,
          background: 'rgba(255,255,255,0.08)',
          top: 86, left: 86, display: 'flex',
        }} />
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 0, zIndex: 1,
        }}>
          <span style={{
            fontSize: 190, fontWeight: 900, color: 'white',
            fontFamily: 'NotoSansKR', lineHeight: 1, letterSpacing: -6,
            textShadow: '0 4px 32px rgba(3,105,161,0.45)',
          }}>쓱싹</span>
          <span style={{ fontSize: 68, color: 'rgba(255,255,255,0.6)', lineHeight: 1, marginTop: 4 }}>
            ✦
          </span>
        </div>
      </div>
    ),
    {
      width: 512, height: 512,
      fonts: [{ name: 'NotoSansKR', data: fontData, weight: 900, style: 'normal' as const }],
    }
  )
}
