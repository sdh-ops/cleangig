/**
 * 공간 유형별 기본 체크리스트 템플릿
 */
import type { SpaceType, ChecklistItem } from './types'
import { rid } from './utils'

export const DEFAULT_CHECKLISTS: Record<SpaceType, { label: string; required: boolean }[]> = {
  airbnb: [
    { label: '침구 교체 및 정돈', required: true },
    { label: '화장실 전체 청소', required: true },
    { label: '주방 싱크대 / 쓰레기 처리', required: true },
    { label: '바닥 진공 + 물걸레', required: true },
    { label: '욕실 수건 / 어메니티 보충', required: true },
    { label: '창문 / 거울 닦기', required: false },
    { label: '쓰레기 분리수거', required: true },
  ],
  partyroom: [
    { label: '바닥 청소 (진공 + 물걸레)', required: true },
    { label: '테이블 / 의자 세척', required: true },
    { label: '쓰레기 다량 처리', required: true },
    { label: '주방 / 싱크대 청소', required: true },
    { label: '화장실 청소', required: true },
    { label: '냉장고 음료 재고 확인', required: false },
    { label: '음향 / 조명 이상 확인', required: false },
  ],
  studio: [
    { label: '바닥 청소 및 마루 케어', required: true },
    { label: '거울 및 유리면 닦기', required: true },
    { label: '소품 정리', required: true },
    { label: '화장실 청소', required: true },
    { label: '조명 / 장비 위치 원복', required: false },
  ],
  gym: [
    { label: '기구 소독 및 닦기', required: true },
    { label: '바닥 청소', required: true },
    { label: '수건 / 비품 정리', required: true },
    { label: '화장실 / 샤워실 청소', required: true },
    { label: '거울 닦기', required: false },
  ],
  unmanned_store: [
    { label: '매장 바닥 청소', required: true },
    { label: '진열대 정리 및 먼지 제거', required: true },
    { label: '쓰레기통 비우기', required: true },
    { label: '결제 단말기 주변 정돈', required: false },
    { label: '재고 부족 품목 확인', required: true },
  ],
  study_cafe: [
    { label: '좌석 / 책상 닦기', required: true },
    { label: '바닥 진공 청소', required: true },
    { label: '음료 / 과자 보충', required: false },
    { label: '화장실 청소', required: true },
    { label: '쓰레기 처리', required: true },
  ],
  practice_room: [
    { label: '바닥 청소', required: true },
    { label: '거울 닦기', required: true },
    { label: '쓰레기 처리', required: true },
    { label: '악기 / 장비 원위치', required: false },
  ],
  workspace: [
    { label: '데스크 / 의자 정리', required: true },
    { label: '바닥 청소', required: true },
    { label: '쓰레기 처리', required: true },
    { label: '회의실 정돈', required: false },
    { label: '화장실 / 탕비실 청소', required: true },
  ],
  other: [
    { label: '바닥 청소', required: true },
    { label: '쓰레기 처리', required: true },
    { label: '화장실 청소', required: true },
  ],
}

export function makeChecklist(type: SpaceType): ChecklistItem[] {
  return DEFAULT_CHECKLISTS[type].map((it) => ({
    id: rid('ck'),
    label: it.label,
    required: it.required,
    completed: false,
  }))
}
