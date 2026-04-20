import React from 'react'
import type { JobStatus, PaymentStatus } from '@/lib/types'

type Tone = 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'muted' | 'sun'

const JOB_MAP: Record<JobStatus, { label: string; tone: Tone }> = {
  OPEN: { label: '매칭 대기', tone: 'sun' },
  ASSIGNED: { label: '매칭 완료', tone: 'info' },
  EN_ROUTE: { label: '이동 중', tone: 'info' },
  ARRIVED: { label: '현장 도착', tone: 'brand' },
  IN_PROGRESS: { label: '청소 중', tone: 'brand' },
  SUBMITTED: { label: '검수 대기', tone: 'warning' },
  APPROVED: { label: '완료', tone: 'success' },
  DISPUTED: { label: '분쟁', tone: 'danger' },
  PAID_OUT: { label: '정산 완료', tone: 'success' },
  CANCELED: { label: '취소', tone: 'muted' },
}

const PAYMENT_MAP: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: '결제 대기', tone: 'warning' },
  HELD: { label: '에스크로 보관', tone: 'info' },
  RELEASED: { label: '정산 완료', tone: 'success' },
  REFUNDED: { label: '환불', tone: 'muted' },
  FAILED: { label: '결제 실패', tone: 'danger' },
}

type Props =
  | { kind: 'job'; status: JobStatus; size?: 'sm' | 'md' }
  | { kind: 'payment'; status: PaymentStatus; size?: 'sm' | 'md' }
  | { kind: 'custom'; label: string; tone: Tone; size?: 'sm' | 'md' }

export default function StatusChip(props: Props) {
  const { size = 'md' } = props
  let label: string, tone: Tone

  if (props.kind === 'job') ({ label, tone } = JOB_MAP[props.status])
  else if (props.kind === 'payment') ({ label, tone } = PAYMENT_MAP[props.status])
  else ({ label, tone } = props)

  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
  return <span className={`chip chip-${tone} ${sizeCls}`}>{label}</span>
}
