'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import CalendarView from '@/components/common/CalendarView';

interface Job {
    id: string;
    status: string;
    price: number;
    scheduled_at: string;
    spaces?: { name: string; address: string; type: string };
    cleaner?: { name: string; profile_image?: string };
}

interface Props {
    jobs: Job[];
    currentTab: string;
}

const STATUS_MAP: Record<string, { label: string; textCls: string; bgCls: string; color: string }> = {
    OPEN: { label: '모집 중', bgCls: 'bg-amber-100 dark:bg-amber-900/30', textCls: 'text-amber-800 dark:text-amber-400', color: 'bg-amber-100 text-amber-800 border-amber-400' },
    ASSIGNED: { label: '매칭 완료', bgCls: 'bg-emerald-100 dark:bg-emerald-900/30', textCls: 'text-emerald-800 dark:text-emerald-400', color: 'bg-emerald-100 text-emerald-800 border-emerald-400' },
    EN_ROUTE: { label: '이동 중', bgCls: 'bg-blue-100 dark:bg-blue-900/30', textCls: 'text-blue-800 dark:text-blue-400', color: 'bg-blue-100 text-blue-800 border-blue-400' },
    ARRIVED: { label: '도착', bgCls: 'bg-blue-100 dark:bg-blue-900/30', textCls: 'text-blue-800 dark:text-blue-400', color: 'bg-blue-100 text-blue-800 border-blue-400' },
    IN_PROGRESS: { label: '청소 중', bgCls: 'bg-primary/10 dark:bg-primary/20', textCls: 'text-primary', color: 'bg-primary/10 text-primary border-primary' },
    SUBMITTED: { label: '검수 대기', bgCls: 'bg-purple-100 dark:bg-purple-900/30', textCls: 'text-purple-800 dark:text-purple-400', color: 'bg-purple-100 text-purple-800 border-purple-400' },
    APPROVED: { label: '승인 완료', bgCls: 'bg-slate-100 dark:bg-slate-800', textCls: 'text-slate-700 dark:text-slate-300', color: 'bg-slate-100 text-slate-700 border-slate-400' },
    DISPUTED: { label: '분쟁 중', bgCls: 'bg-red-100 dark:bg-red-900/30', textCls: 'text-red-800 dark:text-red-400', color: 'bg-red-100 text-red-800 border-red-400' },
    PAID_OUT: { label: '정산 완료', bgCls: 'bg-slate-100 dark:bg-slate-800', textCls: 'text-slate-700 dark:text-slate-300', color: 'bg-slate-100 text-slate-700 border-slate-400' },
    CANCELED: { label: '취소', bgCls: 'bg-slate-100 dark:bg-slate-800', textCls: 'text-slate-700 dark:text-slate-300', color: 'bg-slate-100 text-slate-700 border-slate-400' },
};

export default function RequestsClient({ jobs, currentTab }: Props) {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    const calendarEvents = jobs.map(j => ({
        id: j.id,
        date: new Date(j.scheduled_at),
        title: j.spaces?.name || '청소 요청',
        status: STATUS_MAP[j.status]?.label,
        color: STATUS_MAP[j.status]?.color
    }));

    const formatJobTime = (iso: string) => {
        const d = new Date(iso);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const ampm = d.getHours() >= 12 ? '오후' : '오전';
        const h = d.getHours() % 12 || 12;
        const m = d.getMinutes().toString().padStart(2, '0');
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${dayNames[d.getDay()]}) ${ampm} ${h}:${m}`;
    };

    return (
        <>
            {/* View Switcher */}
            <div className="flex justify-end px-4 mb-2">
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex shadow-inner">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
                    >
                        <span className="material-symbols-outlined text-sm align-middle mr-1">list</span>
                        목록
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
                    >
                        <span className="material-symbols-outlined text-sm align-middle mr-1">calendar_month</span>
                        달력
                    </button>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <div className="px-4 animate-in fade-in duration-300">
                    <CalendarView events={calendarEvents} onEventClick={(id) => window.location.href = `/requests/${id}`} />
                </div>
            ) : (
                <div className="flex flex-col animate-in fade-in duration-300">
                    {jobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                            <span className="material-symbols-outlined text-slate-200 dark:text-slate-800 text-[60px] mb-4">inbox</span>
                            <h3 className="text-lg font-bold mb-2">해당 내역이 없습니다</h3>
                            <p className="text-slate-500 text-sm">진행 중이거나 완료된 요청이 이곳에 표시됩니다.</p>
                        </div>
                    ) : (
                        jobs.map((job) => {
                            const statusObj = STATUS_MAP[job.status] || STATUS_MAP.OPEN;
                            const hasCleaner = job.cleaner && job.status !== 'OPEN';

                            return (
                                <Link href={`/requests/${job.id}`} key={job.id}>
                                    <div className="flex gap-4 px-4 py-4 justify-between border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                        <div className="flex items-start gap-4">
                                            <div className="text-primary flex items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/20 shrink-0 size-12 group-hover:scale-95 transition-transform">
                                                <span className="material-symbols-outlined">cleaning_services</span>
                                            </div>
                                            <div className="flex flex-1 flex-col justify-center">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusObj.bgCls} ${statusObj.textCls}`}>
                                                        {statusObj.label}
                                                    </span>
                                                </div>
                                                <p className="text-base font-bold leading-normal mb-1">{job.spaces?.name || '공간 이름 확인불가'}</p>
                                                <p className="text-slate-500 dark:text-slate-400 text-[13px] font-medium leading-normal mb-0.5">{job.spaces?.address || '주소 정보 없음'}</p>
                                                <p className="text-slate-400 dark:text-slate-500 text-[12px] font-medium leading-normal">{formatJobTime(job.scheduled_at)}</p>
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex flex-col items-end justify-between">
                                            <div className="flex size-7 items-center justify-center">
                                                <span className="material-symbols-outlined text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                                            </div>
                                            {hasCleaner && (
                                                <div className="mt-auto group-hover:scale-110 transition-transform">
                                                    <img
                                                        src={job.cleaner.profile_image || 'https://lh3.googleusercontent.com/proxy/placeholder-avatar'}
                                                        alt="Cleaner"
                                                        className="size-8 rounded-full border-2 border-white dark:border-slate-800 shadow-sm bg-slate-100 object-cover"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            )}
        </>
    );
}
