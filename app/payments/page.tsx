import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';

export default async function PaymentsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 공간파트너(operator)의 지출 내역 가져오기
    const { data: paymentsData } = await supabase
        .from('jobs')
        .select('*, spaces(name, address)')
        .eq('operator_id', user.id)
        .in('status', ['APPROVED', 'PAID_OUT'])
        .order('created_at', { ascending: false });

    const payments = paymentsData || [];
    const totalSpent = payments.reduce((acc, job) => acc + (job.price || 0), 0);

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen">
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-md mx-auto border-x border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">

                {/* Header */}
                <div className="flex items-center p-4 pb-2 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 border-b border-slate-100 dark:border-slate-800">
                    <Link href="/profile" className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">결제 및 지출 내역</h2>
                </div>

                <div className="flex-1 overflow-y-auto pb-24">
                    {/* Summary Card */}
                    <div className="p-6">
                        <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16" />
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2 relative z-10">총 지출 금액</p>
                            <h3 className="text-4xl font-black relative z-10">{totalSpent.toLocaleString()}원</h3>
                            <div className="mt-6 flex items-center gap-2 text-emerald-400 font-bold text-sm relative z-10">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                캡슐 결제 시스템 보호 중
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="px-6 flex gap-3 mb-8">
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 mb-1">완료된 청소</p>
                            <p className="text-lg font-bold">{payments.length}건</p>
                        </div>
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 mb-1">평균 비용</p>
                            <p className="text-lg font-bold">
                                {payments.length > 0 ? Math.floor(totalSpent / payments.length).toLocaleString() : 0}원
                            </p>
                        </div>
                    </div>

                    {/* History */}
                    <div className="px-6">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">상세 내역</h4>

                        {payments.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                                <span className="material-symbols-outlined text-6xl mb-4">receipt_long</span>
                                <p className="text-sm font-medium">아직 완료된 결제 내역이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {payments.map((job) => (
                                    <div key={job.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(job.created_at).toLocaleDateString()}</span>
                                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-bold text-slate-500 uppercase tracking-tighter">SUCCESS</span>
                                            </div>
                                            <p className="font-bold text-sm group-hover:text-primary transition-colors">{job.spaces?.name || '공간 정보 없음'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{job.spaces?.address}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-900 dark:text-white">-{job.price?.toLocaleString()}원</p>
                                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">VISA ****</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <BottomNav />
            </div>
        </div>
    );
}
