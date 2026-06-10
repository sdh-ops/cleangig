/**
 * 사용자용 5단계 상태 표시 레이어.
 *
 * 내부 상태 10개(OPEN~CANCELED)는 cron·정산·분쟁이 의존하므로 그대로 두고,
 * 화면에는 40-60대가 한눈에 이해하는 5단계만 보여준다.
 * DISPUTED/CANCELED는 단계가 아닌 별도 배너로 처리.
 */

import type { JobStatus } from '@/lib/types'

export type ViewerRole = 'operator' | 'worker'

export interface StatusStep {
  /** 1-based 단계 번호 */
  step: number
  label: string
}

/** 5단계 정의 (역할별 라벨) */
export const OPERATOR_STEPS: StatusStep[] = [
  { step: 1, label: '요청' },
  { step: 2, label: '배정' },
  { step: 3, label: '청소 중' },
  { step: 4, label: '확인' },
  { step: 5, label: '완료' },
]

export const WORKER_STEPS: StatusStep[] = [
  { step: 1, label: '배정' },
  { step: 2, label: '이동' },
  { step: 3, label: '청소' },
  { step: 4, label: '확인 대기' },
  { step: 5, label: '입금' },
]

/** 내부 상태 → 5단계 매핑. DISPUTED/CANCELED는 null (배너 처리). */
export function toDisplayStep(status: JobStatus, role: ViewerRole): number | null {
  if (status === 'DISPUTED' || status === 'CANCELED') return null
  if (role === 'operator') {
    switch (status) {
      case 'OPEN': return 1
      case 'ASSIGNED':
      case 'EN_ROUTE':
      case 'ARRIVED': return 2
      case 'IN_PROGRESS': return 3
      case 'SUBMITTED': return 4
      case 'APPROVED':
      case 'PAID_OUT': return 5
    }
  }
  switch (status) {
    case 'OPEN':
    case 'ASSIGNED': return 1
    case 'EN_ROUTE':
    case 'ARRIVED': return 2
    case 'IN_PROGRESS': return 3
    case 'SUBMITTED': return 4
    case 'APPROVED':
    case 'PAID_OUT': return 5
  }
}

/** 현재 상태의 실시간 서브 문구 (단계 안의 디테일) */
export function statusSubline(status: JobStatus, role: ViewerRole): string {
  if (role === 'operator') {
    switch (status) {
      case 'OPEN': return '클린파트너를 찾고 있어요'
      case 'ASSIGNED': return '클린파트너가 배정됐어요'
      case 'EN_ROUTE': return '지금 이동 중이에요 🚶'
      case 'ARRIVED': return '현장에 도착했어요 📍'
      case 'IN_PROGRESS': return '청소하고 있어요 🧹'
      case 'SUBMITTED': return '청소가 끝났어요. 사진을 확인해 주세요'
      case 'APPROVED': return '확인 완료! 정산을 준비하고 있어요'
      case 'PAID_OUT': return '모든 절차가 끝났어요'
      case 'DISPUTED': return '문제를 확인하고 있어요'
      case 'CANCELED': return '취소된 요청이에요'
    }
  }
  switch (status) {
    case 'OPEN': return '지원하면 바로 배정돼요'
    case 'ASSIGNED': return '예약 시간에 맞춰 출발해 주세요'
    case 'EN_ROUTE': return '현장으로 이동 중이에요'
    case 'ARRIVED': return '도착! 출입 비밀번호를 확인하세요'
    case 'IN_PROGRESS': return '체크리스트를 하나씩 완료해 주세요'
    case 'SUBMITTED': return '사장님이 확인하고 있어요 (최대 24시간)'
    case 'APPROVED': return '확인 완료! 곧 입금돼요'
    case 'PAID_OUT': return '입금까지 끝났어요 🎉'
    case 'DISPUTED': return '문제를 확인하고 있어요'
    case 'CANCELED': return '취소된 작업이에요'
  }
}
