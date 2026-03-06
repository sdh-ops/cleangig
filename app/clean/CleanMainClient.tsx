'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';

interface Job {
  id: string;
  status: string;
  price: number;
  scheduled_at: string;
  estimated_duration: number;
  is_urgent: boolean;
  spaces?: { name: string; address: string; type: string };
  job_id?: string;
  space_name?: string;
  space_type?: string;
  distance_meters?: number;
}

interface Props {
  profile: { id: string; name: string; avg_rating: number; tier: string; total_jobs: number };
  activeJob: Job | null;
  weekEarnings: number;
  pendingCount: number;
}

const DEFAULT_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC1kqFcdTGwUsC5qFYjFZ00oxpeMQqVjQN18NGRKxhKKsa_JuactxoE6O9luREQtvK_DLFf-CvBoe8NbyCHcwkwzi6K9x9RZNItTadrbzcIy-JIhCG80sxRSzW03usJxdnxKmMHfNoDges4jHY4Yq4DUdCfoTTU8gsOyIQKmZ16lq8kzwejE-cEH_cYZhMf_RZHuRtCnfZpUYfw41e4aiogsY9Gw6Tu97hj3EuJDfMdCXGyiMxHsMeORuN6LIhq4QL2IkPvVhyX1V4",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCnuS-MODUZhLlcwcTanEYWDttWa26-B0whjoand34z9IMpah_ymcmh-3tGjSTnsPNT7hFe_7bMifK4JmVM3ngVw_Df1wDud_4NHm5hMEk_dOKg46pwiAGYfeR1LM4MoCoRRogJt5YiyOQRrXrwbR8gey_dbolEBm-9brfyAbhxLq0Yp5leg7EYJ6OOpwHIUomyJu12LT6FUixW1ufAhODv-gPGFwlubwBF1amODscqcvYTkSXdbG_CNx3rsfLKICMiYCy-kXXSLUE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCwVTchqTlbyVjN1KOQKCGXmIt6I8o8bAzGJ8HEyiVDavk_umqwplPSJHc8WuIi-2VcWu8P5SumyILTkBswLF_sR6r-jUl1f4qqY1F-7lAtHGnMZTNXII1IM7OUxJ5PgQ3CBaRafmUee1WHK5zju11mxLVdaTUWobVt3JWbqwLXaBpRLO9p7AHQrUReQp8YifQAVXPBlxkIa0YvaaGL4e-VocYPLODdtZmRAvJltSDPPHZz1sy0zeKEOnW4NFzi6Xwr5170h1A5G0s"
];

export default function CleanMainClient({ profile, activeJob, weekEarnings, pendingCount }: Props) {
  const [nearbyJobs, setNearbyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('nearby_open_jobs', {
          worker_lat: pos.coords.latitude,
          worker_lng: pos.coords.longitude,
          radius_km: 10,
        });
        if (!error && data) setNearbyJobs(data as Job[]);
        setLoading(false);
      },
      () => {
        createClient()
          .from('jobs').select('*, spaces(name,address,type)')
          .eq('status', 'OPEN').order('scheduled_at').limit(10)
          .then(({ data }) => {
            setNearbyJobs((data as Job[]) || []);
            setLoading(false);
          });
      }
    );
  }, []);

  const formatFutureTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isTomorrow = d.getDate() === today.getDate() + 1 && d.getMonth() === today.getMonth();
    const prefix = isTomorrow ? '내일' : `${d.getMonth() + 1}/${d.getDate()}`;
    const ampm = d.getHours() >= 12 ? '오후' : '오전';
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${prefix}, ${ampm} ${h}:${m}`;
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-text-primary-light dark:text-text-primary-dark min-h-screen flex flex-col antialiased">
      <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-md mx-auto">

        {/* Header */}
        <header className="flex items-center bg-surface-light dark:bg-surface-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-border-light dark:border-border-dark">
          <h2 className="text-text-primary-light dark:text-text-primary-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1">
            CleanGig 파트너
          </h2>
          <div className="flex w-12 items-center justify-end">
            <button className="flex items-center justify-center rounded-lg h-12 w-12 bg-transparent text-text-primary-light dark:text-text-primary-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-2xl">notifications</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-[90px]">

          {/* Today's Earnings */}
          <section className="p-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-border-light dark:border-border-dark flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal">이번 주 수익</p>
                <span className="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
              </div>
              <p className="text-primary tracking-tight text-3xl font-bold leading-tight mt-1">
                ₩{weekEarnings.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <span className="material-symbols-outlined text-green-500 text-sm">trending_up</span>
                <span className="text-green-500 font-medium">+12%</span>
                <span className="text-text-secondary-light dark:text-text-secondary-dark">지난주 대비</span>
              </div>
            </div>
          </section>

          {/* Active Jobs Summary */}
          <section className="px-4 py-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-text-primary-light dark:text-text-primary-dark text-lg font-bold leading-tight tracking-[-0.015em]">진행 중인 청소요청</h3>
              <Link href="/clean/jobs/active" className="text-primary text-sm font-medium hover:underline">모두 보기</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-border-light dark:border-border-dark flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">pending_actions</span>
                </div>
                <div>
                  <p className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">{activeJob ? 1 : 0}</p>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">진행 예정</p>
                </div>
              </div>
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-border-light dark:border-border-dark flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                </div>
                <div>
                  <p className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">{profile.total_jobs}</p>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">완료됨</p>
                </div>
              </div>
            </div>

            {/* Next Job Card */}
            {activeJob && (
              <div className="mt-3 bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-border-light dark:border-border-dark">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">다음 일정</div>
                  <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm">
                    {new Date(activeJob.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="font-bold text-base mb-1">{(activeJob.spaces as any)?.name} 클리닝</h4>
                <div className="flex items-center gap-1 text-text-secondary-light dark:text-text-secondary-dark text-sm mb-4">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span>{(activeJob.spaces as any)?.address}</span>
                </div>
                <Link href={`/clean/job/${activeJob.id}`} className="flex justify-center w-full bg-primary hover:bg-primary/90 text-white rounded-lg py-3 font-semibold transition-colors">
                  일정 조회하기
                </Link>
              </div>
            )}
          </section>

          {/* Recommended Jobs */}
          <section className="px-4 py-6">
            <h3 className="text-text-primary-light dark:text-text-primary-dark text-lg font-bold leading-tight tracking-[-0.015em] mb-3">추천 청소요청</h3>
            {loading ? (
              <div className="flex justify-center p-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : nearbyJobs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm border-t border-slate-100 dark:border-slate-800">
                주변에 추천할 만한 청소요청이 없습니다.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {nearbyJobs.map((job, idx) => {
                  const bgImage = DEFAULT_IMAGES[idx % DEFAULT_IMAGES.length];
                  return (
                    <Link href={`/clean/job/${job.job_id || job.id}`} key={job.job_id || job.id} className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-border-light dark:border-border-dark flex gap-4 items-center group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: `url('${bgImage}')` }}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-sm truncate">{job.space_name || (job.spaces as any)?.name || '청소요청'}</h4>
                          <span className="font-bold text-primary text-sm whitespace-nowrap group-hover:underline">₩{(job.price || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          {formatFutureTime(job.scheduled_at)}
                        </p>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">map</span>
                          거리 {(job.distance_meters ? job.distance_meters / 1000 : 0.5).toFixed(1)}km
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
