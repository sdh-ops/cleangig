import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';

export default async function EarningsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'worker') {
    redirect('/dashboard');
  }

  const { data: payData } = await supabase
    .from('payments')
    .select('*, jobs(scheduled_at, spaces(name))')
    .eq('worker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const payments = payData || [];
  const totalEarned = payments.filter((p: any) => p.status === 'RELEASED').reduce((s: number, p: any) => s + p.worker_payout, 0);
  const pendingAmount = payments.filter((p: any) => p.status === 'HELD').reduce((s: number, p: any) => s + p.worker_payout, 0);

  return (
    <div className="font-display text-slate-900 dark:text-slate-100 antialiased bg-background-light dark:bg-background-dark">
      <div className="relative flex min-h-screen w-full flex-col mx-auto max-w-md bg-[#F7F8F0] dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center p-4 justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
          <Link href="/clean" className="flex size-12 shrink-0 items-center justify-center cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
          </Link>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center text-slate-900 dark:text-white">수익 및 정산 홈</h2>
          <div className="size-12 shrink-0"></div>
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
          {/* Total Balance */}
          <div className="flex flex-col items-center justify-center pt-8 pb-4 bg-[#F7F8F0] dark:bg-slate-900">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-1">총 누적 수령액</p>
            <h1 className="text-primary tracking-tight text-[36px] font-black leading-tight">₩{totalEarned.toLocaleString()}</h1>
          </div>

          {/* Actions */}
          <div className="flex px-4 py-3 bg-[#F7F8F0] dark:bg-slate-900 gap-3">
            <button className="flex h-14 px-5 flex-1 items-center justify-center rounded-xl bg-primary text-white text-base font-bold shadow-sm hover:bg-primary/90 transition-colors active:scale-[0.98]">
              출금 신청
            </button>
          </div>

          {/* Pending Hint Area */}
          {pendingAmount > 0 && (
            <div className="px-4 py-2 bg-[#F7F8F0] dark:bg-slate-900">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-center gap-3 border border-amber-200 dark:border-amber-800/50">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <span className="material-symbols-outlined font-light">schedule</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-100">정산 대기 중: ₩{pendingAmount.toLocaleString()}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">매주 월요일 자동 입금 예정</p>
                </div>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="flex-1 bg-white dark:bg-slate-800 mt-4 rounded-t-[24px] shadow-[0_-4px_16px_rgba(0,0,0,0.03)] border-t border-slate-100 dark:border-slate-700 pt-6 px-4 pb-24 min-h-[400px]">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">정산 내역</h3>
              <button className="text-sm font-bold text-primary flex items-center hover:opacity-80 transition-opacity">
                전체 보기
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            <div className="flex flex-col">
              {payments.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-600">account_balance_wallet</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">정산 내역이 없습니다</h3>
                  <p className="text-sm text-slate-500 mb-6 font-medium">첫 청소를 완료하고 수익을 창출해 보세요!</p>
                  <Link href="/clean/jobs" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-sm text-sm">
                    일감 찾으러 가기
                  </Link>
                </div>
              ) : (
                payments.map((p: any) => {
                  const isPaid = p.status === 'RELEASED';
                  const isPending = p.status === 'HELD';
                  const jobName = (p.jobs as any)?.spaces?.name || '현장 청소 업무';
                  const dateStr = (p.jobs as any)?.scheduled_at
                    ? new Date((p.jobs as any).scheduled_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
                    : '진행 처리중';

                  const badgeStr = isPaid ? '정산 완료' : isPending ? '정산 대기' : '환불/기타';
                  const badgeColor = isPaid
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light'
                    : isPending
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
                  const icon = isPaid ? 'check_circle' : isPending ? 'schedule' : 'error';

                  return (
                    <div key={p.id} className="flex flex-col py-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors -mx-4 px-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                            <span className="material-symbols-outlined fill-current">cleaning_services</span>
                          </div>
                          <div className="flex flex-col">
                            <p className="text-[15px] font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{jobName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{dateStr}</p>
                              <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                              <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-extrabold tracking-tight ${badgeColor} flex items-center gap-0.5`}>
                                <span className="material-symbols-outlined text-[10px]">{icon}</span> {badgeStr}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-black tracking-tight ${isPaid ? 'text-primary dark:text-primary-light' : 'text-slate-700 dark:text-slate-300'}`}>
                            +₩{p.worker_payout.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg ml-[60px]">
                        <span className="font-semibold">원천징수(3.3%)</span>
                        <span className="font-bold">-₩{p.withholding_tax.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>

        <BottomNav />

      </div>
    </div>
  );
}
