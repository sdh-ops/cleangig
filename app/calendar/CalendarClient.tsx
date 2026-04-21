'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Zap, Repeat, Plus, Calendar as CalIcon } from 'lucide-react'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import StatusChip from '@/components/common/StatusChip'
import { formatKRW } from '@/lib/utils'
import type { JobStatus } from '@/lib/types'

type Job = {
  id: string
  status: JobStatus
  price: number
  scheduled_at: string
  is_urgent?: boolean
  is_recurring?: boolean
  spaces?: { name: string; type: string }
}

type Props = {
  role: 'operator' | 'worker'
  jobs: Job[]
  year: number
  month: number // 0-indexed
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export default function CalendarClient({ role, jobs, year, month }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const monthLabel = `${year}년 ${month + 1}월`
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  // jobs indexed by date (YYYY-MM-DD local)
  const byDate = useMemo(() => {
    const map = new Map<string, Job[]>()
    jobs.forEach((j) => {
      const d = new Date(j.scheduled_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const arr = map.get(key) ?? []
      arr.push(j)
      map.set(key, arr)
    })
    return map
  }, [jobs])

  const todayKey = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const cells: { date: number | null; key: string | null }[] = []
  for (let i = 0; i < startOffset; i++) cells.push({ date: null, key: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: d, key })
  }

  const prevMonth = () => {
    const d = new Date(year, month - 1, 1)
    router.push(`/calendar?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const d = new Date(year, month + 1, 1)
    router.push(`/calendar?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const selectedJobs = selectedDate ? byDate.get(selectedDate) ?? [] : []
  const monthTotal = jobs.reduce((s, j) => s + (j.price || 0), 0)

  return (
    <div className="sseuksak-shell">
      <Header title="캘린더" showBell />

      <div className="flex-1 pb-28 px-5 pt-4">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted active:scale-95">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <CalIcon size={16} className="text-brand-dark" />
            <h2 className="text-[15px] font-black text-ink">{monthLabel}</h2>
          </div>
          <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-muted active:scale-95">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="card p-3">
            <p className="text-[11px] font-bold text-text-soft">이 달 작업</p>
            <p className="t-money text-[18px] text-ink mt-0.5">{jobs.length}건</p>
          </div>
          <div className="card p-3">
            <p className="text-[11px] font-bold text-text-soft">{role === 'operator' ? '지출 합계' : '매출 합계'}</p>
            <p className="t-money text-[18px] text-ink mt-0.5">{formatKRW(monthTotal, { short: true })}</p>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="card p-3">
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((n, i) => (
              <div
                key={n}
                className={`text-center text-[10.5px] font-black py-1.5 ${i === 0 ? 'text-danger' : i === 6 ? 'text-info' : 'text-text-soft'}`}
              >
                {n}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((c, i) => {
              if (!c.key) return <div key={i} className="aspect-square" />
              const dayJobs = byDate.get(c.key) ?? []
              const isToday = c.key === todayKey
              const isSelected = c.key === selectedDate
              const hasUrgent = dayJobs.some((j) => j.is_urgent)
              return (
                <button
                  key={c.key}
                  onClick={() => setSelectedDate(c.key)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition ${
                    isSelected
                      ? 'bg-brand text-white'
                      : isToday
                      ? 'bg-brand-softer text-brand-dark'
                      : 'hover:bg-surface-muted text-ink'
                  }`}
                >
                  <span className={`text-[13px] font-extrabold ${i % 7 === 0 && !isSelected ? 'text-danger' : ''}`}>{c.date}</span>
                  {dayJobs.length > 0 && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {dayJobs.slice(0, 3).map((_, idx) => (
                        <span
                          key={idx}
                          className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : hasUrgent && idx === 0 ? 'bg-danger' : 'bg-brand'}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected date details */}
        {selectedDate && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="h-section text-ink">{formatDateLabel(selectedDate)}</h3>
              <span className="text-[11px] font-bold text-text-faint">{selectedJobs.length}건</span>
            </div>
            {selectedJobs.length === 0 ? (
              <p className="t-caption py-8 text-center">예정된 작업이 없어요</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {selectedJobs.map((j) => {
                  const time = new Date(j.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                  const href = role === 'operator' ? `/requests/${j.id}` : `/clean/job/${j.id}`
                  return (
                    <li key={j.id}>
                      <Link href={href} className="card-interactive p-3.5 flex items-center gap-3">
                        <div className="text-[11px] font-black text-brand-dark bg-brand-softer rounded-lg px-2 py-1 shrink-0">
                          {time}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <StatusChip kind="job" status={j.status} size="sm" />
                            {j.is_urgent && <Zap size={12} className="text-danger" />}
                            {j.is_recurring && <Repeat size={12} className="text-brand-dark" />}
                          </div>
                          <p className="text-[13px] font-extrabold text-ink truncate">{j.spaces?.name}</p>
                        </div>
                        <div className="t-money text-[13px] text-ink shrink-0">{formatKRW(j.price, { short: true })}</div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {role === 'operator' && (
        <Link href="/requests/create" className="fab" aria-label="새 요청">
          <Plus size={24} strokeWidth={2.5} />
        </Link>
      )}
      <BottomNav role={role} />
    </div>
  )
}

function formatDateLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const w = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${m}/${d}(${w})`
}
