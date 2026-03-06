import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';

export default async function ActiveJobsPage(props: { searchParams?: Promise<{ tab?: string }> }) {
    const searchParams = await props.searchParams;
    const currentTab = searchParams?.tab || 'active';

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Determine status filter based on tab
    let statusFilter: string[] = [];
    if (currentTab === 'active') {
        statusFilter = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED', 'DISPUTED'];
    } else if (currentTab === 'completed') {
        statusFilter = ['APPROVED', 'PAID_OUT'];
    } else if (currentTab === 'canceled') {
        statusFilter = ['CANCELED'];
    }

    // Fetch jobs for this worker
    const { data: jobData } = await supabase
        .from('jobs')
        .select('*, spaces(name, address, type, reference_photos), host:operator_id(id, name, profile_image)')
        .eq('worker_id', user.id)
        .in('status', statusFilter)
        .order('scheduled_at', { ascending: false });

    const jobs = jobData || [];

    const STATUS_MAP: Record<string, { label: string; textCls: string; bgCls: string }> = {
        ASSIGNED: { label: '매칭 완료', bgCls: 'bg-emerald-100 dark:bg-emerald-900/30', textCls: 'text-emerald-800 dark:text-emerald-400' },
        EN_ROUTE: { label: '이동 중', bgCls: 'bg-blue-100 dark:bg-blue-900/30', textCls: 'text-blue-800 dark:text-blue-400' },
        ARRIVED: { label: '도착', bgCls: 'bg-blue-100 dark:bg-blue-900/30', textCls: 'text-blue-800 dark:text-blue-400' },
        IN_PROGRESS: { label: '청소 중', bgCls: 'bg-primary/10 dark:bg-primary/20', textCls: 'text-primary' },
        SUBMITTED: { label: '검수 대기', bgCls: 'bg-purple-100 dark:bg-purple-900/30', textCls: 'text-purple-800 dark:text-purple-400' },
        APPROVED: { label: '승인 완료', bgCls: 'bg-slate-100 dark:bg-slate-800', textCls: 'text-slate-700 dark:text-slate-300' },
        DISPUTED: { label: '분쟁 중', bgCls: 'bg-red-100 dark:bg-red-900/30', textCls: 'text-red-800 dark:text-red-400' },
        PAID_OUT: { label: '정산 완료', bgCls: 'bg-slate-100 dark:bg-slate-800', textCls: 'text-slate-700 dark:text-slate-300' },
        CANCELED: { label: '취소', bgCls: 'bg-slate-100 dark:bg-slate-800', textCls: 'text-slate-700 dark:text-slate-300' },
    };

    const getTabClass = (tabName: string) => {
        const isActive = currentTab === tabName;
        return `flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 transition-colors ${isActive
            ? 'border-b-primary text-slate-900 dark:text-slate-100'
            : 'border-b-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`;
    };

    const formatJobTime = (iso: string) => {
        const d = new Date(iso);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const ampm = d.getHours() >= 12 ? '오후' : '오전';
        const h = d.getHours() % 12 || 12;
        const m = d.getMinutes().toString().padStart(2, '0');
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${dayNames[d.getDay()]}) ${ampm} ${h}:${m}`;
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen">
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-md mx-auto border-x border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur z-20">
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">내 청소 일정</h2>
                </div>

                {/* Tabs */}
                <div className="pb-3 sticky top-12 bg-background-light dark:bg-background-dark z-20 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex px-4 justify-between">
                        <Link href="/clean/jobs/active?tab=active" className={getTabClass('active')}>
                            <p className="text-sm font-bold leading-normal tracking-[0.015em]">예정/진행</p>
                        </Link>
                        <Link href="/clean/jobs/active?tab=completed" className={getTabClass('completed')}>
                            <p className="text-sm font-bold leading-normal tracking-[0.015em]">완료</p>
                        </Link>
                        <Link href="/clean/jobs/active?tab=canceled" className={getTabClass('canceled')}>
                            <p className="text-sm font-bold leading-normal tracking-[0.015em]">취소</p>
                        </Link>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto pb-24">
                    {jobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                            <span className="material-symbols-outlined text-border-dark dark:text-border-light text-[60px] mb-4 opacity-50">event_available</span>
                            <h3 className="text-lg font-bold mb-2">일정이 없습니다</h3>
                            <p className="text-slate-500 text-sm">배정받은 청소 일정이 이곳에 표시됩니다.</p>
                        </div>
                    ) : (
                        jobs.map((job) => {
                            const statusObj = STATUS_MAP[job.status] || STATUS_MAP.ASSIGNED;

                            return (
                                <Link href={`/clean/job/${job.id}`} key={job.id}>
                                    <div className="flex gap-4 px-4 py-4 justify-between border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                        <div className="flex items-start gap-4">
                                            <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 shrink-0 size-12">
                                                <span className="material-symbols-outlined">map</span>
                                            </div>
                                            <div className="flex flex-1 flex-col justify-center">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusObj.bgCls} ${statusObj.textCls}`}>
                                                        {statusObj.label}
                                                    </span>
                                                    <span className="text-xs font-bold text-primary">{job.wage?.toLocaleString()}원</span>
                                                </div>
                                                <p className="text-base font-medium leading-normal mb-1">{job.spaces?.name || '공간 이름 확인불가'}</p>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">{job.spaces?.address || '주소 정보 없음'}</p>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal mt-0.5">{formatJobTime(job.scheduled_at)}</p>
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex flex-col items-end justify-between">
                                            <div className="flex size-7 items-center justify-center">
                                                <span className="material-symbols-outlined text-slate-400 text-xl">chevron_right</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>

                <BottomNav />
            </div>
        </div>
    );
}
