'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

const TIER_CONFIG: Record<string, { label: string; color: string; next: string; desc: string }> = {
    STARTER: { label: '🌱 스타터', color: '#94A3B8', next: '실버 (10건 완료)', desc: '수수료 10%' },
    SILVER: { label: '🥈 실버', color: '#94A3B8', next: '골드 (50건 완료)', desc: '수수료 9%' },
    GOLD: { label: '🥇 골드', color: '#F59E0B', next: '마스터 (200건 완료)', desc: '수수료 8%' },
    MASTER: { label: '👑 마스터', color: '#8B5CF6', next: '최고 등급!', desc: '수수료 7%' },
};

interface Props {
    profile: { id: string; name: string; email?: string; phone?: string; profile_image?: string; role: string; tier?: string; avg_rating?: number; total_jobs?: number; bio?: string; bank_account?: any; is_verified?: boolean; manner_temperature?: number };
    totalCompletedJobs: number;
}

export default function ProfileClient({ profile, totalCompletedJobs }: Props) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(profile.name);
    const [bio, setBio] = useState(profile.bio || '');
    const [saving, setSaving] = useState(false);
    const [switching, setSwitching] = useState(false);

    const tierInfo = TIER_CONFIG[profile.tier || 'STARTER'];

    const handleSave = async () => {
        setSaving(true);
        const supabase = createClient();
        await supabase.from('users').update({ name, bio }).eq('id', profile.id);
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
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
    };

    return (
        <div className="page-container bg-premium-v2">
            <Header />

            <main className="page-content">
                {/* Profile Card */}
                <section className="profile-section">
                    <div className="profile-card-premium card">
                        <div className="profile-top">
                            <div className="avatar-large">
                                {profile.profile_image ? (
                                    <img src={profile.profile_image} alt="" />
                                ) : (
                                    <span className="initial">{profile.name[0]}</span>
                                )}
                                <button className="edit-btn" onClick={() => setEditing(!editing)}>
                                    {editing ? '✓' : '⚙️'}
                                </button>
                            </div>
                            <div className="profile-info">
                                <div className="badges">
                                    <span className="role-badge">{profile.role === 'worker' ? '클린 파트너' : '공간 파트너'}</span>
                                    {profile.is_verified && <span className="verified-badge">인증됨</span>}
                                </div>
                                {editing ? (
                                    <input
                                        className="name-input"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <h2 className="profile-name">{profile.name}님</h2>
                                )}
                                <p className="profile-email text-tertiary">{profile.email}</p>
                            </div>
                        </div>

                        {editing && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="edit-area"
                            >
                                <textarea
                                    className="bio-input"
                                    placeholder="자기소개를 입력해 주세요"
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    rows={3}
                                />
                                <button className="btn-save" onClick={handleSave} disabled={saving}>
                                    {saving ? '저장 중...' : '프로필 수정 완료'}
                                </button>
                            </motion.div>
                        )}
                    </div>
                </section>

                {/* Stats Grid (V2 Bento Style) */}
                <section className="stats-section">
                    <div className="stats-row">
                        <div className="stat-item card">
                            <span className="label">완료한 청소</span>
                            <span className="value">{totalCompletedJobs}건</span>
                        </div>
                        <div className="stat-item card">
                            <span className="label">평균 별점</span>
                            <span className="value">⭐ {profile.avg_rating?.toFixed(1) || '5.0'}</span>
                        </div>
                    </div>
                    <div className="sparkle-stats card-premium">
                        <div className="sparkle-header">
                            <span className="label">신뢰도 (스파클 점수)</span>
                            <span className="score">98%</span>
                        </div>
                        <div className="progress-bar-v2">
                            <div className="progress" style={{ width: '98%' }} />
                        </div>
                        <p className="detail">상위 2%의 우수한 파트너입니다! ✨</p>
                    </div>
                </section>

                {/* Menu List */}
                <section className="menu-section">
                    <div className="menu-group card">
                        <button className="menu-item role-switch" onClick={handleRoleSwitch} disabled={switching}>
                            <div className="icon-box role-icon">
                                {profile.role === 'worker' ? '🏠' : '🧹'}
                            </div>
                            <div className="menu-text">
                                <span className="title">{profile.role === 'worker' ? '공간 파트너로 전환' : '클린 파트너로 전환'}</span>
                                <span className="desc">클라이언트 모드로 역할을 변경합니다.</span>
                            </div>
                            <span className="arrow">›</span>
                        </button>

                        {[
                            { icon: '🏦', title: '내 계좌 및 수익 분석', desc: '정산 정보와 세부 수익을 확인하세요' },
                            { icon: '🔔', title: '알림 및 활동 알림', desc: '새로운 일감 및 채팅 알림 설정' },
                            { icon: '🛡️', title: '보안 및 약관 관리', desc: '비밀번호 변경 및 서비스 정책' },
                            { icon: '📞', title: '1:1 고객 센터', sub: '도움이 필요하신가요?' },
                        ].map((item, i) => (
                            <div key={i} className="menu-item">
                                <div className="icon-box">{item.icon}</div>
                                <div className="menu-text">
                                    <span className="title">{item.title}</span>
                                    <span className="desc">{item.desc}</span>
                                </div>
                                <span className="arrow">›</span>
                            </div>
                        ))}
                    </div>
                </section>

                <button className="logout-btn-premium" onClick={handleLogout}>
                    로그아웃
                </button>
            </main>

            <BottomNav />

            <style jsx>{`
        .bg-premium-v2 {
          background-color: var(--color-bg);
          min-height: 100vh;
        }
        .page-content {
          padding: 24px 20px 120px;
        }
        .profile-section {
          margin-bottom: 24px;
        }
        .profile-card-premium {
          padding: 32px 24px;
        }
        .profile-top {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .avatar-large {
          position: relative;
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: var(--color-primary-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: visible;
          border: 1px solid var(--color-border-light);
        }
        .avatar-large img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .avatar-large .initial {
          font-size: 32px;
          font-weight: 800;
          color: var(--color-primary);
        }
        .edit-btn {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 32px;
          height: 32px;
          background: #FFFFFF;
          border: 1px solid var(--color-border-light);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: var(--shadow-sm);
        }
        .badges {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }
        .role-badge {
          background: var(--color-primary-soft);
          color: var(--color-primary);
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 8px;
        }
        .verified-badge {
          background: #E6FFFA;
          color: #00A3BF;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 8px;
        }
        .profile-name {
          font-size: 24px;
          font-weight: 800;
          color: var(--color-text-primary);
          margin-bottom: 4px;
        }
        .name-input {
          font-size: 22px;
          font-weight: 800;
          color: var(--color-text-primary);
          background: #F8F9FA;
          border: 1px solid var(--color-border-light);
          border-radius: 8px;
          padding: 4px 12px;
          width: 100%;
        }
        .profile-email {
          font-size: 14px;
        }
        .edit-area {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bio-input {
          width: 100%;
          background: #F8F9FA;
          border: 1px solid var(--color-border-light);
          border-radius: 16px;
          padding: 16px;
          font-size: 15px;
          resize: none;
        }
        .btn-save {
          background: var(--color-primary);
          color: #FFF;
          height: 52px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 16px;
        }
        .stats-section {
          margin-bottom: 32px;
        }
        .stats-row {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        .stat-item {
          flex: 1;
          padding: 20px;
          text-align: center;
        }
        .stat-item .label {
          font-size: 12px;
          color: var(--color-text-tertiary);
          font-weight: 700;
          display: block;
          margin-bottom: 4px;
        }
        .stat-item .value {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-text-primary);
        }
        .sparkle-stats {
          padding: 24px;
          background: linear-gradient(135deg, var(--color-primary-soft) 0%, #FFFFFF 100%);
        }
        .sparkle-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          align-items: center;
        }
        .sparkle-header .label {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-secondary);
        }
        .sparkle-header .score {
          font-size: 22px;
          font-weight: 900;
          color: var(--color-primary);
        }
        .progress-bar-v2 {
          height: 10px;
          background: rgba(0,0,0,0.05);
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .progress-bar-v2 .progress {
          height: 100%;
          background: var(--color-primary);
          border-radius: 20px;
        }
        .sparkle-stats .detail {
          font-size: 12px;
          color: var(--color-primary-medium);
          font-weight: 700;
        }
        .menu-section {
          margin-bottom: 32px;
        }
        .menu-group {
          padding: 8px;
        }
        .menu-item {
          display: flex;
          align-items: center;
          padding: 16px;
          gap: 16px;
          border-radius: 16px;
          transition: background 0.2s;
          cursor: pointer;
          background: none;
          text-align: left;
          width: 100%;
          border: none;
        }
        .menu-item:hover {
          background: #F8F9FA;
        }
        .menu-item:not(:last-child) {
          border-bottom: 1px solid var(--color-border-light);
        }
        .icon-box {
          width: 44px;
          height: 44px;
          background: #F1F3F5;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .role-icon {
          background: var(--color-primary-soft);
          color: var(--color-primary);
        }
        .menu-text {
          flex: 1;
        }
        .menu-text .title {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-text-primary);
          display: block;
        }
        .menu-text .desc {
          font-size: 13px;
          color: var(--color-text-tertiary);
          font-weight: 500;
        }
        .arrow {
          font-size: 20px;
          color: var(--color-text-disabled);
        }
        .logout-btn-premium {
          width: 100%;
          padding: 18px;
          background: #F1F3F5;
          color: #ADB5BD;
          border-radius: 20px;
          font-weight: 700;
          font-size: 16px;
          margin-top: 12px;
        }
      `}</style>
        </div>
    );
}
