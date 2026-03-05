'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

interface Props {
    profile: { name: string; email?: string; profile_image?: string };
    todayJobs: Array<{ id: string; status: string; price: number; scheduled_at: string; spaces?: { name: string; type: string } }>;
    spaces: Array<{ id: string; name: string; type: string; base_price: number; is_active: boolean }>;
    recentJobs: Array<{ id: string; status: string; price: number; scheduled_at: string; spaces?: { name: string } }>;
    monthJobs: Array<{ status: string; price: number; scheduled_at: string; spaces?: { name: string } }>;
    monthTotal: number;
    monthCount: number;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    OPEN: { label: '매칭 중', cls: 'badge-open' },
    ASSIGNED: { label: '배정 완료', cls: 'badge-assigned' },
    EN_ROUTE: { label: '이동 중', cls: 'badge-assigned' },
    ARRIVED: { label: '도착', cls: 'badge-assigned' },
    IN_PROGRESS: { label: '청소 중', cls: 'badge-progress' },
    SUBMITTED: { label: '검수 대기', cls: 'badge-submitted' },
    APPROVED: { label: '승인 완료', cls: 'badge-approved' },
    DISPUTED: { label: '분쟁 중', cls: 'badge-disputed' },
    PAID_OUT: { label: '정산 완료', cls: 'badge-paid' },
    CANCELED: { label: '취소', cls: '' },
};

