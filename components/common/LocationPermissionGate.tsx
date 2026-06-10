'use client'

import { MapPinOff } from 'lucide-react'

/**
 * 위치 권한 거부 시 안내 카드.
 * 40-60대 대상 — 쉬운 한국어, 큰 글자, 해결 방법 구체적으로.
 */
export default function LocationPermissionGate({ reason }: { reason: 'denied' | 'unavailable' | 'timeout' }) {
  const message =
    reason === 'denied'
      ? '위치 권한이 꺼져 있어요.'
      : reason === 'timeout'
        ? '위치를 찾는 데 시간이 걸리고 있어요.'
        : '이 기기에서 위치를 사용할 수 없어요.'

  const help =
    reason === 'denied'
      ? '휴대폰 설정 → 앱(브라우저) → 권한 → 위치를 "허용"으로 바꿔주세요. 그래야 가까운 일감을 찾아드리고, 도착 확인이 돼요.'
      : reason === 'timeout'
        ? '건물 안이라면 창가나 야외에서 다시 시도해 주세요.'
        : '위치 없이도 주소 검색으로 일감을 찾을 수 있어요.'

  return (
    <div className="mx-4 my-2 rounded-2xl border border-sun/40 bg-sun-soft px-4 py-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-sun/15 flex items-center justify-center shrink-0">
        <MapPinOff size={20} className="text-[#92580C]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-bold text-ink leading-snug">{message}</p>
        <p className="text-[14px] text-text-muted mt-1 leading-relaxed">{help}</p>
      </div>
    </div>
  )
}
