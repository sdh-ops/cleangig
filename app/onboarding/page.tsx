'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<'operator' | 'worker' | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleNext = async () => {
    if (!selectedRole) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').update({ role: selectedRole }).eq('id', user.id);
      }
      if (selectedRole === 'operator') {
        router.push('/dashboard');
      } else {
        router.push('/clean');
      }
    } catch (error) {
      console.error('Role update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-md mx-auto bg-white dark:bg-slate-900 shadow-xl antialiased">
      {/* Header Section */}
      <div className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <button
          onClick={() => router.push('/login')}
          className="flex size-12 shrink-0 items-center justify-center text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex-1"></div> {/* Spacer for balancing */}
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold leading-tight mb-3">나는 어떤 파트너인가요?</h1>
          <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
            CleanGig Premium 서비스 이용을 위해<br />역할을 선택해주세요.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Option 1: Space Partner */}
          <button
            onClick={() => setSelectedRole('operator')}
            className="w-full text-left group relative transition-all duration-300"
          >
            <div className={`absolute inset-0 rounded-2xl border-2 shadow-sm transition-all ${selectedRole === 'operator' ? 'bg-primary/5 border-primary scale-100' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/50 group-hover:shadow-md'}`}></div>
            <div className="relative flex flex-col p-6 items-center sm:flex-row sm:items-start gap-5">
              <div className={`shrink-0 size-20 rounded-full flex items-center justify-center transition-all duration-300 ${selectedRole === 'operator' ? 'bg-primary/10 text-primary group-hover:scale-110' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-primary/5 group-hover:text-primary'}`}>
                <span className="material-symbols-outlined text-4xl">home_work</span>
              </div>
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left pt-2">
                <h3 className={`text-xl font-bold mb-2 transition-colors ${selectedRole === 'operator' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-900 dark:text-slate-100 group-hover:text-primary'}`}>공간 파트너</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">내 공간을 등록하고 전문가의<br />프리미엄 청소 서비스를 받고 싶어요.</p>
              </div>
              {selectedRole === 'operator' && (
                <div className="absolute top-4 right-4 text-primary">
                  <span className="material-symbols-outlined text-3xl font-bold">check_circle</span>
                </div>
              )}
            </div>
          </button>

          {/* Option 2: Clean Partner */}
          <button
            onClick={() => setSelectedRole('worker')}
            className="w-full text-left group relative transition-all duration-300"
          >
            <div className={`absolute inset-0 rounded-2xl border-2 shadow-sm transition-all ${selectedRole === 'worker' ? 'bg-primary/5 border-primary scale-100' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/50 group-hover:shadow-md'}`}></div>
            <div className="relative flex flex-col p-6 items-center sm:flex-row sm:items-start gap-5">
              <div className={`shrink-0 size-20 rounded-full flex items-center justify-center transition-all duration-300 ${selectedRole === 'worker' ? 'bg-primary/10 text-primary group-hover:scale-110' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-primary/5 group-hover:text-primary'}`}>
                <span className="material-symbols-outlined text-4xl">cleaning_services</span>
              </div>
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left pt-2">
                <h3 className={`text-xl font-bold mb-2 transition-colors ${selectedRole === 'worker' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-900 dark:text-slate-100 group-hover:text-primary'}`}>클린 파트너</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">청소 전문가로 등록하여<br />자유롭게 수익을 창출하고 싶어요.</p>
              </div>
              {selectedRole === 'worker' && (
                <div className="absolute top-4 right-4 text-primary">
                  <span className="material-symbols-outlined text-3xl font-bold">check_circle</span>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-4 pb-8 sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900 dark:to-transparent">
        <button
          onClick={handleNext}
          disabled={!selectedRole || loading}
          className={`w-full font-bold py-4 px-6 rounded-xl text-lg shadow-lg transition-all duration-300 transform ${selectedRole ? 'bg-primary hover:bg-primary/90 text-white hover:shadow-xl hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 dark:bg-slate-800 cursor-not-allowed'}`}
        >
          {loading ? '처리 중...' : '다음으로'}
        </button>
      </div>
    </div>
  );
}
