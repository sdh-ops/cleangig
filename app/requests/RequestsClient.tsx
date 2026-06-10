'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Clock,
  ChevronRight,
  List,
  CalendarDays,
  MapPin,
} from 'lucide-react'
import CalendarView from '@/components/common/CalendarView'
import EmptyState from '@/components/common/EmptyState'
import StatusChip from '@/components/common/StatusChip'
import { formatKRW, formatScheduled } from '@/lib/utils'
import { useJobsRealtime } from '@/lib/useJobRealtime'
import type { JobStatus } from '@/lib/types'

interface Job {
  id: string
  status: string
  price: number
  scheduled_at: string
  spaces?: { name: string; address: string; type: string }
  cleaner?: { name: string; profile_image?: string }
}

interface Props {
  jobs: Job[]
  currentTab: string
}

const CALENDAR_COLOR: Record<string, string> = {
  OPEN:        'bg-amber-100 text-amber-800 border-amber-400',
  ASSIGNED:    'bg-emerald-100 text-emerald-800 border-emerald-400',
  EN_ROUTE:    'bg-blue-100 text-blue-800 border-blue-400',
  ARRIVED:     'bg-blue-100 text-blue-800 border-blue-400',
  IN_PROGRESS: 'bg-brand-softer text-brand-dark border-brand',
  SUBMITTED:   'bg-purple-100 text-purple-800 border-purple-400',
  APPROVED:    'bg-slate-100 text-slate-700 border-slate-400',
  DISPUTED:    'bg-red-100 text-red-800 border-red-400',
  PAID_OUT:    'bg-slate-100 text-slate-700 border-slate-400',
  CANCELED:    'bg-slate-100 text-slate-400 border-slate-300',
}

export default function RequestsClient({ jobs }: Props) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  // 내 요청 상태 변화 실시간 반영 (RLS가 본인 job만 이벤트 전달)
  useJobsRealtime({ onRefresh: () => router.refresh() })

  const calendarEvents = jobs.map((j) => ({
    id: j.id,
    date: new Date(j.scheduled_at),
    title: j.spaces?.name || '청소 요청',
    status: j.status,
    color: CALENDAR_COLOR[j.status] ?? CALENDAR_COLOR.OPEN,
  }))

  return (
    <>
      {/* View mode toggle */}
      <div className="flex justify-end px-5 mb-3">
        <div
          className="flex p-1 rounded-xl border border-line-soft"
          style={{ background: 'var(--color-surface-muted)' }}
        >
          <ViewBtn
            active={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            icon={<List size={14} />}
            label="목록"
          />
          <ViewBtn
            active={viewMode === 'calendar'}
            onClick={() => setViewMode('calendar')}
            icon={<CalendarDays size={14} />}
            label="달력"
          />
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="px-5 animate-fade-in">
          <CalendarView
            events={calendarEvents}
            onEventClick={(id) => router.push(`/requests/${id}`)}
          />
        </div>
      ) : (
        <div className="px-5 animate-fade-in">
          {jobs.length === 0 ? (
            <div className="card p-2">
              <EmptyState
                icon={<Sparkles size={24} />}
                title="해당 내역이 없습니다"
                description="진행 중이거나 완료된 요청이 이곳에 표시됩니다."
              />
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/requests/${job.id}`} className="card-interactive p-4 flex items-center gap-3">
                    {/* Icon */}
                    <div className="icon-box icon-box-md icon-box-brand shrink-0">
                      <Sparkles size={18} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <StatusChip kind="job" status={job.status as JobStatus} size="sm" />
                      </div>
                      <h4 className="text-[14px] font-extrabold text-ink truncate leading-tight">
                        {job.spaces?.name || '공간 이름 미확인'}
                      </h4>
                      <p className="text-[11.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={10} />
                        <span className="truncate">{job.spaces?.address || '주소 정보 없음'}</span>
                      </p>
                      <p className="text-[11.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        {formatScheduled(job.scheduled_at)}
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className="t-money text-[14.5px] text-ink font-black">
                        {formatKRW(job.price, { short: true })}
                      </span>
                      {job.cleaner?.profile_image && job.status !== 'OPEN' ? (
                        <img
                          src={job.cleaner.profile_image}
                          alt={job.cleaner.name}
                          className="w-7 h-7 rounded-full border-2 border-surface object-cover"
                          style={{ boxShadow: 'var(--shadow-xs)' }}
                        />
                      ) : (
                        <ChevronRight size={15} className="text-text-faint" />
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}

function ViewBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all"
      style={{
        background: active ? 'var(--color-surface)' : 'transparent',
        color: active ? 'var(--color-brand-dark)' : 'var(--color-text-faint)',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
