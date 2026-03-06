'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import JobsMap from './JobsMap';

interface Job {
  id: string;
  status: string;
  price: number;
  scheduled_at: string;
  estimated_duration: number;
  is_urgent: boolean;
  matching_score: number;
  spaces?: { name: string; address: string; type: string; reference_photos?: string[]; lat?: number; lng?: number };
}

const SPACE_TYPE_ICON: Record<string, string> = {
  airbnb: '🏠', partyroom: '🎉', studio: '📸', gym: '💪',
  unmanned_store: '🏪', study_cafe: '📚', other: '🏢'
};

export default function JobsListPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'nearby'>('nearby');
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    fetchJobs();
    const supabase = createClient();
    const channel = supabase.channel('open-jobs-v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' },
        (payload) => { if (payload.new.status === 'OPEN') fetchJobs(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs' },
        () => fetchJobs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchJobs = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('jobs')
      .select('*, spaces(name, address, type, reference_photos, lat, lng)')
      .eq('status', 'OPEN')
      .gte('scheduled_at', new Date().toISOString())
      .or(`targeted_worker_id.is.null,targeted_worker_id.eq.${user.id}`)
      .order('is_urgent', { ascending: false })
      .order('scheduled_at')
      .limit(50);
    setJobs((data as any[]) || []);
    setLoading(false);
  };

  const filtered = jobs.filter(j => {
    if (filter === 'urgent') return j.is_urgent;
    if (searchText) {
      const txt = searchText.toLowerCase();
      return (j.spaces?.name || '').toLowerCase().includes(txt)
        || (j.spaces?.address || '').toLowerCase().includes(txt);
    }
    return true; // nearby 로직은 현재 위치 기반으로 별도 구현 필요 (현재는 일단 전체로 처리)
  });

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen antialiased flex flex-col mx-auto max-w-md w-full relative">

      {/* Header & Search */}
      <div className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center p-4 pb-2 justify-between">
          <h2 className="text-xl font-bold leading-tight tracking-tight flex-1">일감 찾기</h2>
        </div>

        <div className="px-4 py-2">
          <label className="flex flex-col min-w-40 h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-xl h-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary/50 transition-shadow">
              <div className="text-slate-400 flex items-center justify-center pl-4 rounded-l-xl">
                <span className="material-symbols-outlined text-2xl">search</span>
              </div>
              <input
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-slate-900 dark:text-slate-100 focus:outline-none bg-transparent placeholder:text-slate-400 px-3 text-base font-normal leading-normal"
                placeholder="지역 또는 공간 이름 검색"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
          </label>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none pb-3 justify-between items-center">
          <div className="flex gap-2">
            <button
              className={`flex h-8 shrink-0 items-center justify-center gap-x-1 rounded-full px-4 shadow-sm transition-colors border ${filter === 'nearby' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              onClick={() => setFilter('nearby')}
            >
              <p className="text-sm font-medium">📍 가까운 순</p>
            </button>
            <button
              className={`flex h-8 shrink-0 items-center justify-center gap-x-1 rounded-full px-4 shadow-sm transition-colors border ${filter === 'all' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              onClick={() => setFilter('all')}
            >
              <p className="text-sm font-medium">전체보기</p>
            </button>
            <button
              className={`flex h-8 shrink-0 items-center justify-center gap-x-1 rounded-full px-4 shadow-sm transition-colors border ${filter === 'urgent' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              onClick={() => setFilter('urgent')}
            >
              <p className="text-sm font-medium">🔥 긴급</p>
            </button>
          </div>

          <div className="bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg flex shrink-0">
            <button
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-shadow ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              onClick={() => setViewMode('list')}
            >
              목록
            </button>
            <button
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-shadow ${viewMode === 'map' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              onClick={() => setViewMode('map')}
            >
              지도
            </button>
          </div>
        </div>
      </div>

      {/* Job List */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          <span className="text-[13px] font-bold text-primary">실시간 신규 일감 업데이트 중 ({filtered.length})</span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse h-[120px]">
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center text-slate-500 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">search_off</span>
            <h3 className="font-bold text-base mb-1 text-slate-700 dark:text-slate-300">조건에 맞는 일감이 없습니다</h3>
            <p className="text-sm text-slate-400">필터를 변경하거나 잠시만 기다려주세요!</p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-[500px]">
            <JobsMap jobs={filtered} />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((job: any) => {
              const space = job.spaces;
              const when = new Date(job.scheduled_at);
              const timeStr = when.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              const hourlyRate = Math.round(job.price / (job.estimated_duration / 60));

              return (
                <Link href={`/clean/job/${job.id}`} key={job.id} className="block bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4 active:scale-[0.98] transition-transform cursor-pointer hover:shadow-md">
                  <div className="flex gap-4">
                    {space?.reference_photos?.[0] ? (
                      <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg w-[80px] h-[80px] shrink-0 border border-slate-100 dark:border-slate-700"
                        style={{ backgroundImage: `url("${space.reference_photos[0]}")` }}
                      />
                    ) : (
                      <div className="w-[80px] h-[80px] shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl border border-slate-200 dark:border-slate-700">
                        {SPACE_TYPE_ICON[space?.type] || '🏢'}
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-between py-1 overflow-hidden">
                      <div>
                        <h3 className="text-base font-bold leading-tight mb-1 truncate text-slate-900 dark:text-slate-100">{space?.name}</h3>
                        <div className="flex items-center gap-1 text-slate-500 mb-1">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          <p className="text-xs font-medium truncate">{space?.address}</p>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <p className="text-[11px] font-medium truncate">{timeStr} ({job.estimated_duration}분)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-3">
                    <div className="flex items-center gap-2">
                      {job.is_urgent ? (
                        <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:border-rose-800">🔥 긴급 배정</span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-primary-light/10 px-2 py-1 text-[10px] font-bold text-primary border border-primary/20">일반 요금</span>
                      )}
                      <span className="text-[11px] font-bold text-slate-400">시급 {hourlyRate.toLocaleString()}원</span>
                    </div>
                    <p className="text-primary font-bold text-lg leading-none">₩{job.price.toLocaleString()}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
