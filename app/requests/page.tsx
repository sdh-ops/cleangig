import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';
import RequestsClient from './RequestsClient';

export default async function RequestsPage(props: { searchParams?: Promise<{ tab?: string }> }) {
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
    statusFilter = ['OPEN', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'SUBMITTED', 'DISPUTED'];
  } else if (currentTab === 'completed') {
    statusFilter = ['APPROVED', 'PAID_OUT'];
  } else if (currentTab === 'canceled') {
    statusFilter = ['CANCELED'];
  }

  const { data: jobData } = await supabase
    .from('jobs')
    .select('*, spaces(name, address, type, reference_photos), cleaner:worker_id(id, name, profile_image)')
    .eq('operator_id', user.id)
    .in('status', statusFilter)
    .order('scheduled_at', { ascending: false });

  const jobs = (jobData || []) as any[];

  const getTabClass = (tabName: string) => {
    const isActive = currentTab === tabName;
    return `flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 transition-colors ${isActive
      ? 'border-b-primary text-slate-900 dark:text-slate-100'
      : 'border-b-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
      }`;
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-md mx-auto border-x border-slate-200 dark:border-slate-800">

        {/* Header */}
        <div className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur z-20">
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">내 요청 내역</h2>
        </div>

        {/* Tabs */}
        <div className="pb-3 sticky top-12 bg-background-light dark:bg-background-dark z-20 border-b border-slate-50 dark:border-slate-800">
          <div className="flex px-4 justify-between">
            <Link href="/requests?tab=active" className={getTabClass('active')}>
              <p className="text-sm font-bold leading-normal tracking-[0.015em]">진행 중</p>
            </Link>
            <Link href="/requests?tab=completed" className={getTabClass('completed')}>
              <p className="text-sm font-bold leading-normal tracking-[0.015em]">완료</p>
            </Link>
            <Link href="/requests?tab=canceled" className={getTabClass('canceled')}>
              <p className="text-sm font-bold leading-normal tracking-[0.015em]">취소</p>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto pb-24 pt-4">
          <RequestsClient jobs={jobs} currentTab={currentTab} />
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