export default function DashboardClient({ profile, todayJobs, spaces, monthTotal, monthCount }: Props) {
    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const formatPrice = (p: number) => `${(p).toLocaleString()}원`;

    return (
        <div className="page-container bg-premium-v2">
            <Header />

            <main className="page-content">
                {/* Welcome & Stats Section */}
                <section className="dashboard-hero">
                    <div className="welcome-box">
                        <p className="sub text-secondary">공간 파트너</p>
                        <h2 className="title">{profile.name}님, 환영합니다! ✨</h2>
                    </div>

                    <div className="bento-grid">
                        <div className="bento-item main-stat">
                            <span className="label">이번 달 총 지출</span>
                            <h3 className="value">{formatPrice(monthTotal)}</h3>
                            <p className="detail">{monthCount}건의 청소 완료</p>
                        </div>
                        <div className="bento-column">
                            <div className="bento-item sub-stat">
                                <span className="label">운영 중인 공간</span>
                                <h4 className="value-sm">{spaces.length}개</h4>
                            </div>
                            <div className="bento-item sub-stat">
                                <span className="label">오늘의 일정</span>
                                <h4 className="value-sm">{todayJobs.length}건</h4>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Quick Actions */}
                <section className="actions-section">
                    <Link href="/requests/create" className="btn-premium btn-full">
                        ✨ 새로운 청소 요청하기
                    </Link>
                </section>

                {/* Today's Schedule (Stitch ID: 053d...) */}
                <section className="schedule-section">
                    <div className="section-header">
                        <h3 className="section-title">오늘의 청소 일정</h3>
                        <Link href="/requests" className="view-link">전체보기</Link>
                    </div>

                    {todayJobs.length === 0 ? (
                        <div className="empty-card-v2">
                            <p>오늘 예정된 청소 일정이 없습니다.</p>
                            <Link href="/requests/create" className="text-link">첫 요청 등록하기 →</Link>
                        </div>
                    ) : (
                        <div className="job-stack">
                            {todayJobs.map((job) => (
                                <Link href={`/requests/${job.id}`} key={job.id} className="job-card-v2 card">
                                    <div className="card-left">
                                        <span className="time">⏰ {formatTime(job.scheduled_at)}</span>
                                        <h4 className="space-name">{(job.spaces as any)?.name}</h4>
                                        <span className="space-type">{(job.spaces as any)?.type === 'airbnb' ? '에어비앤비' : '일반 공간'}</span>
                                    </div>
                                    <div className="card-right">
                                        <span className={`status-badge ${STATUS_MAP[job.status]?.cls}`}>
                                            {STATUS_MAP[job.status]?.label}
                                        </span>
                                        <span className="price">{formatPrice(job.price)}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {/* Sparkle Score Widget */}
                <section className="sparkle-widget-section">
                    <div className="sparkle-card-premium card">
                        <div className="sparkle-info">
                            <div className="label-row">
                                <span className="label">나의 스파클 점수</span>
                                <span className="percentile">상위 5%</span>
                            </div>
                            <h3 className="score-value">95%</h3>
                            <p className="score-desc">파트너님은 매우 신뢰받는 공간 소유주입니다!</p>
                        </div>
                        <div className="sparkle-visual">
                            <div className="ring">
                                <svg width="60" height="60" viewBox="0 0 60 60">
                                    <circle cx="30" cy="30" r="26" fill="none" stroke="var(--color-primary-soft)" strokeWidth="6" />
                                    <circle cx="30" cy="30" r="26" fill="none" stroke="var(--color-primary)" strokeWidth="6"
                                        strokeDasharray="163" strokeDashoffset="8" strokeLinecap="round" transform="rotate(-90 30 30)" />
                                </svg>
                                <span className="star">✨</span>
                            </div>
                        </div>
                    </div>
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
        .dashboard-hero {
          margin-bottom: 28px;
        }
        .welcome-box {
          margin-bottom: 20px;
        }
        .welcome-box .sub {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .welcome-box .title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .bento-grid {
          display: flex;
          gap: 12px;
        }
        .bento-item {
          background: var(--color-surface);
          border-radius: 24px;
          padding: 20px;
          box-shadow: var(--shadow-sm);
        }
        .main-stat {
          flex: 1.4;
          background: var(--color-primary-soft);
          border: 1px solid var(--color-primary-light);
        }
        .bento-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sub-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .label {
          font-size: 12px;
          color: var(--color-text-tertiary);
          font-weight: 700;
          display: block;
          margin-bottom: 4px;
        }
        .value {
          font-size: 20px;
          font-weight: 900;
          color: var(--color-primary);
        }
        .value-sm {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-text-primary);
        }
        .detail {
          font-size: 11px;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }
        .actions-section {
          margin-bottom: 32px;
        }
        .schedule-section {
          margin-bottom: 32px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 800;
        }
        .view-link {
          font-size: 14px;
          color: var(--color-primary);
          font-weight: 700;
          text-decoration: none;
        }
        .job-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .job-card-v2 {
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-decoration: none;
        }
        .card-left .time {
          font-size: 12px;
          font-weight: 800;
          color: var(--color-primary-medium);
          display: block;
          margin-bottom: 4px;
        }
        .space-name {
          font-size: 16px;
          font-weight: 800;
          color: var(--color-text-primary);
          margin-bottom: 2px;
        }
        .space-type {
          font-size: 12px;
          color: var(--color-text-tertiary);
          font-weight: 600;
        }
        .card-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 700;
        }
        .badge-open { background: #EBF3FF; color: #3182F6; }
        .badge-progress { background: #FFF4E5; color: #FF9500; }
        .price {
          font-size: 16px;
          font-weight: 800;
          color: var(--color-text-primary);
        }
        .empty-card-v2 {
          background: #FFFFFF;
          border: 1.5px dashed var(--color-border);
          padding: 32px;
          text-align: center;
          border-radius: 24px;
          color: var(--color-text-tertiary);
          font-size: 14px;
        }
        .text-link {
          color: var(--color-primary);
          font-weight: 700;
          text-decoration: none;
          display: block;
          margin-top: 8px;
        }
        .sparkle-widget-section {
          margin-top: 12px;
        }
        .sparkle-card-premium {
          display: flex;
          align-items: center;
          padding: 24px;
          gap: 20px;
          background: linear-gradient(135deg, #FFFFFF 0%, #F7FBFC 100%);
        }
        .sparkle-info {
           flex: 1;
        }
        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .percentile {
          background: var(--color-primary-light);
          color: var(--color-primary-dark);
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 99px;
        }
        .score-value {
          font-size: 28px;
          font-weight: 900;
          color: var(--color-primary);
          margin-bottom: 4px;
        }
        .score-desc {
          font-size: 12px;
          color: var(--color-text-secondary);
          line-height: 1.4;
        }
        .sparkle-visual .ring {
          position: relative;
          width: 60px;
          height: 60px;
        }
        .star {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 18px;
        }
      `}</style>
        </div>
    );
}
