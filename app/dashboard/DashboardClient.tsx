'use client';

import React from 'react';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';

interface Props {
  profile: { name: string; email?: string; profile_image?: string };
  todayJobs: Array<{ id: string; status: string; price: number; scheduled_at: string; spaces?: { name: string; type: string } }>;
  spaces: Array<{ id: string; name: string; type: string; base_price: number; is_active: boolean }>;
  recentJobs: Array<{ id: string; status: string; price: number; scheduled_at: string; spaces?: { name: string } }>;
  monthJobs: Array<{ status: string; price: number; scheduled_at: string; spaces?: { name: string } }>;
  monthTotal: number;
  monthCount: number;
}

const STATUS_MAP: Record<string, { label: string; textCls: string; bgCls: string }> = {
  OPEN: { label: '매칭 중', bgCls: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800', textCls: 'text-orange-700 dark:text-orange-400' },
  ASSIGNED: { label: '배정 완료', bgCls: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', textCls: 'text-blue-700 dark:text-blue-400' },
  EN_ROUTE: { label: '이동 중', bgCls: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', textCls: 'text-blue-700 dark:text-blue-400' },
  ARRIVED: { label: '도착', bgCls: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', textCls: 'text-blue-700 dark:text-blue-400' },
  IN_PROGRESS: { label: '청소 중', bgCls: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800', textCls: 'text-green-700 dark:text-green-400' },
  SUBMITTED: { label: '검수 대기', bgCls: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800', textCls: 'text-purple-700 dark:text-purple-400' },
  APPROVED: { label: '승인 완료', bgCls: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', textCls: 'text-slate-700 dark:text-slate-300' },
  DISPUTED: { label: '분쟁 중', bgCls: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800', textCls: 'text-red-700 dark:text-red-400' },
  PAID_OUT: { label: '정산 완료', bgCls: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', textCls: 'text-slate-700 dark:text-slate-300' },
  CANCELED: { label: '취소', bgCls: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', textCls: 'text-slate-700 dark:text-slate-300' },
};

const DEFAULT_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCwVTchqTlbyVjN1KOQKCGXmIt6I8o8bAzGJ8HEyiVDavk_umqwplPSJHc8WuIi-2VcWu8P5SumyILTkBswLF_sR6r-jUl1f4qqY1F-7lAtHGnMZTNXII1IM7OUxJ5PgQ3CBaRafmUee1WHK5zju11mxLVdaTUWobVt3JWbqwLXaBpRLO9p7AHQrUReQp8YifQAVXPBlxkIa0YvaaGL4e-VocYPLODdtZmRAvJltSDPPHZz1sy0zeKEOnW4NFzi6Xwr5170h1A5G0s",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAFPQ6x8nwKugVztldkohNoud_zTQayzcUfEJbVUxboTn25En5q-jbN6B8KJmzKgJTQJANHbJgxxJY5D2wJraGuYo6hwunRunEhztpl6HB3j_gbPNqYfafWJEAZGqQoS_R9tJl5JpRApjARi8n_kNTYT30XrM_wanF60LnVu2qw1Tc2FtcALD4VX6gYMUzWWsi-1Mt2z3GViiXNTsw4aOexHu7_CKWzsuHgRDwrBm0vubV8QhPLQJK2SO3DkrwaStieszhsHrzFFiE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDvUPL9hfGgn9F6g1TM4vcZwZg51COuHFtsdkcVhtPK9CYXq5I_1G1qm66L4AQUaKHPzg2IyXcjZNNLLTNbPUK_6hKvEPOQR1wptBSAgqZWz-k51AUkpuPc3Wob3_WSTuRM6RIdDlomzI4JYHrAqjc2BrSG28nthE1dF4rplWLN13tvXaoL2VUsm9ObPPqv9E7N5alMzdGxuOcSZWFiWe7K_4yOcd_ML-ayl2_Dv9KaQdgx7JB-zoD-N8pogT7_MxmQNz6fXdqID5Y",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAJ2WuwR50Xo-L5mCYA2-guF51NEO21vmU5ahgWJydR4W8SlTdkHfKWvFWIeX8A-DzOwrkBu4cvvjVbXPeZMWLFWPpTkhQTnrXB49QF88rMjzaksUxUpmsXIG_eGlIycCLosA0sc_OxVpA6DXDgjBDvdPnf3Z6nScxDRjt9lfwNSohwLwO1h-jCj6s5XdDahP1VXv8z4iK9Y8TdbseC7A1e3DRnSupn5NSuUNE8684D08KNLd7-eB_HyNjk-17wl9zkWSxiqzKrXuM"
];

export default function DashboardClient({ profile, todayJobs, spaces, monthTotal, monthCount }: Props) {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const ampm = d.getHours() >= 12 ? '오후' : '오전';
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes().toString().padStart(2, '0');
    return `오늘 ${ampm} ${h}:${m}`;
  };

  const formatFutureTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isTomorrow = d.getDate() === today.getDate() + 1 && d.getMonth() === today.getMonth();
    const prefix = isTomorrow ? '내일' : `${d.getMonth() + 1}/${d.getDate()}`;
    const ampm = d.getHours() >= 12 ? '오후' : '오전';
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${prefix} ${ampm} ${h}:${m}`;
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 flex justify-center w-full antialiased min-h-screen">
      <div className="relative flex h-full min-h-screen w-full max-w-md flex-col overflow-hidden pb-[72px]">

        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold tracking-tight">CleanGig Premium</h2>
          <button className="flex items-center justify-center p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Welcome Banner */}
          <div className="bg-primary text-white rounded-xl p-6 relative overflow-hidden shadow-sm">
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-1">안녕하세요, {profile.name || '호스트'}님!</h3>
              <p className="text-primary-100 opacity-90 text-sm">오늘 {todayJobs.length}건의 청소가 진행 중입니다.</p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none transform translate-x-1/4 translate-y-1/4">
              <span className="material-symbols-outlined text-[120px]">cleaning_services</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 rounded-xl bg-white dark:bg-slate-900 shadow-sm p-4 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-3xl font-bold text-primary dark:text-primary-light">{spaces.length}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">등록된 공간</p>
            </div>
            <div className="flex flex-col gap-1 rounded-xl bg-white dark:bg-slate-900 shadow-sm p-4 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-3xl font-bold text-primary dark:text-primary-light">{todayJobs.length}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">진행중인 요청</p>
            </div>
          </div>

          {/* Active Requests */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">진행중인 청소</h3>
              <Link href="/requests" className="text-primary text-sm font-medium">전체보기</Link>
            </div>
            <div className="space-y-3">
              {todayJobs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-sm">오늘 진행중인 청소가 없습니다.</p>
                </div>
              ) : (
                todayJobs.map((job, idx) => {
                  const statusObj = STATUS_MAP[job.status] || STATUS_MAP.OPEN;
                  const bgImage = DEFAULT_IMAGES[idx % DEFAULT_IMAGES.length];
                  return (
                    <Link href={`/requests/${job.id}`} key={job.id} className="flex gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 items-center hover:bg-slate-50 transition-colors">
                      <div className="w-16 h-16 rounded-lg bg-cover bg-center shrink-0 shadow-inner" style={{ backgroundImage: `url('${bgImage}')` }}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusObj.bgCls} ${statusObj.textCls}`}>
                            {statusObj.label}
                          </span>
                        </div>
                        <h4 className="font-bold text-base truncate">{job.spaces?.name || '공간 이름 확인불가'}</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{formatFutureTime(job.scheduled_at)} 예약</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>

          {/* Quick Actions / Spaces */}
          <section className="pb-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">내 공간</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
              <Link href="/spaces/create" className="min-w-[140px] h-[100px] bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 snap-start cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0">
                <span className="material-symbols-outlined text-2xl">add_business</span>
                <span className="text-sm font-medium">공간 추가</span>
              </Link>
              {spaces.map((space, index) => {
                const bgImage = DEFAULT_IMAGES[(index + 2) % DEFAULT_IMAGES.length];
                return (
                  <Link href={`/spaces/${space.id}`} key={space.id} className="min-w-[140px] h-[100px] bg-cover bg-center rounded-xl relative overflow-hidden snap-start group cursor-pointer shrink-0" style={{ backgroundImage: `url('${bgImage}')` }}>
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors"></div>
                    <div className="absolute inset-0 p-3 flex flex-col justify-end text-white">
                      <p className="font-bold text-sm truncate">{space.name}</p>
                      <p className="text-xs opacity-80">{space.type === 'airbnb' ? '에어비앤비' : '오피스/기타'} · {space.base_price.toLocaleString()}원</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </main>

        {/* Floating Action Button */}
        <Link href="/requests/create" className="absolute bottom-24 right-4 bg-primary text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 z-20">
          <span className="material-symbols-outlined text-3xl">add</span>
        </Link>

        <BottomNav />
      </div>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .pb-safe {
            padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
}
