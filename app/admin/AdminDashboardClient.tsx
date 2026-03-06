'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    Users,
    Brush,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    MapPin,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign
} from 'lucide-react';

interface Props {
    stats: {
        totalUsers: number;
        opUsers: number;
        workerUsers: number;
        totalJobs: number;
        openJobs: number;
        inProgressJobs: number;
        completedJobs: number;
        disputedJobs: number;
        totalRevenue: number;
        totalFees: number;
    };
    recentJobs: any[];
    dailyStats: any[];
}

export default function AdminDashboardClient({ stats, recentJobs, dailyStats }: Props) {
    const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'activity'>('overview');
    const [notifications, setNotifications] = useState<any[]>([]);

    // 실시간 알림 구독
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel('admin-dashboard')
            .on('postgres_changes', { event: 'INSERT', table: 'jobs', schema: 'public' }, (payload) => {
                setNotifications(prev => [{ id: Date.now(), message: '새로운 청소 요청이 등록되었습니다!' }, ...prev]);
                setTimeout(() => setNotifications(prev => prev.slice(0, -1)), 5000);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
    };

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <AlertCircle size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-bold">통계 데이터를 불러올 수 없습니다.</h3>
            </div>
        );
    }

    const safeDailyStats = Array.isArray(dailyStats) ? dailyStats : [];
    const maxRevenue = Math.max(...safeDailyStats.map(x => x.revenue || 0), 0) || 1;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Real-time Notifications Toast */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                {notifications.map(n => (
                    <div key={n.id} className="bg-primary text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
                        <AlertCircle size={20} />
                        <span className="font-bold">{n.message}</span>
                    </div>
                ))}
            </div>

            {/* Hero Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="누적 매출"
                    value={formatCurrency(stats.totalRevenue || 0)}
                    trend="+12.5%"
                    isUp={true}
                    icon={<DollarSign className="text-emerald-500" />}
                    color="bg-emerald-50"
                />
                <StatCard
                    title="플랫폼 수익 (수수료)"
                    value={formatCurrency(stats.totalFees || 0)}
                    trend="+8.2%"
                    isUp={true}
                    icon={<TrendingUp className="text-blue-500" />}
                    color="bg-blue-50"
                />
                <StatCard
                    title="전체 사용자"
                    value={`${(stats.totalUsers || 0).toLocaleString()}명`}
                    trend={(stats.workerUsers || 0) > (stats.opUsers || 0) ? "파트너 우세" : "호스트 우세"}
                    isUp={true}
                    icon={<Users className="text-purple-500" />}
                    color="bg-purple-50"
                />
                <StatCard
                    title="대기 중인 분쟁"
                    value={`${stats.disputedJobs || 0}건`}
                    trend={(stats.disputedJobs || 0) > 0 ? "즉시 확인 필요" : "안정적"}
                    isUp={(stats.disputedJobs || 0) === 0}
                    icon={<AlertCircle className={(stats.disputedJobs || 0) > 0 ? "text-red-500" : "text-slate-400"} />}
                    color={(stats.disputedJobs || 0) > 0 ? "bg-red-50" : "bg-slate-50"}
                    link="/admin/disputes"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Charts & Activity */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Revenue Chart Placeholder (SVG) */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold">주간 매출 추이</h3>
                                <p className="text-slate-500 text-sm mt-1">최근 7일간의 정산 완료 금액</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">7일</button>
                                <button className="px-4 py-2 text-slate-400 text-xs font-bold">30일</button>
                            </div>
                        </div>

                        <div className="h-64 w-full flex items-end justify-between gap-4 px-2">
                            {safeDailyStats.length > 0 ? safeDailyStats.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                    <div
                                        className="w-full bg-primary/20 hover:bg-primary transition-all rounded-t-lg relative"
                                        style={{ height: `${((d.revenue || 0) / maxRevenue) * 100}%` }}
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 mt-2 transition-opacity whitespace-nowrap">
                                            {formatCurrency(d.revenue || 0)}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">{d.label}</span>
                                </div>
                            )) : (
                                <div className="w-full flex items-center justify-center h-full text-slate-400 text-sm">통계 데이터가 없습니다</div>
                            )}
                        </div>
                    </div>

                    {/* Recent Jobs Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-xl font-bold">최근 청소요청 현황</h3>
                            <Link href="/admin/jobs" className="text-primary text-sm font-bold flex items-center gap-1">
                                전체보기 <ChevronRight size={16} />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                        <th className="px-8 py-4 text-xs font-bold text-slate-500">요청자 / 공간</th>
                                        <th className="px-8 py-4 text-xs font-bold text-slate-500">파트너</th>
                                        <th className="px-8 py-4 text-xs font-bold text-slate-500">상태</th>
                                        <th className="px-8 py-4 text-xs font-bold text-slate-500">금액</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentJobs && recentJobs.length > 0 ? recentJobs.map((job) => (
                                        <tr key={job.id} className="border-t border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-4">
                                                <div className="font-bold text-sm">{job.spaces?.name || '정보 없음'}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{job.operator?.name || '익명'}</div>
                                            </td>
                                            <td className="px-8 py-4">
                                                {job.worker ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100" />
                                                        <span className="text-xs font-medium">{job.worker.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 font-medium">모집 중</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${job.status === 'PAID_OUT' ? 'bg-emerald-100 text-emerald-700' :
                                                    job.status === 'DISPUTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 font-bold text-sm">{formatCurrency(job.price || 0)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center text-slate-400">최근 청소 내역이 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Alerts & Action Items */}
                <div className="space-y-8">
                    <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16" />
                        <h3 className="text-xl font-bold relative z-10">오늘의 할 일</h3>
                        <p className="text-slate-400 text-sm mt-1 relative z-10">즉시 조치가 필요한 항목</p>

                        <div className="mt-8 space-y-4 relative z-10">
                            <ActionItem
                                icon={<AlertCircle size={18} className="text-red-400" />}
                                title="해결되지 않은 분쟁"
                                count={stats.disputedJobs || 0}
                                link="/admin/disputes"
                            />
                            <ActionItem
                                icon={<Clock size={18} className="text-amber-400" />}
                                title="24시간 내 배정 필요"
                                count={stats.openJobs || 0}
                                link="/admin/jobs"
                            />
                            <ActionItem
                                icon={<CheckCircle2 size={18} className="text-emerald-400" />}
                                title="정산 대기 중"
                                count={stats.completedJobs || 0}
                                link="/admin/jobs?status=APPROVED"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-lg font-bold">인기 지역 (수요 히트맵)</h3>
                        <div className="mt-6 space-y-4">
                            <RegionRow name="서울 마포구" value={45} color="bg-primary" />
                            <RegionRow name="서울 강남구" value={32} color="bg-blue-500" />
                            <RegionRow name="경기 성남시" value={18} color="bg-emerald-500" />
                            <RegionRow name="서울 영등포구" value={12} color="bg-amber-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend, isUp, icon, color, link }: any) {
    const content = (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:translate-y-[-4px] hover:shadow-md cursor-pointer">
            <div className="flex items-center justify-between mb-4">
                <div className={`${color} p-3 rounded-2xl`}>{icon}</div>
                <div className={`flex items-center text-xs font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {trend}
                </div>
            </div>
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
                <h4 className="text-2xl font-black mt-1">{value}</h4>
            </div>
        </div>
    );

    return link ? <Link href={link}>{content}</Link> : content;
}

function ActionItem({ icon, title, count, link }: any) {
    return (
        <Link href={link} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/10 group">
            <div className="flex items-center gap-4">
                {icon}
                <span className="text-sm font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-lg font-black">{count}</span>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-white" />
            </div>
        </Link>
    );
}

function RegionRow({ name, value, color }: any) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wide">
                <span className="text-slate-500">{name}</span>
                <span>{value}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}
