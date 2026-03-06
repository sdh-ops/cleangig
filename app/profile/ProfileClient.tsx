'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import { isPlatformAdmin } from '@/lib/admin';

const TIER_CONFIG: Record<string, { label: string; color: string; next: string; desc: string }> = {
  STARTER: { label: '🌱 스타터', color: '#94A3B8', next: '실버 (10건 완료)', desc: '수수료 10%' },
  SILVER: { label: '🥈 실버', color: '#94A3B8', next: '골드 (50건 완료)', desc: '수수료 9%' },
  GOLD: { label: '🥇 골드', color: '#F59E0B', next: '마스터 (200건 완료)', desc: '수수료 8%' },
  MASTER: { label: '👑 마스터', color: '#8B5CF6', next: '최고 등급!', desc: '수수료 7%' },
};

const SPARKLE_DESC = "친절도, 응답 속도, 청소 매너를 종합한 점수입니다. 99.9℃에 도전해보세요!";
const RATING_DESC = "청소 완료 후 공간 운영자가 남긴 별점 평균입니다. 서비스 품질의 지표가 됩니다.";

interface Props {
  profile: { id: string; name: string; email?: string; phone?: string; profile_image?: string; role: string; tier?: string; avg_rating?: number; total_jobs?: number; bio?: string; bank_account?: any; is_verified?: boolean; manner_temperature?: number };
  totalCompletedJobs: number;
}

