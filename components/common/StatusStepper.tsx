'use client'

import { Check, AlertTriangle, XCircle } from 'lucide-react'
import {
  OPERATOR_STEPS,
  WORKER_STEPS,
  toDisplayStep,
  statusSubline,
  type ViewerRole,
} from '@/lib/statusDisplay'
import type { JobStatus } from '@/lib/types'

type Props = {
  status: JobStatus
  role: ViewerRole
  /** 서브 문구 숨김 (홈 카드 등 좁은 곳) */
  hideSubline?: boolean
}

/**
 * 가로 5단계 진행 표시기 — 40-60대 기준 큰 글자·높은 대비.
 * 내부 상태 10개 대신 사용자가 이해하는 5단계만 노출.
 * DISPUTED/CANCELED는 단계 대신 배너.
 */
export default function StatusStepper({ status, role, hideSubline = false }: Props) {
  const steps = role === 'operator' ? OPERATOR_STEPS : WORKER_STEPS
  const current = toDisplayStep(status, role)

  if (current === null) {
    const isDisputed = status === 'DISPUTED'
    return (
      <div
        className={`rounded-2xl px-4 py-3.5 flex items-center gap-3 border ${
          isDisputed ? 'bg-danger-soft border-danger/25' : 'bg-surface-muted border-line-soft'
        }`}
      >
        {isDisputed ? (
          <AlertTriangle size={20} className="text-danger shrink-0" />
        ) : (
          <XCircle size={20} className="text-text-muted shrink-0" />
        )}
        <p className={`text-[16px] font-extrabold ${isDisputed ? 'text-danger' : 'text-text-muted'}`}>
          {statusSubline(status, role)}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start">
        {steps.map((s, idx) => {
          const isDone = s.step < current
          const isCurrent = s.step === current
          return (
            <div key={s.step} className="flex-1 flex flex-col items-center relative">
              {/* 연결선 (첫 단계 제외) */}
              {idx > 0 && (
                <div
                  className={`absolute top-[14px] right-1/2 w-full h-[3px] -z-0 ${
                    s.step <= current ? 'bg-brand' : 'bg-line'
                  }`}
                />
              )}
              {/* 동그라미 */}
              <div
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-[3px] ${
                  isDone
                    ? 'bg-brand border-brand text-white'
                    : isCurrent
                      ? 'bg-surface border-brand text-brand-dark'
                      : 'bg-surface border-line text-text-faint'
                }`}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={3.5} />
                ) : (
                  <span className="text-[13px] font-black">{s.step}</span>
                )}
              </div>
              {/* 라벨 */}
              <span
                className={`mt-1.5 text-center leading-tight ${
                  isCurrent
                    ? 'text-[15px] font-black text-ink'
                    : 'text-[12.5px] font-bold text-text-faint'
                }`}
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
      {!hideSubline && (
        <p className="mt-3 text-[15px] font-bold text-brand-dark text-center bg-brand-softer rounded-xl py-2.5 px-3">
          {statusSubline(status, role)}
        </p>
      )}
    </div>
  )
}
