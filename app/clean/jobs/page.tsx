'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import JobsMap from './JobsMap';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, Calendar, Clock, DollarSign, Sparkles } from 'lucide-react';
import { maskAddress } from '@/lib/utils';

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

  // Advanced Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    date: '',
    timeRange: [] as string[],
    spaceTypes: [] as string[],
    minPrice: 0,
    difficulty: 'all'
  });
  const [appliedFilters, setAppliedFilters] = useState(tempFilters);

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
      .limit(100);
    setJobs((data as any[]) || []);
    setLoading(false);
  };

  const filtered = jobs.filter(j => {
    // Basic search
    if (searchText) {
      const txt = searchText.toLowerCase();
      const matchSearch = (j.spaces?.name || '').toLowerCase().includes(txt)
        || (j.spaces?.address || '').toLowerCase().includes(txt);
      if (!matchSearch) return false;
    }

    // Tabs
    if (filter === 'urgent' && !j.is_urgent) return false;

    // Advanced Filters
    if (appliedFilters.date) {
      const jobDate = new Date(j.scheduled_at).toISOString().split('T')[0];
      if (jobDate !== appliedFilters.date) return false;
    }

    if (appliedFilters.timeRange.length > 0) {
      const hour = new Date(j.scheduled_at).getHours();
      const isInRange = appliedFilters.timeRange.some(range => {
        if (range === 'morning') return hour >= 6 && hour < 12;
        if (range === 'afternoon') return hour >= 12 && hour < 18;
        if (range === 'evening') return hour >= 18 || hour < 6;
        return false;
      });
      if (!isInRange) return false;
    }

    if (appliedFilters.spaceTypes.length > 0) {
      if (!appliedFilters.spaceTypes.includes(j.spaces?.type)) return false;
    }

    if (appliedFilters.minPrice > 0) {
      if (j.price < appliedFilters.minPrice) return false;
    }

    if (appliedFilters.difficulty !== 'all') {
      const duration = j.estimated_duration;
      if (appliedFilters.difficulty === 'easy' && duration > 60) return false;
      if (appliedFilters.difficulty === 'medium' && (duration <= 60 || duration > 120)) return false;
      if (appliedFilters.difficulty === 'hard' && duration <= 120) return false;
    }

    return true;
  });

  const resetFilters = () => {
    const reset = {
      date: '',
      timeRange: [],
      spaceTypes: [],
      minPrice: 0,
      difficulty: 'all'
    };
    setTempFilters(reset);
    setAppliedFilters(reset);
  };

  const applyFilters = () => {
    setAppliedFilters(tempFilters);
    setShowFilters(false);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen antialiased flex flex-col mx-auto max-w-md w-full relative">

      {/* Header & Search */}
      <div className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center p-4 pb-2 justify-between">
          <h2 className="text-xl font-bold leading-tight tracking-tight flex-1">청소요청 찾기</h2>
        </div>

        <div className="px-4 py-2 flex gap-2">
          <label className="flex flex-col min-w-40 h-12 flex-1">
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
          <button
            onClick={() => setShowFilters(true)}
            className={`size-12 rounded-xl flex items-center justify-center shadow-sm border transition-all ${Object.values(appliedFilters).some(v => Array.isArray(v) ? v.length > 0 : v !== '' && v !== 'all' && v !== 0) ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}`}
          >
            <span className="material-symbols-outlined">tune</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none pb-3 justify-start items-center">
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
          <span className="text-[13px] font-bold text-primary">실시간 신규 청소요청 업데이트 중 ({filtered.length})</span>
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
            <h3 className="font-bold text-base mb-1 text-slate-700 dark:text-slate-300">조건에 맞는 청소요청이 없습니다</h3>
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
                <Link
                  href={`/clean/job/${job.id}`}
                  key={job.id}
                  className={`block rounded-[24px] p-5 shadow-sm border transition-all active:scale-[0.98] cursor-pointer hover:shadow-xl relative overflow-hidden ${job.is_urgent
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 shadow-rose-100 dark:shadow-none'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                >
                  {/* SOS Glow Effect for Urgent Jobs */}
                  {job.is_urgent && (
                    <motion.div
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-rose-500/10 pointer-events-none"
                    />
                  )}

                  <div className="flex gap-4 relative z-10">
                    {space?.reference_photos?.[0] ? (
                      <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl w-[88px] h-[88px] shrink-0 border border-slate-100 dark:border-slate-700 shadow-sm"
                        style={{ backgroundImage: `url("${space.reference_photos[0]}")` }}
                      >
                        {job.is_urgent && (
                          <div className="absolute top-(-2) left-(-2) bg-rose-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg animate-bounce">
                            SOS
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-[88px] h-[88px] shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl border border-slate-200 dark:border-slate-700 relative shadow-sm">
                        {SPACE_TYPE_ICON[space?.type] || '🏢'}
                        {job.is_urgent && (
                          <div className="absolute -top-2 -left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg animate-bounce">
                            SOS
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-between py-0.5 overflow-hidden">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="text-[17px] font-black leading-tight mb-1 truncate text-slate-900 dark:text-slate-100 tracking-tight">{space?.name}</h3>
                          {job.is_urgent && (
                            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 mb-1">
                          <span className="material-symbols-outlined text-[16px] opacity-70">location_on</span>
                          <p className="text-[13px] font-bold truncate tracking-tight">{maskAddress(space?.address || '')}</p>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <span className="material-symbols-outlined text-[16px] opacity-70">schedule</span>
                          <p className="text-[12px] font-bold truncate">{timeStr} ({job.estimated_duration}분)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700 mt-4 pt-4 relative z-10">
                    <div className="flex items-center gap-2">
                      {job.is_urgent ? (
                        <span className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white shadow-lg shadow-rose-200 dark:shadow-none animate-pulse">🔥 긴급 배정</span>
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-[11px] font-black text-slate-600 dark:text-slate-300">일반 청소</span>
                      )}
                      <span className="text-[12px] font-black text-slate-400">시급 {hourlyRate.toLocaleString()}원</span>
                    </div>
                    <div className="text-right">
                      <p className="text-primary font-black text-xl leading-none tracking-tight">₩{job.price.toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />

      {/* Advanced Filter Drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[32px] z-[101] max-h-[85vh] overflow-y-auto shadow-2xl pb-10 flex flex-col mx-auto max-w-md w-full"
            >
              <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button onClick={resetFilters} className="text-sm font-bold text-slate-400 hover:text-slate-900">초기화</button>
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
                <button onClick={() => setShowFilters(false)} className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Date Filter */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar size={16} className="text-primary" /> 청소 날짜
                  </h4>
                  <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                    {['', '2026-03-06', '2026-03-07', '2026-03-08'].map(date => (
                      <button
                        key={date}
                        onClick={() => setTempFilters({ ...tempFilters, date })}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all shrink-0 ${tempFilters.date === date ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}
                      >
                        {date === '' ? '모든 날짜' : date === new Date().toISOString().split('T')[0] ? '오늘' : date}
                      </button>
                    ))}
                    <input
                      type="date"
                      value={tempFilters.date}
                      onChange={e => setTempFilters({ ...tempFilters, date: e.target.value })}
                      className="opacity-0 w-0 h-0 absolute"
                      id="custom-date"
                    />
                  </div>
                </div>

                {/* Time Range Filter */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock size={16} className="text-primary" /> 희망 시간대
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'morning', label: '오전', sub: '06-12시' },
                      { id: 'afternoon', label: '오후', sub: '12-18시' },
                      { id: 'evening', label: '저녁', sub: '18시 이후' }
                    ].map(t => {
                      const isActive = tempFilters.timeRange.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            const newRange = isActive
                              ? tempFilters.timeRange.filter(r => r !== t.id)
                              : [...tempFilters.timeRange, t.id];
                            setTempFilters({ ...tempFilters, timeRange: newRange });
                          }}
                          className={`p-3 rounded-2xl border text-center transition-all ${isActive ? 'bg-primary/5 border-primary text-primary' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600'}`}
                        >
                          <div className="text-xs font-black">{t.label}</div>
                          <div className="text-[10px] opacity-60 font-medium">{t.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Space Type Filter */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" /> 공간 유형
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SPACE_TYPE_ICON).map(([type, icon]) => {
                      const isActive = tempFilters.spaceTypes.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            const newTypes = isActive
                              ? tempFilters.spaceTypes.filter(t => t !== type)
                              : [...tempFilters.spaceTypes, type];
                            setTempFilters({ ...tempFilters, spaceTypes: newTypes });
                          }}
                          className={`px-4 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-2 ${isActive ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}
                        >
                          <span>{icon}</span> {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Filter */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign size={16} className="text-primary" /> 미니멈 가격
                  </h4>
                  <input
                    type="range"
                    min="0"
                    max="100000"
                    step="5000"
                    value={tempFilters.minPrice}
                    onChange={e => setTempFilters({ ...tempFilters, minPrice: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] font-black text-slate-400 px-1">
                    <span>₩0</span>
                    <span className="text-primary">₩{tempFilters.minPrice.toLocaleString()} 이상</span>
                    <span>₩100,000+</span>
                  </div>
                </div>

                {/* Difficulty Filter */}
                <div className="space-y-4 pb-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Filter size={16} className="text-primary" /> 청소 난이도
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'all', label: '전체' },
                      { id: 'easy', label: '이지' },
                      { id: 'medium', label: '보통' },
                      { id: 'hard', label: '하드' }
                    ].map(d => (
                      <button
                        key={d.id}
                        onClick={() => setTempFilters({ ...tempFilters, difficulty: d.id })}
                        className={`py-2.5 rounded-2xl text-xs font-bold border transition-all ${tempFilters.difficulty === d.id ? 'bg-primary text-white border-primary' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 h-14 rounded-2xl font-black text-slate-500 bg-slate-100 dark:bg-slate-800"
                >
                  취소
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-[2] h-14 rounded-2xl font-black text-white bg-primary shadow-lg shadow-primary/20"
                >
                  필터 적용하기
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
