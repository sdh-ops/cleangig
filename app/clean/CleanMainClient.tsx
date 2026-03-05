'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

interface Job {
    id: string;
    status: string;
    price: number;
    scheduled_at: string;
    estimated_duration: number;
    is_urgent: boolean;
    spaces?: { name: string; address: string; type: string };
    job_id?: string;
    space_name?: string;
    space_type?: string;
    distance_meters?: number;
}

interface Props {
    profile: { id: string; name: string; avg_rating: number; tier: string; total_jobs: number };
    activeJob: Job | null;
    weekEarnings: number;
    pendingCount: number;
}

const TIER_LABEL: Record<string, string> = {
    STARTER: '🌱 스타터',
    SILVER: '🥈 실버',
    GOLD: '🥇 골드',
    MASTER: '👑 마스터'
};

export default function CleanMainClient({ profile, activeJob, weekEarnings, pendingCount }: Props) {
    const [nearbyJobs, setNearbyJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [locationError, setLocationError] = useState('');

    useEffect(() => {
        if (!navigator.geolocation) {
            setLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const supabase = createClient();
                const { data, error } = await supabase.rpc('nearby_open_jobs', {
                    worker_lat: pos.coords.latitude,
                    worker_lng: pos.coords.longitude,
                    radius_km: 10,
                });
                if (!error && data) setNearbyJobs(data as Job[]);
                setLoading(false);
            },
            () => {
                setLocationError('위치 권한을 허용하면 내 주변 청소 요청을 볼 수 있어요');
                createClient()
                    .from('jobs').select('*, spaces(name,address,type)')
                    .eq('status', 'OPEN').order('scheduled_at').limit(10)
                    .then(({ data }) => {
                        setNearbyJobs((data as Job[]) || []);
                        setLoading(false);
                    });
            }
        );
    }, []);

    return (
        <div className="page-container bg-premium-v2">
            <Header />

            <main className="page-content">
                {/* Welcome Text */}
                <section className="welcome-section">
                    <p className="welcome-sub text-secondary">{TIER_LABEL[profile.tier || 'STARTER']} 파트너</p>
                    <h2 className="welcome-title">{profile.name}님, 좋은 하루예요! ✨</h2>
                </section>

                {/* Earnings Card (Stitch ID: 3dc9...) */}
                <section className="earnings-section">
                    <div className="earnings-card card-premium">
                        <div className="card-header">
                            <span className="label">이번 주 정산 예정 금액</span>
                            {pendingCount > 0 && <span className="pending-badge">입금 대기 {pendingCount}</span>}
                        </div>
                        <div className="amount-row">
                            <h3 className="amount">{weekEarnings.toLocaleString()}원</h3>
                            <span className="target">목표 30만</span>
                        </div>
                        <div className="progress-container">
                            <div
                                className="progress-bar"
                                style={{ width: `${Math.min((weekEarnings / 300000) * 100, 100)}%` }}
                            />
                        </div>
                        <p className="goal-text">목표 금액까지 {Math.max(0, 300000 - weekEarnings).toLocaleString()}원 남았어요!</p>
                    </div>
                </section>

                {/* Active Job Floating (If exists) */}
                {activeJob && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="active-job-card"
                    >
                        <Link href={`/clean/job/${activeJob.id}`} className="active-link">
                            <div className="status-indicator">
                                <span className="dot pulse" />
                                <span className="status-text">현재 청소 진행 중</span>
                            </div>
                            <div className="job-info">
                                <strong>{(activeJob.spaces as any)?.name}</strong>
                                <span>상세보기 →</span>
                            </div>
                        </Link>
                    </motion.div>
                )}

                {/* AI Recommendations */}
                <section className="recommend-section">
                    <div className="section-header">
                        <h3 className="section-title">✨ 파트너님을 위한 추천 클리닝</h3>
                        <Link href="/clean/jobs" className="view-all">전체보기</Link>
                    </div>

                    {loading ? (
                        <div className="skeleton-grid">
                            {[1, 2].map(i => <div key={i} className="skeleton-card" />)}
                        </div>
                    ) : nearbyJobs.length === 0 ? (
                        <div className="empty-state-v2">
                            <div className="icon">🔍</div>
                            <p>주변에 새로 올라온 일감이 없네요</p>
                        </div>
                    ) : (
                        <div className="job-grid">
                            {nearbyJobs.map((job: any) => (
                                <Link
                                    href={`/clean/job/${job.job_id || job.id}`}
                                    key={job.job_id || job.id}
                                    className="job-card-premium card"
                                >
                                    <div className="card-top">
                                        <span className="space-type-badge">
                                            {job.space_type === 'airbnb' ? 'Airbnb' : 'Office'}
                                        </span>
                                        <span className="price">₩{(job.price || 0).toLocaleString()}</span>
                                    </div>
                                    <h4 className="job-name">{job.space_name || (job.spaces as any)?.name}</h4>
                                    <div className="job-meta">
                                        <span>📍 {(job.distance_meters ? job.distance_meters / 1000 : 0.5).toFixed(1)}km</span>
                                        <span>⏰ {new Date(job.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
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
        .welcome-section {
          margin-bottom: 24px;
        }
        .welcome-sub {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .welcome-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .earnings-section {
          margin-bottom: 24px;
        }
        .earnings-card {
          background: var(--color-primary);
          padding: 24px;
          border-radius: 28px;
          color: #FFFFFF;
          box-shadow: var(--shadow-md);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .card-header .label {
          font-size: 14px;
          opacity: 0.8;
          font-weight: 600;
        }
        .pending-badge {
          background: var(--color-accent);
          color: #000;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 99px;
        }
        .amount-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 12px;
        }
        .amount {
          font-size: 28px;
          font-weight: 900;
        }
        .target {
          font-size: 13px;
          opacity: 0.6;
        }
        .progress-container {
          height: 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 99px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .progress-bar {
          height: 100%;
          background: #FFFFFF;
          border-radius: 99px;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
          transition: width 1s ease-out;
        }
        .goal-text {
          font-size: 12px;
          opacity: 0.7;
          font-weight: 500;
        }
        .active-job-card {
          background: var(--color-primary-soft);
          border: 1.5px solid var(--color-primary-light);
          padding: 16px 20px;
          border-radius: 20px;
          margin-bottom: 28px;
        }
        .active-link {
          text-decoration: none;
          color: inherit;
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .dot {
          width: 8px;
          height: 8px;
          background: var(--color-primary);
          border-radius: 50%;
        }
        .pulse {
          animation: pulse-ani 2s infinite;
        }
        @keyframes pulse-ani {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        .status-text {
          font-size: 12px;
          font-weight: 800;
          color: var(--color-primary);
        }
        .job-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .job-info strong {
          font-size: 16px;
          color: var(--color-text-primary);
        }
        .job-info span {
          font-size: 13px;
          color: var(--color-primary);
          font-weight: 700;
        }
        .recommend-section .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 800;
        }
        .view-all {
          font-size: 14px;
          color: var(--color-primary);
          font-weight: 700;
          text-decoration: none;
        }
        .job-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .job-card-premium {
          padding: 20px;
          text-decoration: none;
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .space-type-badge {
          background: var(--color-bg);
          color: var(--color-text-secondary);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid var(--color-border-light);
        }
        .price {
          font-size: 19px;
          font-weight: 900;
          color: var(--color-primary);
        }
        .job-name {
          font-size: 17px;
          font-weight: 800;
          color: var(--color-text-primary);
          margin-bottom: 12px;
        }
        .job-meta {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: var(--color-text-tertiary);
          font-weight: 600;
        }
        .skeleton-card {
          height: 120px;
          background: #E9ECEF;
          border-radius: 24px;
          animation: shimmer 1.5s infinite alternate;
        }
        @keyframes shimmer {
          from { opacity: 0.5; } to { opacity: 1; }
        }
        .empty-state-v2 {
          text-align: center;
          padding: 48px 0;
          color: var(--color-text-tertiary);
        }
        .empty-state-v2 .icon {
          font-size: 40px;
          margin-bottom: 12px;
        }
      `}</style>
        </div>
    );
}
