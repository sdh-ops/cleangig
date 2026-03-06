'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    Users as UsersIcon,
    Brush,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    MapPin,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    Search,
    UserPlus,
    UserMinus,
    Shield,
    ShieldAlert,
    Plus,
    Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isPlatformAdmin } from '@/lib/admin';

const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

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
    allUsers: any[];
}

export default function AdminDashboardClient({ stats, recentJobs, dailyStats, allUsers: initialUsers }: Props) {
    const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'activity' | 'users' | 'notices' | 'inquiries'>('overview');
    const [notifications, setNotifications] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>(initialUsers || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // New management states
    const [notices, setNotices] = useState<any[]>([]);
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
    const [currentNotice, setCurrentNotice] = useState<any>(null);
    const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
    const [currentInquiry, setCurrentInquiry] = useState<any>(null);
    const [replyText, setReplyText] = useState('');
    const [saving, setSaving] = useState(false);

    // 실시간 알림 구독
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel('admin-dashboard')
            // 새로운 청소 요청 알림
            .on('postgres_changes', { event: 'INSERT', table: 'jobs', schema: 'public' }, (payload) => {
                setNotifications(prev => [{ id: Date.now(), message: '🆕 새로운 청소 요청이 등록되었습니다!' }, ...prev]);
                setTimeout(() => setNotifications(prev => prev.slice(1)), 5000);
            })
            // 새로운 고객 문의 알림
            .on('postgres_changes', { event: 'INSERT', table: 'support_inquiries', schema: 'public' }, (payload) => {
                setNotifications(prev => [{ id: Date.now(), message: '✉️ 새로운 고객 문의가 도착했습니다!' }, ...prev]);
                setTimeout(() => setNotifications(prev => prev.slice(1)), 5000);
                if (activeTab === 'inquiries') fetchInquiries();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'notices') fetchNotices();
        if (activeTab === 'inquiries') fetchInquiries();
    }, [activeTab]);

    const fetchNotices = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
        setNotices(data || []);
    };

    const fetchInquiries = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('support_inquiries')
            .select('*, users(name, email)')
            .order('created_at', { ascending: false });
        setInquiries(data || []);
    };

    const handleSaveNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const supabase = createClient();
        const noticeData = {
            title: currentNotice.title,
            content: currentNotice.content,
            is_important: currentNotice.is_important
        };

        if (currentNotice.id) {
            await supabase.from('notices').update(noticeData).eq('id', currentNotice.id);
        } else {
            await supabase.from('notices').insert(noticeData);
        }

        await fetchNotices();
        setIsNoticeModalOpen(false);
        setSaving(false);
    };

    const handleDeleteNotice = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const supabase = createClient();
        await supabase.from('notices').delete().eq('id', id);
        fetchNotices();
    };

    const handleReplyInquiry = async () => {
        if (!replyText.trim()) return;
        setSaving(true);
        const supabase = createClient();
        await supabase.from('support_inquiries').update({
            reply: replyText,
            status: 'CLOSED',
            responded_at: new Date().toISOString()
        }).eq('id', currentInquiry.id);

        await fetchInquiries();
        setIsInquiryModalOpen(false);
        setReplyText('');
        setSaving(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
    };

    const handleToggleAdmin = async (userId: string, currentRole: string) => {
        if (updatingUserId) return;

        const nextRole = currentRole === 'admin' ? 'operator' : 'admin';
        const confirmMsg = nextRole === 'admin'
            ? '해당 유저에게 운영자(Admin) 권한을 부여하시겠습니까?'
            : '해당 유저의 운영자 권한을 해제하시겠습니까?';

        if (!confirm(confirmMsg)) return;

        setUpdatingUserId(userId);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('users')
                .update({ role: nextRole })
                .eq('id', userId);

            if (error) throw error;

            // 로컬 상태 업데이트
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole } : u));
            alert('권한이 성공적으로 변경되었습니다.');
        } catch (error) {
            console.error('Role update error:', error);
            alert('권한 변경 중 오류가 발생했습니다.');
        } finally {
            setUpdatingUserId(null);
        }
    };

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <AlertCircle size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-bold">통계 데이터를 불러올 수 없습니다.</h3>
            </div>
        );
    }

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const safeDailyStats = Array.isArray(dailyStats) ? dailyStats : [];
    const maxRevenue = Math.max(...safeDailyStats.map(x => x.revenue || 0), 0) || 1;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Real-time Notifications Toast */}
            <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2">
                {notifications.map(n => (
                    <div key={n.id} className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 border border-white/10 backdrop-blur-md">
                        <div className="size-2 bg-primary rounded-full animate-ping" />
                        <span className="font-bold text-sm tracking-tight">{n.message}</span>
                    </div>
                ))}
            </div>

            {/* Top Tab Navigation */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 w-fit rounded-2xl overflow-x-auto max-w-full no-scrollbar">
                <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="개요" />
                <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="사용자" />
                <TabButton active={activeTab === 'notices'} onClick={() => setActiveTab('notices')} label="공지 관리" />
                <TabButton active={activeTab === 'inquiries'} onClick={() => setActiveTab('inquiries')} label="문의 답변" />
                <TabButton active={activeTab === 'revenue'} onClick={() => setActiveTab('revenue')} label="수익" />
                <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} label="로그" />
            </div>

            {activeTab === 'overview' && (
                <>
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
                            icon={<UsersIcon className="text-purple-500" />}
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
                                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">요청자 / 공간</th>
                                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">파트너</th>
                                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
                                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">금액</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentJobs && recentJobs.length > 0 ? recentJobs.map((job) => (
                                                <tr key={job.id} className="border-t border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white">{job.spaces?.name || '정보 없음'}</div>
                                                        <div className="text-xs text-slate-400 mt-1">{job.operator?.name || '익명'}</div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        {job.worker ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-sm overflow-hidden">
                                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${job.worker.id}`} alt="Partner" />
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{job.worker.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">모집 중</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${job.status === 'PAID_OUT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            job.status === 'DISPUTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                            }`}>
                                                            {job.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 font-black text-sm text-slate-900 dark:text-white">{formatCurrency(job.price || 0)}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={4} className="px-8 py-24 text-center">
                                                        <Clock size={40} className="mx-auto text-slate-200 mb-4" />
                                                        <p className="text-slate-400 font-medium">최근 청소 내역이 없습니다.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Alerts & Action Items */}
                        <div className="space-y-8">
                            <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-800 dark:border-slate-700">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16 animate-pulse" />
                                <h3 className="text-xl font-bold relative z-10">오늘의 관제 센터</h3>
                                <p className="text-slate-400 text-sm mt-1 relative z-10">즉시 조치가 필요한 항목</p>

                                <div className="mt-8 space-y-4 relative z-10">
                                    <ActionItem
                                        icon={<AlertCircle size={18} className="text-red-400" />}
                                        title="미해결 분쟁 알림"
                                        count={stats.disputedJobs || 0}
                                        link="/admin/disputes"
                                        urgent={!!stats.disputedJobs}
                                    />
                                    <ActionItem
                                        icon={<Clock size={18} className="text-amber-400" />}
                                        title="배정 마감 임박"
                                        count={stats.openJobs || 0}
                                        link="/admin/jobs"
                                    />
                                    <ActionItem
                                        icon={<CheckCircle2 size={18} className="text-emerald-400" />}
                                        title="최종 정산 대기"
                                        count={stats.completedJobs || 0}
                                        link="/admin/jobs?status=APPROVED"
                                    />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h3 className="text-lg font-bold mb-6">청소 수요 히트맵 (지역별)</h3>
                                <div className="space-y-6">
                                    <RegionRow name="서울 마포구" value={45} color="bg-primary" />
                                    <RegionRow name="서울 강남구" value={32} color="bg-blue-500" />
                                    <RegionRow name="경기 성남시" value={18} color="bg-emerald-500" />
                                    <RegionRow name="서울 영등포구" value={12} color="bg-amber-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'users' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-black tracking-tight">사용자 권한 관리</h3>
                            <p className="text-slate-500 text-sm mt-1 font-medium">플랫폼 관리자 임명 및 전체 사용자 계정 관리</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="이메일 또는 이름으로 검색..."
                                className="pl-12 pr-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-80 font-medium transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">사용자</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">이메일</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">현재 역할</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">가입일</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">보안 설정</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => {
                                    const isAdmin = isPlatformAdmin(user.email, user.role);
                                    return (
                                        <tr key={user.id} className="border-t border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-sm overflow-hidden shrink-0">
                                                        <img src={user.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt={user.name} />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                                            {user.name}
                                                            {isAdmin && <Shield size={14} className="text-blue-500" />}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {user.id.substring(0, 8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{user.email}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${user.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                                                    user.role === 'operator' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' :
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-800'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-medium text-slate-400">{new Date(user.created_at).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {user.role === 'admin' ? (
                                                    <button
                                                        onClick={() => handleToggleAdmin(user.id, user.role)}
                                                        disabled={updatingUserId === user.id}
                                                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ml-auto"
                                                    >
                                                        {updatingUserId === user.id ? '...' : (
                                                            <>
                                                                <UserMinus size={14} /> 권한 해제
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleToggleAdmin(user.id, user.role)}
                                                        disabled={updatingUserId === user.id}
                                                        className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ml-auto opa"
                                                    >
                                                        {updatingUserId === user.id ? '...' : (
                                                            <>
                                                                <UserPlus size={14} /> 관리자 임명
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'notices' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div>
                            <h3 className="text-2xl font-black">공지사항 관리</h3>
                            <p className="text-slate-500 text-sm mt-1 font-medium">플랫폼 전체 사용자에게 노출되는 공지를 관리합니다.</p>
                        </div>
                        <button
                            onClick={() => { setCurrentNotice({ title: '', content: '', is_important: false }); setIsNoticeModalOpen(true); }}
                            className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 transition-all"
                        >
                            <Plus size={18} /> 새 공지 작성
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {notices.map(notice => (
                            <div key={notice.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:shadow-md transition-all">
                                <div className="flex items-center gap-6">
                                    <div className={`p-4 rounded-2xl ${notice.is_important ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
                                        <AlertCircle size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {notice.is_important && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">IMPORTANT</span>}
                                            <span className="text-xs text-slate-400 font-bold">{new Date(notice.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="font-black text-slate-900 dark:text-white">{notice.title}</h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setCurrentNotice(notice); setIsNoticeModalOpen(true); }}
                                        className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                    >
                                        <ChevronRight size={18} className="text-slate-400" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteNotice(notice.id)}
                                        className="p-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors"
                                    >
                                        <UserMinus size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'inquiries' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-2xl font-black">고객 문의 답변</h3>
                        <p className="text-slate-500 text-sm mt-1 font-medium">사용자들의 1:1 문의에 답변하고 상태를 관리합니다.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">문의자</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">제목</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">접수일</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inquiries.map(inq => (
                                    <tr key={inq.id} className="border-t border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden">
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${inq.user_id}`} alt="User" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black">{inq.users?.name || '익명'}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold">{inq.users?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{inq.title}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${inq.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary animate-pulse'}`}>
                                                {inq.status === 'CLOSED' ? '답변완료' : '접수됨'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-xs text-slate-400 font-medium">
                                            {formatDate(inq.created_at)}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => { setCurrentInquiry(inq); setIsInquiryModalOpen(true); }}
                                                className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:opacity-90 active:scale-95 transition-all"
                                            >
                                                {inq.status === 'CLOSED' ? '답변 보기' : '답변 하기'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Notice Form Modal */}
            <AnimatePresence>
                {isNoticeModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-xl font-black">공지사항 {currentNotice?.id ? '수정' : '작성'}</h3>
                                <button onClick={() => setIsNoticeModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleSaveNotice} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">제목</label>
                                    <input
                                        required
                                        value={currentNotice?.title || ''}
                                        onChange={e => setCurrentNotice({ ...currentNotice, title: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                        placeholder="공지 제목을 입력하세요"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">내용</label>
                                    <textarea
                                        required
                                        value={currentNotice?.content || ''}
                                        onChange={e => setCurrentNotice({ ...currentNotice, content: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 h-48 resize-none"
                                        placeholder="공지 상세 내용을 입력하세요"
                                    />
                                </div>
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                    <input
                                        type="checkbox"
                                        id="is_important"
                                        checked={currentNotice?.is_important || false}
                                        onChange={e => setCurrentNotice({ ...currentNotice, is_important: e.target.checked })}
                                        className="size-5 accent-primary rounded-md"
                                    />
                                    <label htmlFor="is_important" className="text-sm font-black text-slate-700 dark:text-slate-200">중요 공지로 표시</label>
                                </div>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-primary text-white h-16 rounded-2xl font-black shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {saving ? '저장 중...' : '저장하기'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Inquiry Response Modal */}
            <AnimatePresence>
                {isInquiryModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <div>
                                    <h3 className="text-xl font-black">문의 본문</h3>
                                    <p className="text-xs text-slate-500 font-bold mt-1">{currentInquiry?.users?.name} ({currentInquiry?.users?.email})</p>
                                </div>
                                <button onClick={() => setIsInquiryModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <h4 className="font-black text-lg mb-3">{currentInquiry?.title}</h4>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{currentInquiry?.content}</p>
                                </div>

                                {currentInquiry?.status === 'OPEN' ? (
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-xs font-black text-primary uppercase tracking-widest ml-1">나의 답변 작성</label>
                                        <textarea
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            className="w-full bg-primary/5 dark:bg-primary/10 border-2 border-primary/10 rounded-2xl p-6 font-bold text-slate-800 dark:text-white outline-none focus:border-primary transition-all h-48 resize-none shadow-inner"
                                            placeholder="여기에 답변을 입력하세요..."
                                        />
                                        <button
                                            onClick={handleReplyInquiry}
                                            disabled={saving || !replyText.trim()}
                                            className="w-full bg-primary text-white h-16 rounded-2xl font-black shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Send size={18} /> {saving ? '답변 전송 중...' : '답변 전송하기'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-xs font-black text-emerald-500 uppercase tracking-widest ml-1">작성된 답변</label>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-6 text-sm font-bold text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap leading-relaxed">
                                            {currentInquiry?.reply}
                                            <div className="text-[10px] opacity-60 mt-4 flex items-center gap-1">
                                                <CheckCircle2 size={12} /> {new Date(currentInquiry?.responded_at).toLocaleString()} 에 전송됨
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TabButton({ active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${active
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
        >
            {label}
        </button>
    );
}

function StatCard({ title, value, trend, isUp, icon, color, link }: any) {
    const content = (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:translate-y-[-6px] hover:shadow-xl group">
            <div className="flex items-center justify-between mb-6">
                <div className={`${color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>{icon}</div>
                <div className={`flex items-center px-2 py-1 rounded-full text-[10px] font-black ${isUp ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'text-red-500 bg-red-50 dark:bg-red-900/10'}`}>
                    {isUp ? <ArrowUpRight size={14} className="mr-0.5" /> : <ArrowDownRight size={14} className="mr-0.5" />}
                    {trend}
                </div>
            </div>
            <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] mb-1">{title}</p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h4>
            </div>
        </div>
    );

    return link ? <Link href={link}>{content}</Link> : content;
}

function ActionItem({ icon, title, count, link, urgent }: any) {
    return (
        <Link href={link} className={`flex items-center justify-between p-5 rounded-2xl transition-all border group ${urgent
            ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
            : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}>
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${urgent ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
                    {icon}
                </div>
                <span className={`text-sm font-bold ${urgent ? 'text-red-200' : 'text-slate-200'}`}>{title}</span>
            </div>
            <div className="flex items-center gap-3">
                <span className={`text-xl font-black ${urgent ? 'text-white' : 'text-white'}`}>{count}</span>
                <ChevronRight size={16} className={`${urgent ? 'text-red-400' : 'text-slate-500'} group-hover:translate-x-1 transition-transform`} />
            </div>
        </Link>
    );
}

function RegionRow({ name, value, color }: any) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest leading-none">
                <span className="text-slate-500 dark:text-slate-400">{name}</span>
                <span className="text-slate-900 dark:text-white">{value}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}
