import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function NotificationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch notifications
    const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

    const notifications = notificationsData || [];

    // Mark all as read conceptually (in a real app this might be an API call or triggered on view)
    // We can do an immediate update if needed, but for now we just display them.

    return (
        <div className="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center antialiased w-full">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md bg-background-light dark:bg-background-dark shadow-xl overflow-x-hidden border-x border-slate-200 dark:border-slate-800">
                {/* Header */}
                <header className="flex items-center justify-between px-4 py-4 bg-background-light/90 dark:bg-background-dark/90 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                    <Link href="/dashboard" aria-label="뒤로가기" className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </Link>
                    <h1 className="text-lg font-bold">알림</h1>
                    <button aria-label="설정" className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[24px]">settings</span>
                    </button>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                    {/* Filter/Tabs (Optional but good for UX) */}
                    <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800">
                        <button className="px-4 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold whitespace-nowrap shadow-sm">전체</button>
                        <button className="px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold whitespace-nowrap hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">매칭</button>
                        <button className="px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold whitespace-nowrap hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">작업</button>
                        <button className="px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold whitespace-nowrap hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">결제</button>
                    </div>

                    {/* Notification List */}
                    <div className="flex flex-col">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700">
                                    <span className="material-symbols-outlined text-[32px] text-slate-400 dark:text-slate-500">notifications_off</span>
                                </div>
                                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">새로운 알림이 없습니다</h3>
                                <p className="text-sm text-slate-500 font-medium">활동 내역이나 새로운 소식이 여기에 표시됩니다.</p>
                            </div>
                        ) : (
                            notifications.map((notif: any) => {
                                const isUnread = !notif.is_read;

                                // Determine icon based on title or content
                                let icon = "notifications";
                                let iconBg = "bg-primary/10";
                                let iconColor = "text-primary";

                                if (notif.title?.includes('매칭')) {
                                    icon = "handshake";
                                } else if (notif.title?.includes('시작') || notif.title?.includes('진행')) {
                                    icon = "play_circle";
                                    iconBg = "bg-amber-500/10";
                                    iconColor = "text-amber-500";
                                } else if (notif.title?.includes('결제') || notif.title?.includes('수익')) {
                                    icon = "credit_card";
                                    iconBg = "bg-emerald-500/10";
                                    iconColor = "text-emerald-500";
                                } else if (notif.title?.includes('요청') || notif.title?.includes('리뷰')) {
                                    icon = "rate_review";
                                    iconBg = "bg-purple-500/10";
                                    iconColor = "text-purple-500";
                                }

                                const dateStr = new Date(notif.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

                                return (
                                    <Link href={notif.url || '#'} key={notif.id} className={`flex items-start gap-4 px-4 py-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer relative ${isUnread ? 'bg-white dark:bg-slate-900/80' : 'bg-slate-50/50 dark:bg-slate-900/30 opacity-70'}`}>
                                        <div className={`flex items-center justify-center w-12 h-12 rounded-[14px] ${iconBg} ${iconColor} shrink-0`}>
                                            <span className="material-symbols-outlined">{icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 pr-2 pb-1">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <p className={`text-[15px] font-bold truncate pr-2 ${isUnread ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>{notif.title || '알림'}</p>
                                                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">{dateStr}</span>
                                            </div>
                                            <p className={`text-[13px] leading-snug line-clamp-2 ${isUnread ? 'text-slate-600 dark:text-slate-400 font-medium' : 'text-slate-500 dark:text-slate-500'}`}>
                                                {notif.message}
                                            </p>
                                        </div>
                                        {isUnread && (
                                            <div className="absolute top-5 right-4 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_0_2px_#fff] dark:shadow-[0_0_0_2px_#0f172a]"></div>
                                        )}
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </main>

            </div>
        </div>
    );
}
