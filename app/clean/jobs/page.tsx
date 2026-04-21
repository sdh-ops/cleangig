'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Clock, MapPin, Sparkles, Zap, Loader2, Search, Filter } from 'lucide-react'
import Header from '@/components/common/Header'
import BottomNav from '@/components/common/BottomNav'
import EmptyState from '@/components/common/EmptyState'
import PullToRefresh from '@/components/common/PullToRefresh'
import { formatKRW, formatScheduled, spaceTypeLabel, maskAddress } from '@/lib/utils'
import type { JobStatus, SpaceType } from '@/lib/types'

type Job = {
  id: string
  status: JobStatus
  price: number
  scheduled_at: string
  estimated_duration?: number
  is_urgent?: boolean
  matching_score?: number
  spaces?: { id: string; name: string; type: SpaceType; address: string; photos?: string[] }
}

type Sort = 'latest' | 'urgent' | 'price'

export default function JobsListPage() {
  const supabase = createClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<Sort>('latest')
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<SpaceType | 'all'>('all')
  const [showTypeFilter, setShowTypeFilter] = useState(false)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('jobs')
      .select('id, status, price, scheduled_at, estimated_duration, is_urgent, spaces(id, name, type, address, photos)')
      .eq('status', 'OPEN')

    if (sort === 'urgent') query = query.eq('is_urgent', true)
    query = query.order(sort === 'price' ? 'price' : 'created_at', { ascending: false })

    const { data } = await query.limit(50)
    let list = (data || []) as any[]
    if (typeFilter !== 'all') list = list.filter((j) => j.spaces?.type === typeFilter)
    if (q.trim()) {
      const kw = q.trim().toLowerCase()
      list = list.filter(
        (j) =>
          (j.spaces?.name || '').toLowerCase().includes(kw) ||
          (j.spaces?.address || '').toLowerCase().includes(kw),
      )
    }
    setJobs(list as Job[])
    setLoading(false)
  }, [sort, typeFilter, q, supabase])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const typeOpts: { value: SpaceType | 'all'; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'airbnb', label: '에어비앤비' },
    { value: 'partyroom', label: '파티룸' },
    { value: 'studio', label: '스튜디오' },
    { value: 'unmanned_store', label: '무인매장' },
    { value: 'study_cafe', label: '스터디카페' },
    { value: 'gym', label: '헬스장' },
    { value: 'practice_room', label: '연습실' },
    { value: 'workspace', label: '공유오피스' },
    { value: 'other', label: '기타' },
  ]

  return (
    <div className="sseuksak-shell">
      <PullToRefresh onRefresh={fetchJobs} />
      <Header title="작업 찾기" showBack={false} showLogo={false} sticky />
      {/* Search & filters */}
      <div className="sticky top-14 z-10 bg-canvas/95 backdrop-blur px-5 pt-3 pb-3 border-b border-line-soft">
        <div className="relative mb-3">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="공간 이름 / 지역 검색"
            className="input pl-11"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSort('latest')}
            className={`shrink-0 chip ${sort === 'latest' ? 'chip-brand' : 'chip-muted'} !px-3.5 !py-1.5`}
          >
            <Clock size={13} /> 최신순
          </button>
          <button
            onClick={() => setSort('urgent')}
            className={`shrink-0 chip ${sort === 'urgent' ? 'chip-danger' : 'chip-muted'} !px-3.5 !py-1.5`}
          >
            <Zap size={13} /> 긴급만
          </button>
          <button
            onClick={() => setSort('price')}
            className={`shrink-0 chip ${sort === 'price' ? 'chip-sun' : 'chip-muted'} !px-3.5 !py-1.5`}
          >
            💰 고수익순
          </button>
          <div className="w-px h-4 bg-line mx-0.5" />
          <button
            onClick={() => setShowTypeFilter((v) => !v)}
            className={`shrink-0 chip ${typeFilter !== 'all' ? 'chip-brand' : 'chip-muted'} !px-3.5 !py-1.5`}
          >
            <Filter size={13} /> {typeFilter === 'all' ? '공간 유형' : spaceTypeLabel(typeFilter)}
          </button>
        </div>
        {showTypeFilter && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-wrap gap-1.5">
            {typeOpts.map((o) => (
              <button
                key={o.value}
                onClick={() => { setTypeFilter(o.value); setShowTypeFilter(false) }}
                className={`chip ${typeFilter === o.value ? 'chip-brand' : 'chip-muted'} !text-[11px] !px-2.5 !py-1`}
              >
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      <div className="flex-1 px-5 pt-4 pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="card p-2 mt-4">
            <EmptyState
              icon={<Sparkles size={24} />}
              title="조건에 맞는 작업이 없어요"
              description="필터를 조정하거나 알림을 켜두세요."
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link href={`/clean/job/${job.id}`} className="card-interactive p-4 flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-surface-muted overflow-hidden shrink-0 relative">
                    {job.spaces?.photos?.[0] ? (
                      <img src={job.spaces.photos[0]} alt={job.spaces.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-softer text-brand-dark">
                        <Sparkles size={22} />
                      </div>
                    )}
                    {job.is_urgent && (
                      <span className="absolute top-1 right-1 chip chip-danger !text-[9px] !px-1.5 !py-0">긴급</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="chip chip-brand !text-[10px] !px-2 !py-0.5">
                        {spaceTypeLabel(job.spaces?.type || 'other')}
                      </span>
                    </div>
                    <h4 className="text-[14.5px] font-extrabold text-ink truncate">{job.spaces?.name}</h4>
                    <p className="text-[11.5px] text-text-soft font-bold flex items-center gap-1 mt-0.5 truncate">
                      <MapPin size={11} /> {maskAddress(job.spaces?.address || '')}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[11.5px] text-text-soft font-bold flex items-center gap-1">
                        <Clock size={11} /> {formatScheduled(job.scheduled_at)}
                      </p>
                      <div className="t-money text-[15px] text-brand-dark">
                        {formatKRW(Math.round(job.price * 0.88), { short: true })}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav role="worker" />
    </div>
  )
}
