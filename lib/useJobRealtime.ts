'use client'

/**
 * jobs 테이블 실시간 구독 훅.
 *
 * 견고성 설계:
 * - postgres_changes 사용 (쓰기 주체가 워커 클라이언트·cron·admin API·결제 confirm 등 다수
 *   → broadcast는 누락 위험, DB가 직접 발화해야 함)
 * - 소켓 실패(CHANNEL_ERROR/TIMED_OUT) 시 20초 폴링 폴백 — 어떤 경우에도 갱신 보장
 * - visibilitychange 복귀 시 재구독 + 즉시 refetch (모바일 PWA 백그라운드가 소켓 죽임)
 * - RLS 주의: OPEN→ASSIGNED 전환 시 제3자 워커는 새 row SELECT 불가 → UPDATE 이벤트 미수신.
 *   open-jobs 리스트는 pollMs 옵션으로 주기 폴링 병행 필수.
 */

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/lib/types'

/**
 * realtime payload의 new row — join 없음, jobs 컬럼만.
 * 실제 테이블엔 Job 인터페이스에 없는 컬럼(supply_status, completion_photos 등)도 있어
 * Record<string, unknown> 교차로 superset 허용.
 */
export type JobRealtimeRow = Partial<Job> & { id: string } & Record<string, unknown>

const FALLBACK_POLL_MS = 20_000
const REFRESH_DEBOUNCE_MS = 400

interface SingleOptions {
  /** UPDATE 수신 시 새 row (join 없음 — 소비자가 기존 상태에 병합) */
  onUpdate: (row: JobRealtimeRow) => void
  /** 폴백 폴링·백그라운드 복귀 시 전체 재조회 */
  refetch?: () => void
}

/** 단건 작업 상세용 — 워커/사장님 상세 화면 */
export function useJobRealtime(jobId: string | undefined, options: SingleOptions) {
  const optsRef = useRef(options)
  optsRef.current = options

  useEffect(() => {
    if (!jobId) return
    const supabase = createClient()
    let channel: RealtimeChannel | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let disposed = false

    const stopPolling = () => {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
    }
    const startPolling = () => {
      if (pollTimer || disposed || !optsRef.current.refetch) return
      pollTimer = setInterval(() => optsRef.current.refetch?.(), FALLBACK_POLL_MS)
    }

    const subscribe = () => {
      if (disposed) return
      if (channel) supabase.removeChannel(channel)
      channel = supabase
        .channel(`job:${jobId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
          (payload) => {
            optsRef.current.onUpdate(payload.new as JobRealtimeRow)
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') stopPolling()
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') startPolling()
        })
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      // 백그라운드 동안 놓친 변경 즉시 반영 + 죽은 소켓 재구독
      optsRef.current.refetch?.()
      subscribe()
    }

    subscribe()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disposed = true
      stopPolling()
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [jobId])
}

interface ListOptions {
  /**
   * postgres_changes filter (예: `operator_id=eq.${userId}`).
   * 생략 시 jobs 전체 변경 구독 (RLS가 보이는 row만 전달).
   */
  filter?: string
  /**
   * 주기 폴링 간격(ms). open-jobs 리스트처럼 RLS 때문에
   * 이벤트가 안 오는 화면은 반드시 지정 (권장 30000).
   */
  pollMs?: number
  /** 변경 감지 시 호출 — 리스트 재조회 (debounce 적용됨) */
  onRefresh: () => void
}

/** 리스트용 — 대시보드·요청 목록·일감 찾기. 이벤트/폴링/복귀 모두 onRefresh로 수렴. */
export function useJobsRealtime({ filter, pollMs, onRefresh }: ListOptions) {
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel | null = null
    let fallbackTimer: ReturnType<typeof setInterval> | null = null
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const refresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => refreshRef.current(), REFRESH_DEBOUNCE_MS)
    }

    const stopFallback = () => {
      if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null }
    }
    const startFallback = () => {
      if (fallbackTimer || disposed) return
      fallbackTimer = setInterval(() => refreshRef.current(), FALLBACK_POLL_MS)
    }

    const subscribe = () => {
      if (disposed) return
      if (channel) supabase.removeChannel(channel)
      channel = supabase
        .channel(`jobs-list:${filter ?? 'all'}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'jobs', ...(filter ? { filter } : {}) },
          () => refresh(),
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') stopFallback()
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') startFallback()
        })
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      refreshRef.current()
      subscribe()
    }

    subscribe()
    document.addEventListener('visibilitychange', onVisible)

    // RLS 사각지대 보완용 주기 폴링 (소켓 상태와 무관하게 동작)
    let periodicTimer: ReturnType<typeof setInterval> | null = null
    if (pollMs && pollMs > 0) {
      periodicTimer = setInterval(() => refreshRef.current(), pollMs)
    }

    return () => {
      disposed = true
      stopFallback()
      if (debounceTimer) clearTimeout(debounceTimer)
      if (periodicTimer) clearInterval(periodicTimer)
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [filter, pollMs])
}
