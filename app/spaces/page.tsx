import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const DEFAULT_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB3uDn4fhqpMAYj_CIzCXdhwuPcUwPe51jULnc4SZ2_huzrFhECeVJo7lGV9KxSoMQSAgQWmhyjayAENRLuBu7s3-x3fXAO1t0gNJdkIEcuIS4ePIm8QT78_FmvDeg3DOhylDeYDOdRJi2lFAFDc9mHTOzKLpUpWFt_1eAYXOnGkt6IXxpR_Ox9T7SweWVOlXL-KFpbxOYt9ojy_XyApXSjjwzE7QDqyeltgAoxzrUn2kGa7UJMiUQdJhtRb7HxZgInSoao8gtCvYs",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAgt6s_pd-hQY0yrZWNlTNs3IJ09zlDuMg4mGrtfeaTktfiDVS_uKBuJ0cmrA4DTZTVenTaOkzq9n9IkHBnLuw20nBwBtNrEbF4bTOde2Fg63XMp59zIvoJQ5LIBEYC1Jqwr7rlFVsuOSxxyqZU_lGsQOCJS7kR3s2XiIjU5mAQ8FWvh9J_bq1fwbpuA4ndZ4f7dv1kPMDfCCU1T1px_eP6H4z2z4zNw-tqSEok5RmlV03uP0cKlVxMKQnL6--JGEuWUciBhq0l5I4",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDFItccUc4HGU3uylR8put-DTeK4wZK0xCp02Af5VN1EX7Ez0OwyYPsreSjLveFz6nCFXfL7lBwDvNb1aOXsmPPN5MESQQNMOSKDNQmWM6KITFuKy9FI-0YyepoqTC4yYwYjeLXGVVHTMOd-PZ98cB6ALI939SWbQVgEmmzEB4offhoiejW-7ZUCLFys-De4ViZcWZwZ-cTd30zgRbvhnzUfdqZgrczXkwd5JT_oVgDXmtNB7qR1BiC1h4srs754um0qYANEzchtD8"
];

export default async function SpacesListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: spacesData } = await supabase
    .from('spaces')
    .select('*')
    .eq('operator_id', user.id)
    .order('created_at', { ascending: false });

  const spaces = spacesData || [];

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display antialiased max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight">My Spaces</h1>
        <Link href="/spaces/create" className="flex items-center gap-1 text-primary font-medium hover:text-primary/80 transition-colors">
          <span className="material-symbols-outlined text-xl">add</span>
          <span className="text-sm">새 공간 등록</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-24">
        {spaces.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-10 text-center flex flex-col items-center shadow-sm border border-slate-100 dark:border-slate-800">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-4">domain</span>
            <h3 className="text-lg font-bold mb-2">등록된 공간이 없습니다</h3>
            <p className="text-sm text-slate-500 mb-6">첫 공간을 등록하고 프리미엄 청소 서비스를 만나보세요.</p>
            <Link href="/spaces/create" className="bg-primary text-white px-5 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm">
              공간 등록하기
            </Link>
          </div>
        ) : (
          spaces.map((space, index) => {
            const bgImage = DEFAULT_IMAGES[index % DEFAULT_IMAGES.length];
            // Format created_at or last_cleaned date if we had one
            const dateObj = new Date(space.created_at);
            const dateStr = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;

            return (
              <Link href={`/spaces/${space.id}`} key={space.id} className="block group">
                <article className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex gap-4 items-center hover:shadow-md transition-shadow">
                  <div className="flex-1 space-y-2">
                    <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-full">
                      {space.is_active ? '✅ 운영 중' : '⏸️ 중단됨'} · {dateStr} 등록
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{space.name}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {space.address || '주소 정보 없음'}
                      </p>
                    </div>
                  </div>
                  <div className="w-24 h-24 rounded-lg bg-cover bg-center shrink-0 border border-slate-100 dark:border-slate-800" style={{ backgroundImage: `url('${bgImage}')` }}></div>
                </article>
              </Link>
            );
          })
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,20px)]">
        <div className="flex justify-around items-center h-16">
          <Link href="/dashboard" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl mb-1">home</span>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/spaces" className="flex flex-col items-center justify-center w-full h-full text-primary">
            <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span>
            <span className="text-[10px] font-medium">Spaces</span>
          </Link>
          <Link href="/requests" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl mb-1">assignment</span>
            <span className="text-[10px] font-medium">Requests</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl mb-1">person</span>
            <span className="text-[10px] font-medium">My</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