export default function ProfileClient({ profile, totalCompletedJobs }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [bankName, setBankName] = useState(profile.bank_account?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(profile.bank_account?.accountNumber || '');
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  const tierInfo = TIER_CONFIG[profile.tier || 'STARTER'];

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from('users').update({
      name,
      bio,
      phone,
      bank_account: { bankName, accountNumber }
    }).eq('id', profile.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  const handleRoleSwitch = async () => {
    const nextRole = profile.role === 'worker' ? 'operator' : 'worker';
    const roleName = nextRole === 'worker' ? '클린파트너' : '공간파트너';

    if (!confirm(`${roleName}(으)로 역할을 전환하시겠습니까?`)) return;

    setSwitching(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('users').update({ role: nextRole }).eq('id', profile.id);
      if (error) throw error;
      router.push(nextRole === 'worker' ? '/clean' : '/dashboard');
      router.refresh();
    } catch (e) {
      alert('역할 전환 중 오류가 발생했습니다.');
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-md mx-auto border-x border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl antialiased">

        {/* Header - Profile Title and Settings */}
        <div className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
          <button onClick={() => router.back()} className="flex size-10 items-center justify-center text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-tight">프로필 설정</h2>
          <button onClick={handleLogout} className="flex size-10 items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-all">
            <span className="material-symbols-outlined text-2xl">logout</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          {/* Profile Basic Info Card */}
          <div className="p-6">
            <div className="flex flex-col items-center mb-10">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                <div className="relative size-32 rounded-full border-4 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-2xl">
                  <img
                    src={profile.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                  {!editing && (
                    <button className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                    </button>
                  )}
                </div>
                {!editing && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-white p-2 rounded-full border-4 border-white dark:border-slate-900 shadow-lg">
                    <span className="material-symbols-outlined text-base">verified</span>
                  </div>
                )}
              </div>

              {!editing ? (
                <>
                  <h3 className="text-2xl font-black mt-6 text-slate-900 dark:text-white">{profile.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[11px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                      ID: {profile.id.substring(0, 8)}
                    </span>
                    <span className="px-3 py-1 bg-primary/10 rounded-full text-[11px] font-bold text-primary uppercase tracking-widest border border-primary/20">
                      {profile.role === 'worker' ? 'Clean Partner' : 'Space Partner'}
                    </span>
                  </div>
                  <p className="mt-4 text-center text-slate-500 dark:text-slate-400 text-sm max-w-[80%] leading-relaxed font-medium">
                    {profile.bio || '자기소개를 등록해보세요.'}
                  </p>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-6 px-6 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    프로필 수정하기
                  </button>
                </>
              ) : (
                <div className="w-full space-y-4 mt-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">이름</label>
                    <input
                      className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="성함을 입력하세요"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">한 줄 소개</label>
                    <textarea
                      className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium resize-none"
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="자기소개를 간단히 작성해주세요"
                      rows={2}
                    />
                  </div>
                  <button
                    className="w-full mt-2 bg-primary hover:bg-primary/90 text-white rounded-xl h-14 font-bold shadow-sm transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                    {saving ? '저장 중...' : '프로필 수정 완료'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-2 bg-slate-50 dark:bg-slate-800/50 w-full"></div>

          {/* Stats Area */}
          <div className="flex px-4 py-5 gap-3">
            <div className="flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md group relative">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1.5">평점</span>
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{profile.avg_rating?.toFixed(1) || '5.0'}</span>
              <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-30 text-center leading-tight">
                {RATING_DESC}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-2xl bg-white dark:bg-slate-900 border border-primary/20 dark:border-primary/30 shadow-sm relative overflow-hidden transition-shadow hover:shadow-md group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10" />
              <span className="text-xs text-primary font-bold mb-1.5 relative z-10">스파클 온도</span>
              <span className="text-xl font-black text-primary relative z-10 tracking-tight">{profile.manner_temperature || 98}점</span>
              <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-primary text-white text-[10px] rounded-lg shadow-xl z-30 text-center leading-tight">
                {SPARKLE_DESC}
              </div>
            </div>
          </div>

          <div className="h-2 bg-slate-50 dark:bg-slate-800/50 w-full mb-2"></div>

          {/* Menu List */}
          <div className="flex flex-col py-2 px-3">
            {/* 역할 전환 */}
            <button onClick={handleRoleSwitch} disabled={switching} className="flex items-center gap-4 px-3 py-3 min-h-[64px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-2xl text-left w-full group mb-1">
              <div className="flex items-center justify-center rounded-[14px] bg-primary/10 dark:bg-primary/20 text-primary shrink-0 size-12 group-active:scale-95 transition-transform">
                <span className="material-symbols-outlined">{profile.role === 'worker' ? 'store' : 'cleaning_services'}</span>
              </div>
              <div className="flex flex-col flex-1">
                <p className="text-[17px] font-bold leading-tight text-slate-900 dark:text-slate-100 mb-0.5">{profile.role === 'worker' ? '공간 파트너로 전환' : '클린 파트너로 전환'}</p>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">클라이언트 모드로 역할을 변경합니다</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800/80 mx-3 my-1"></div>

            {/* Settings Menu */}
            <div className="px-0 py-2 space-y-1">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                onClick={() => router.push(profile.role === 'worker' ? '/earnings' : '/payments')}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">계좌 및 정산 관리</p>
                    <p className="text-[10px] text-slate-400">
                      {profile.role === 'worker' ? '수익금 확인 및 출금 신청' : '나의 결제 내역 및 지출 관리'}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </button>

              {/* 운영자 대시보드 (어드민 화이트리스트 전용) */}
              {isPlatformAdmin(profile.email) && (
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                  onClick={() => router.push('/admin')}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-500">
                      <span className="material-symbols-outlined">admin_panel_settings</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-blue-600">운영자 대시보드</p>
                      <p className="text-[10px] text-blue-400">플랫폼 전체 현황 관리</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-blue-400">chevron_right</span>
                </button>
              )}

              <button
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                onClick={() => alert('준비 중인 기능입니다.')}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                    <span className="material-symbols-outlined">campaign</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">공지사항</p>
                    <p className="text-[10px] text-slate-400">새로운 소식과 업데이트</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </button>

              <button
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                onClick={() => alert('준비 중인 기능입니다.')}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                    <span className="material-symbols-outlined">support_agent</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">고객센터</p>
                    <p className="text-[10px] text-slate-400">도움이 필요하신가요?</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
